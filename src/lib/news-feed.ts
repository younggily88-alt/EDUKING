import Parser from "rss-parser";

// 수집 대상 RSS. 클라이언트는 id만 보내고, URL은 항상 서버의 이 목록에서 찾는다(임의 URL 요청 방지).
export type NewsSource = {
  id: string;
  name: string;
  url: string;
  // Google News처럼 description이 요약이 아닌 링크 모음인 피드는 요약을 저장하지 않는다.
  noSummary?: boolean;
  // 제목 끝의 " - 매체명" 제거용 (Google News)
  stripTitleSuffix?: boolean;
};

export const NEWS_SOURCES: NewsSource[] = [
  { id: "hangyo", name: "한국교육신문", url: "https://www.hangyo.com/data/rss/news.xml" },
  { id: "jngjedu", name: "전남광주교육통", url: "https://www.jngjedu.kr/rss/allArticle.xml" },
  { id: "ihopenews", name: "호남교육신문", url: "https://www.ihopenews.com/rss/allArticle.xml" },
  { id: "newsjn", name: "남도일보", url: "https://www.newsjn.kr/rss/allArticle.xml" },
  { id: "edupress", name: "에듀프레스", url: "https://www.edupress.kr/rss/allArticle.xml" },
  { id: "eduinnews", name: "에듀인뉴스", url: "https://www.eduinnews.co.kr/rss/allArticle.xml" },
  {
    id: "news1",
    name: "뉴스1",
    url: "https://news.google.com/rss/search?q=site:news1.kr+%EA%B5%90%EC%9C%A1+when:1d&hl=ko&gl=KR&ceid=KR:ko",
    noSummary: true,
    stripTitleSuffix: true,
  },
];

export type FeedArticle = {
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date;
};

const FETCH_TIMEOUT_MS = 15_000;
const SUMMARY_MAX = 300;
const MAX_PER_SOURCE = 30;
export const WINDOW_MS = 24 * 60 * 60 * 1000;

type FeedItem = Parser.Item & { dcDate?: string };

const parser = new Parser<Record<string, never>, { dcDate?: string }>({
  customFields: { item: [["dc:date", "dcDate"]] },
});

// 날짜 문자열 → Date. 한국 매체 RSS는 "2026-11-11 16:55:53"처럼 시간대 없이 KST로 내려준다.
export function parseFeedDate(value: string | undefined): Date | null {
  const v = value?.trim();
  if (!v) return null;
  const naive = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(v);
  const d = naive ? new Date(`${naive[1]}T${naive[2]}+09:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toSummary(raw: string | undefined): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX)}…` : text;
}

// RSS 하나를 받아 지난 24시간 안에 발행된 기사만 돌려준다. 발행 시각을 알 수 없는 항목은 제외.
export async function fetchRecentArticles(
  source: NewsSource,
  now = new Date(),
): Promise<FeedArticle[]> {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EdukingBot/1.0)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${source.name} 응답 오류 (HTTP ${res.status})`);

  const feed = await parser.parseString(await res.text());
  const since = now.getTime() - WINDOW_MS;
  const result: FeedArticle[] = [];

  for (const item of feed.items as FeedItem[]) {
    const publishedAt = parseFeedDate(item.pubDate ?? item.dcDate ?? item.isoDate);
    const url = item.link?.trim();
    let title = item.title?.trim();
    if (!publishedAt || !url || !title) continue;
    if (publishedAt.getTime() < since || publishedAt.getTime() > now.getTime() + 60_000) {
      continue;
    }
    if (source.stripTitleSuffix) title = title.replace(/\s+-\s+[^-]+$/, "");
    result.push({
      title,
      url,
      summary: source.noSummary ? null : toSummary(item.contentSnippet ?? item.content),
      publishedAt,
    });
  }
  // 최신순으로 소스당 상한까지만 (실행 시간·DB 부하 제한)
  result.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return result.slice(0, MAX_PER_SOURCE);
}

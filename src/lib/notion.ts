import type { IssueFeedback } from "@/db/schema";
import { ISSUE_FIELDS, type IssueValues } from "./issue-fields";

// Notion 공식 REST API로 현안을 데이터베이스 페이지로 저장한다.
// 필요한 설정: NOTION_TOKEN(통합 토큰), NOTION_ISSUES_DATABASE_ID(저장할 데이터베이스, 통합에 공유되어 있어야 함)
const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";
const TEXT_LIMIT = 1900; // rich_text 한 덩어리 최대 2000자
const BLOCKS_PER_REQUEST = 100;

export class NotionError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

type Json = Record<string, unknown>;

async function call<T = Json>(path: string, init: { method?: string; body?: Json } = {}): Promise<T> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new NotionError(".env.local(배포 시에는 Vercel 환경 변수)에 NOTION_TOKEN을 설정해 주세요.");
  }

  const run = () =>
    fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": VERSION,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

  let res = await run();
  if (res.status === 429) {
    // 요청 제한: 안내된 시간만큼 기다렸다가 한 번만 다시 시도
    const wait = Math.min(Number(res.headers.get("retry-after") ?? 1), 10);
    await new Promise((r) => setTimeout(r, wait * 1000));
    res = await run();
  }

  const data = (await res.json().catch(() => ({}))) as Json & { message?: string; code?: string };
  if (!res.ok) {
    console.error("[notion]", res.status, data.code, data.message);
    if (res.status === 401) {
      throw new NotionError("Notion 토큰이 올바르지 않아요. .env.local의 NOTION_TOKEN을 확인해 주세요.", 401);
    }
    if (res.status === 404) {
      throw new NotionError(
        "Notion에서 찾을 수 없어요. 데이터베이스 ID가 맞는지, 데이터베이스의 ··· → 연결(Connections)에 이 통합이 추가돼 있는지 확인해 주세요.",
        404,
      );
    }
    if (res.status === 403) {
      throw new NotionError("Notion 통합에 쓰기 권한이 없어요. 통합 설정에서 콘텐츠 입력/수정 권한을 켜 주세요.", 403);
    }
    throw new NotionError(`Notion 저장에 실패했어요. (${data.message ?? res.status})`, res.status);
  }
  return data as T;
}

// ── 블록 만들기 ─────────────────────────────────────────────

const text = (content: string) => [{ type: "text", text: { content } }];

function chunks(value: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < value.length; i += TEXT_LIMIT) out.push(value.slice(i, i + TEXT_LIMIT));
  return out.length ? out : [""];
}

const heading = (content: string): Json => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: text(content) },
});
const subheading = (content: string): Json => ({
  object: "block",
  type: "heading_3",
  heading_3: { rich_text: text(content) },
});
const paragraphs = (value: string): Json[] =>
  chunks(value).map((c) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: text(c) },
  }));
const bullets = (items: string[]): Json[] =>
  items.flatMap((item) =>
    chunks(item).map((c) => ({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: text(c) },
    })),
  );

export type IssueForNotion = IssueValues & {
  id: number;
  date: string;
  aiFeedback: IssueFeedback | null;
};

// 페이지 본문: 항목별 소제목 + 내용, 이어서 AI 검토(있을 때).
export function buildIssueBlocks(n: IssueForNotion): Json[] {
  const blocks: Json[] = [];
  for (const f of ISSUE_FIELDS) {
    if (f.key === "titleSummary" || f.key === "keywords") continue;
    blocks.push(heading(f.label), ...paragraphs(n[f.key]));
  }
  const fb = n.aiFeedback;
  if (fb) {
    blocks.push(heading("AI 검토"), ...paragraphs(fb.summary));
    if (fb.strengths.length) blocks.push(subheading("잘한 점"), ...bullets(fb.strengths));
    if (fb.gaps.length) blocks.push(subheading("보완할 점"), ...bullets(fb.gaps));
    if (fb.likelyQuestions.length) {
      blocks.push(subheading("면접 예상 질문"));
      fb.likelyQuestions.forEach((q, i) => {
        blocks.push(...paragraphs(`Q${i + 1}. ${q.question}`), ...bullets([`답변 팁: ${q.answerTip}`]));
      });
    }
  }
  return blocks;
}

// ── 속성 만들기 ─────────────────────────────────────────────

type DbSchema = { properties: Record<string, { type: string }> };

function keywordTags(keywords: string): { name: string }[] {
  const seen = new Set<string>();
  return keywords
    .split(/[,，、]/)
    .map((k) => k.trim().slice(0, 100))
    .filter((k) => k && !seen.has(k) && seen.add(k))
    .slice(0, 20)
    .map((name) => ({ name }));
}

// 데이터베이스에 실제로 있는 칼럼(이름·형식이 맞는 것)만 채운다. 없는 칼럼은 건너뛴다.
// create일 때만 '복습 상태' 기본값을 넣는다 (이후 Notion에서 바꾼 값은 다시 저장해도 유지).
function buildProperties(n: IssueForNotion, schema: DbSchema, creating: boolean): Json {
  const props: Json = {};
  const has = (name: string, type: string) => schema.properties[name]?.type === type;

  const titleName = Object.entries(schema.properties).find(([, v]) => v.type === "title")?.[0];
  if (titleName) props[titleName] = { title: text(n.titleSummary.slice(0, 2000)) };
  if (has("작성일", "date")) props["작성일"] = { date: { start: n.date } };
  if (has("키워드", "multi_select")) props["키워드"] = { multi_select: keywordTags(n.keywords) };
  if (has("AI 검토", "select")) {
    props["AI 검토"] = { select: { name: n.aiFeedback ? "검토 완료" : "검토 전" } };
  }
  if (creating && has("복습 상태", "select")) props["복습 상태"] = { select: { name: "작성중" } };
  // 칼럼 이름은 '앱ID'(공백 없음)가 기본이고, '앱 ID'로 만들어도 인식한다.
  const idName = ["앱ID", "앱 ID"].find((k) => has(k, "number"));
  if (idName) props[idName] = { number: n.id };
  return props;
}

// ── 저장 ────────────────────────────────────────────────────

async function appendBlocks(pageId: string, blocks: Json[]) {
  for (let i = 0; i < blocks.length; i += BLOCKS_PER_REQUEST) {
    await call(`/blocks/${pageId}/children`, {
      method: "PATCH",
      body: { children: blocks.slice(i, i + BLOCKS_PER_REQUEST) },
    });
  }
}

async function clearBody(pageId: string) {
  let cursor: string | undefined;
  do {
    const list = await call<{ results: { id: string }[]; has_more: boolean; next_cursor: string | null }>(
      `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`,
    );
    for (const b of list.results) await call(`/blocks/${b.id}`, { method: "DELETE" });
    cursor = list.has_more ? (list.next_cursor ?? undefined) : undefined;
  } while (cursor);
}

async function createPage(databaseId: string, n: IssueForNotion, schema: DbSchema, blocks: Json[]) {
  const page = await call<{ id: string; url: string }>("/pages", {
    method: "POST",
    body: {
      parent: { database_id: databaseId },
      properties: buildProperties(n, schema, true),
      children: blocks.slice(0, BLOCKS_PER_REQUEST),
    },
  });
  await appendBlocks(page.id, blocks.slice(BLOCKS_PER_REQUEST));
  return page;
}

// 현안을 Notion 데이터베이스에 저장한다. existingPageId가 있으면 그 페이지를 갱신하고(본문은 다시 씀),
// 페이지가 지워졌거나 보관되어 갱신할 수 없으면 새 페이지를 만든다.
export async function saveIssueToNotion(
  n: IssueForNotion,
  existingPageId: string | null,
): Promise<{ pageId: string; url: string }> {
  const databaseId = process.env.NOTION_ISSUES_DATABASE_ID;
  if (!databaseId) {
    throw new NotionError(".env.local(배포 시에는 Vercel 환경 변수)에 NOTION_ISSUES_DATABASE_ID를 설정해 주세요.");
  }

  const schema = await call<DbSchema>(`/databases/${databaseId}`);
  const blocks = buildIssueBlocks(n);

  if (existingPageId) {
    try {
      const page = await call<{ id: string; url: string; archived?: boolean }>(`/pages/${existingPageId}`, {
        method: "PATCH",
        body: { properties: buildProperties(n, schema, false) },
      });
      if (!page.archived) {
        await clearBody(page.id);
        await appendBlocks(page.id, blocks);
        return { pageId: page.id, url: page.url };
      }
    } catch (error) {
      const gone =
        error instanceof NotionError &&
        (error.status === 404 || (error.status === 400 && /archived/i.test(error.message)));
      if (!gone) throw error;
    }
  }

  const page = await createPage(databaseId, n, schema, blocks);
  return { pageId: page.id, url: page.url };
}

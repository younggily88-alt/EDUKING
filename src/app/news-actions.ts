"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { NEWS_SOURCES, fetchRecentArticles } from "@/lib/news-feed";

export type FetchSourceResult = {
  ok: boolean;
  saved: number;
  error?: string;
};

// 소스 목록(id, 이름)만 클라이언트에 노출한다. 실제 URL은 서버에서만 쓴다.
export async function listNewsSources() {
  const { userId } = await auth();
  if (!userId) return [];
  return NEWS_SOURCES.map(({ id, name }) => ({ id, name }));
}

// 소스 하나의 지난 24시간 기사를 RSS에서 읽어 articles에 저장한다.
// 소스 단위로 호출해 Vercel 실행 시간 제한을 피하고 화면에 진행 상황을 보여준다.
export async function fetchSourceArticles(
  sourceId: string,
): Promise<FetchSourceResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, saved: 0, error: "로그인이 필요해요." };

  const source = NEWS_SOURCES.find((s) => s.id === sourceId);
  if (!source) return { ok: false, saved: 0, error: "알 수 없는 소스예요." };

  let items;
  try {
    items = await fetchRecentArticles(source);
  } catch (error) {
    console.error(`[news] ${source.id} RSS 수집 실패`, error);
    return { ok: false, saved: 0, error: `${source.name} RSS를 가져오지 못했어요.` };
  }
  if (items.length === 0) return { ok: true, saved: 0 };

  try {
    await db.insert(articles).values(
      items.map((a) => ({
        title: a.title,
        source: source.name,
        url: a.url,
        summary: a.summary,
        publishedAt: a.publishedAt,
      })),
    );
  } catch (error) {
    console.error(`[news] ${source.id} 저장 실패`, error);
    return { ok: false, saved: 0, error: `${source.name} 기사를 저장하지 못했어요.` };
  }

  revalidatePath("/");
  return { ok: true, saved: items.length };
}

"use server";

import { getAllowedUserId } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { NEWS_SOURCES } from "@/lib/news-feed";
import { ingestSource, type IngestResult } from "@/lib/news-ingest";

export type FetchSourceResult = IngestResult;

// 소스 목록(id, 이름)만 클라이언트에 노출한다. 실제 URL은 서버에서만 쓴다.
export async function listNewsSources() {
  const userId = await getAllowedUserId();
  if (!userId) return [];
  return NEWS_SOURCES.map(({ id, name }) => ({ id, name }));
}

// 소스 하나의 지난 24시간 기사를 수집·저장하고 AI 요약·분류까지 처리한다.
// 소스 단위로 호출해 실행 시간 제한을 피하고 화면에 진행 상황을 보여준다.
export async function fetchSourceArticles(sourceId: string): Promise<FetchSourceResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, saved: 0, classified: 0, error: "로그인이 필요해요." };

  const result = await ingestSource(sourceId);
  if (result.ok) revalidatePath("/");
  return result;
}

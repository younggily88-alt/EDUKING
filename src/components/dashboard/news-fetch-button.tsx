"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSourceArticles, listNewsSources } from "@/app/news-actions";

// 소스를 하나씩 순서대로 처리하며 "2/6 처리 중…"을 보여준다 (서버리스 실행 시간 제한 대응).
export function NewsFetchButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  async function run() {
    setRunning(true);
    setMessage(null);
    let saved = 0;
    let classified = 0;
    let aiError: string | undefined;
    const failed: string[] = [];
    try {
      const sources = await listNewsSources();
      if (sources.length === 0) throw new Error("no sources");
      setProgress({ done: 0, total: sources.length });
      for (const [i, s] of sources.entries()) {
        const result = await fetchSourceArticles(s.id).catch(() => null);
        if (result?.ok) {
          saved += result.saved;
          classified += result.classified;
          aiError ??= result.aiError;
        } else {
          failed.push(s.name);
        }
        setProgress({ done: i + 1, total: sources.length });
      }
      setMessage({
        text:
          `새 기사 ${saved}건 저장, ${classified}건 요약·분류 완료.` +
          (failed.length ? ` (수집 실패: ${failed.join(", ")})` : "") +
          (aiError ? ` AI 처리 일부 실패: ${aiError}` : ""),
        error: failed.length > 0 || !!aiError,
      });
    } catch {
      setMessage({ text: "뉴스를 가져오지 못했어요. 다시 시도해 주세요.", error: true });
    } finally {
      setRunning(false);
      setProgress(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
      >
        {running && (
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
          />
        )}
        {running
          ? progress
            ? `${progress.done}/${progress.total} 처리 중…`
            : "준비 중…"
          : "뉴스 가져오기"}
      </button>
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-xs ${message.error ? "text-red-600" : "text-stone-500"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  deleteSubmission,
  regradeSubmission,
  type SubmissionResult,
} from "@/app/submission-actions";

type RubricOption = { id: number; name: string };

// 과제 한 건의 삭제 / 다른 기준표로 다시 채점
export function SubmissionActions({
  id,
  title,
  hasFile,
  rubricId,
  rubrics,
}: {
  id: number;
  title: string;
  hasFile: boolean;
  rubricId: number | null;
  rubrics: RubricOption[];
}) {
  const [selected, setSelected] = useState(
    rubricId && rubrics.some((r) => r.id === rubricId) ? String(rubricId) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [grading, setGrading] = useState(false);

  function run(action: () => Promise<SubmissionResult>, isGrading = false) {
    setError(null);
    setGrading(isGrading);
    startTransition(async () => {
      const r = await action();
      if (!r.ok) setError(r.error ?? "처리하지 못했어요.");
      setGrading(false);
    });
  }

  const canRegrade = hasFile && rubrics.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {canRegrade ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="다시 채점할 기준표"
              disabled={pending}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">기준표 선택</option>
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !selected}
              onClick={() => {
                if (confirm("선택한 기준표로 다시 채점할까요? 이전 채점 결과는 새 결과로 바뀌어요.")) {
                  run(() => regradeSubmission(id, Number(selected)), true);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {grading && (
                <span
                  aria-hidden
                  className="size-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
                />
              )}
              {grading ? "채점 중… (최대 1~2분)" : "다시 채점"}
            </button>
          </>
        ) : (
          <span className="text-xs text-stone-500">
            {hasFile ? "다시 채점하려면 기준표가 필요해요." : "원본이 없어 다시 채점할 수 없어요."}
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`'${title}' 기록을 삭제할까요? 채점 결과와 PDF 원본이 모두 지워지고 되돌릴 수 없어요.`)) {
              run(() => deleteSubmission(id));
            }
          }}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          삭제
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

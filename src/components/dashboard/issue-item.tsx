"use client";

import { useState, useTransition } from "react";
import { deleteIssueNote, reviewIssueNote } from "@/app/issue-actions";
import { formatDotted } from "@/lib/date";
import { ISSUE_FIELDS, type IssueValues } from "@/lib/issue-fields";
import type { IssueNote } from "@/db/schema";
import { IssueForm } from "./issue-form";

export type IssueRow = Pick<
  IssueNote,
  "id" | "date" | "aiFeedback" | "feedbackAt" | IssueValuesKey
>;
type IssueValuesKey = keyof IssueValues;

function toValues(n: IssueRow): IssueValues {
  return Object.fromEntries(ISSUE_FIELDS.map((f) => [f.key, n[f.key]])) as IssueValues;
}

// 게시판 한 줄: 제목·키워드·날짜가 보이고, 펼치면 10개 항목 + AI 검토 + 수정/삭제가 나온다.
export function IssueItem({ n }: { n: IssueRow }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fb = n.aiFeedback;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await action();
      if (!r.ok) setError(r.error ?? "처리하지 못했어요.");
    });
  }

  if (editing) {
    return (
      <li>
        <IssueForm
          edit={{ id: n.id, values: toValues(n) }}
          onClose={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg hover:bg-brand-50">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate">{n.titleSummary}</p>
            <p className="line-clamp-1 text-xs text-stone-500">{n.keywords}</p>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-sm text-stone-500">
            {fb && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                AI 검토됨
              </span>
            )}
            {formatDotted(n.date)}
          </span>
        </summary>

        <div className="space-y-4 px-3 pb-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => reviewIssueNote(n.id))}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              {pending && (
                <span
                  aria-hidden
                  className="size-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
                />
              )}
              {pending ? "검토 중… (최대 1~2분)" : fb ? "AI 다시 검토" : "AI 검토 + 면접 질문"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(true)}
              className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-50"
            >
              수정
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(`'${n.titleSummary}' 현안을 삭제할까요? 되돌릴 수 없어요.`)) {
                  run(() => deleteIssueNote(n.id));
                }
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              삭제
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <dl className="space-y-3">
            {ISSUE_FIELDS.filter((f) => f.key !== "titleSummary").map((f) => (
              <div key={f.key}>
                <dt className="font-medium text-brand-700">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-stone-700">
                  {n[f.key]}
                </dd>
              </div>
            ))}
          </dl>

          {fb && (
            <section className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <h4 className="font-semibold text-brand-900">
                AI 검토
                {n.feedbackAt && (
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    {formatDotted(n.feedbackAt.toISOString().slice(0, 10))}
                  </span>
                )}
              </h4>
              <p className="leading-relaxed text-stone-700">{fb.summary}</p>
              {fb.strengths.length > 0 && (
                <div>
                  <p className="font-medium">잘한 점</p>
                  <ul className="list-disc pl-5 text-stone-600">
                    {fb.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {fb.gaps.length > 0 && (
                <div>
                  <p className="font-medium">보완할 점</p>
                  <ul className="list-disc pl-5 text-stone-600">
                    {fb.gaps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {fb.likelyQuestions.length > 0 && (
                <div>
                  <p className="font-medium">면접 예상 질문</p>
                  <ol className="mt-1 space-y-2">
                    {fb.likelyQuestions.map((q, i) => (
                      <li key={i} className="rounded-lg bg-white p-3">
                        <p className="font-medium text-stone-800">
                          Q{i + 1}. {q.question}
                        </p>
                        <p className="mt-1 text-stone-600">💡 {q.answerTip}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )}
        </div>
      </details>
    </li>
  );
}

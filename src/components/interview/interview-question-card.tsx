"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteInterviewQuestion,
  submitInterviewAnswer,
} from "@/app/interview-actions";
import { formatDotted, toKSTDate } from "@/lib/date";
import type { QuestionWithAttempts } from "@/lib/interview-data";
import { Chip } from "@/components/dashboard/ui";

const MIN = 20;
const MAX = 4000;

export function InterviewQuestionCard({
  q,
  rubrics,
}: {
  q: QuestionWithAttempts;
  rubrics: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [rubricId, setRubricId] = useState(""); // "" = 기본 기준
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [grading, setGrading] = useState(false);

  const attempted = q.attempts.length > 0;
  const best = attempted
    ? Math.max(...q.attempts.map((a) => Math.round((a.score / a.maxScore) * 100)))
    : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGrading(true);
    startTransition(async () => {
      const r = await submitInterviewAnswer(q.id, answer, rubricId ? Number(rubricId) : null);
      setGrading(false);
      if (r.ok) {
        setAnswer("");
        router.refresh();
      } else {
        setError(r.error ?? "채점하지 못했어요.");
      }
    });
  }

  const len = answer.trim().length;

  return (
    <li className="rounded-xl border border-stone-200 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <Chip>{q.category}</Chip>
        <span>{formatDotted(toKSTDate(q.createdAt))}</span>
        {best !== null && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
            최고 {best}점 · {q.attempts.length}회 도전
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("이 문항과 답변 기록을 삭제할까요? 되돌릴 수 없어요.")) {
              startTransition(async () => {
                const r = await deleteInterviewQuestion(q.id);
                if (r.ok) router.refresh();
                else setError(r.error ?? "삭제하지 못했어요.");
              });
            }
          }}
          className="ml-auto rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          삭제
        </button>
      </div>

      <h3 className="text-base font-semibold leading-relaxed text-stone-900">{q.question}</h3>
      {q.materialTitles.length > 0 && (
        <p className="mt-1 text-xs text-stone-500">자료: {q.materialTitles.join(" · ")}</p>
      )}

      {attempted ? (
        <details className="mt-3 rounded-lg bg-brand-50/60 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-700">출제 의도 · 핵심 포인트 보기</summary>
          <p className="mt-2 text-stone-700">{q.intent}</p>
          <ul className="mt-2 list-disc pl-5 text-stone-600">
            {q.keyPoints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-2 text-xs text-stone-500">답변을 채점받으면 출제 의도와 핵심 포인트가 공개돼요.</p>
      )}

      <form onSubmit={submit} className="mt-3 space-y-2">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={6}
          maxLength={MAX}
          disabled={pending}
          placeholder="면접장에서 말하듯 답변을 써 보세요. (2~3분 분량이 적당해요)"
          aria-label="내 답변"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <label className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          채점 기준
          <select
            value={rubricId}
            onChange={(e) => setRubricId(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          >
            <option value="">기본 기준 (5항목 · 100점)</option>
            {rubrics.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3">
          <p
            role={error ? "alert" : "status"}
            className={`text-sm ${error ? "text-red-600" : "text-stone-500"}`}
          >
            {grading
              ? "채점 중이에요. 최대 1분 걸릴 수 있어요…"
              : (error ?? `${len.toLocaleString()}자 (최소 ${MIN}자)`)}
          </p>
          <button
            type="submit"
            disabled={pending || len < MIN}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            {grading && (
              <span
                aria-hidden
                className="size-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
              />
            )}
            {grading ? "채점 중…" : attempted ? "다시 도전해서 채점받기" : "채점받기"}
          </button>
        </div>
      </form>

      {attempted && (
        <ol className="mt-4 space-y-2">
          {q.attempts.map((a, i) => {
            const n = q.attempts.length - i;
            const r = a.result;
            return (
              <li key={a.id} className="rounded-lg border border-stone-200">
                <details open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="font-medium">{n}회차 답변</span>
                    <span className="flex items-center gap-2">
                      <Chip>
                        {a.score}/{a.maxScore}점
                      </Chip>
                      <span className="text-stone-500">{formatDotted(toKSTDate(a.createdAt))}</span>
                    </span>
                  </summary>
                  <div className="space-y-3 px-3 pb-3 text-sm">
                    <details>
                      <summary className="cursor-pointer text-stone-500">내가 쓴 답변 보기</summary>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-stone-700">{a.answer}</p>
                    </details>
                    <table className="w-full text-left">
                      <caption className="sr-only">항목별 채점 결과</caption>
                      <tbody>
                        {r.criteria.map((c) => (
                          <tr key={c.name} className="border-t border-stone-100 align-top">
                            <th scope="row" className="py-2 pr-3 font-medium">
                              {c.name}
                            </th>
                            <td className="whitespace-nowrap py-2 pr-3 text-brand-700">
                              {c.score}/{c.maxPoints}
                            </td>
                            <td className="py-2 text-stone-600">{c.comment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="font-medium">총평</p>
                    <p className="leading-relaxed text-stone-600">{r.overall}</p>
                    {r.strengths.length > 0 && (
                      <div>
                        <p className="font-medium">잘한 점</p>
                        <ul className="list-disc pl-5 text-stone-600">
                          {r.strengths.map((s, k) => (
                            <li key={k}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.improvements.length > 0 && (
                      <div>
                        <p className="font-medium">보완할 점</p>
                        <ul className="list-disc pl-5 text-stone-600">
                          {r.improvements.map((s, k) => (
                            <li key={k}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="rounded-lg bg-brand-50/60 p-3">
                      <p className="font-medium text-brand-900">모범 답안 예시</p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-stone-700">{r.modelAnswer}</p>
                    </div>
                    {r.followUp && (
                      <p className="rounded-lg bg-stone-50 p-3 text-stone-700">
                        <span className="font-medium">꼬리 질문 👉 </span>
                        {r.followUp}
                      </p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

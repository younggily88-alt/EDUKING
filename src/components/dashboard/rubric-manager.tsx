"use client";

import { useState, useTransition } from "react";
import {
  createRubric,
  deleteRubric,
  updateRubric,
  type RubricResult,
} from "@/app/rubric-actions";
import type { RubricCriterion } from "@/db/schema";

type RubricItem = { id: number; name: string; criteria: RubricCriterion[] };
type DraftCriterion = { name: string; description: string; maxPoints: string };

const inputClass =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const primaryBtn =
  "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400";
const secondaryBtn =
  "rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50";

const emptyRow = (): DraftCriterion => ({ name: "", description: "", maxPoints: "10" });

export function RubricManager({
  rubrics,
  kind = "assignment",
}: {
  rubrics: RubricItem[];
  kind?: "assignment" | "interview";
}) {
  // editing: null = 목록, "new" = 새 기준표, number = 수정 중인 기준표 id
  const [editing, setEditing] = useState<null | "new" | number>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<RubricResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onOk?.();
      else setError(result.error ?? "처리하지 못했어요.");
    });
  }

  if (editing !== null) {
    const target = typeof editing === "number" ? rubrics.find((r) => r.id === editing) : null;
    return (
      <RubricEditor
        key={String(editing)}
        initialName={target?.name ?? ""}
        initialCriteria={
          target
            ? target.criteria.map((c) => ({
                name: c.name,
                description: c.description,
                maxPoints: String(c.maxPoints),
              }))
            : [emptyRow()]
        }
        pending={pending}
        error={error}
        kind={kind}
        onCancel={() => {
          setEditing(null);
          setError(null);
        }}
        onSave={(name, criteria) =>
          run(
            () =>
              target
                ? updateRubric(target.id, name, criteria)
                : createRubric(name, criteria, kind),
            () => setEditing(null),
          )
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {rubrics.length === 0 ? (
        <p className="text-sm text-stone-500">아직 기준표가 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {rubrics.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-stone-500">
                  {r.criteria.length}개 항목 · 총{" "}
                  {r.criteria.reduce((s, c) => s + c.maxPoints, 0)}점
                </p>
              </div>
              <button type="button" onClick={() => setEditing(r.id)} className={secondaryBtn}>
                수정
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    confirm(
                      `'${r.name}' 기준표를 삭제할까요? 이미 채점된 과제의 결과는 그대로 남아요.`,
                    )
                  ) {
                    run(() => deleteRubric(r.id));
                  }
                }}
                className="rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setEditing("new")} className={secondaryBtn}>
        + 기준표 추가
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function RubricEditor({
  kind,
  initialName,
  initialCriteria,
  pending,
  error,
  onSave,
  onCancel,
}: {
  kind: "assignment" | "interview";
  initialName: string;
  initialCriteria: DraftCriterion[];
  pending: boolean;
  error: string | null;
  onSave: (name: string, criteria: RubricCriterion[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [rows, setRows] = useState<DraftCriterion[]>(initialCriteria);

  const total = rows.reduce((s, r) => s + (Number(r.maxPoints) || 0), 0);
  const valid =
    name.trim() &&
    rows.length > 0 &&
    rows.every(
      (r) => r.name.trim() && Number.isInteger(Number(r.maxPoints)) && Number(r.maxPoints) >= 1,
    );

  function patch(i: number, change: Partial<DraftCriterion>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...change } : r)));
  }

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        placeholder={kind === "interview" ? "기준표 이름 (예: 정책 면접 기준)" : "기준표 이름 (예: 논술 과제 기준)"}
        aria-label="기준표 이름"
        className={`${inputClass} w-full`}
      />
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="space-y-1.5 rounded-lg border border-stone-200 p-2">
            <div className="flex gap-2">
              <input
                value={r.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                maxLength={100}
                placeholder={`항목 ${i + 1} 이름 (예: 현황 분석)`}
                aria-label={`항목 ${i + 1} 이름`}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={r.maxPoints}
                onChange={(e) => patch(i, { maxPoints: e.target.value })}
                aria-label={`항목 ${i + 1} 배점`}
                className={`${inputClass} w-20`}
              />
              <span className="self-center text-sm text-stone-500">점</span>
              <button
                type="button"
                disabled={rows.length === 1}
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`항목 ${i + 1} 삭제`}
                className="rounded-lg px-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
            <textarea
              value={r.description}
              onChange={(e) => patch(i, { description: e.target.value })}
              maxLength={500}
              rows={2}
              placeholder="채점 기준 설명 (선택) — 어떤 수준이면 만점인지 적어 주세요"
              aria-label={`항목 ${i + 1} 설명`}
              className={`${inputClass} w-full`}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={rows.length >= 20}
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className={secondaryBtn}
        >
          + 항목 추가
        </button>
        <span className="text-sm font-medium text-brand-700">총 {total}점</span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryBtn}>
          취소
        </button>
        <button
          type="button"
          disabled={pending || !valid}
          onClick={() =>
            onSave(
              name,
              rows.map((r) => ({
                name: r.name,
                description: r.description,
                maxPoints: Number(r.maxPoints),
              })),
            )
          }
          className={primaryBtn}
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

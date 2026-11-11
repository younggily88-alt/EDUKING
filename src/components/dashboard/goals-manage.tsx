"use client";

import { useState } from "react";
import { formatDayLabel } from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
import { EmptyState } from "./ui";

export type ManageItem = DashboardData["manageGoals"]["data"][number];

const inputClass =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
export const primaryBtn =
  "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400";
const secondaryBtn =
  "rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50";

// 기간 표시: 비면 "매일 반복", 한쪽만 있으면 "시작일부터"/"종료일까지"
function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "매일 반복";
  const f = (d: string) => formatDayLabel(d).replace(/ \(.\)$/, "");
  if (start && end) return start === end ? f(start) : `${f(start)} ~ ${f(end)}`;
  return start ? `${f(start)}부터` : `${f(end!)}까지`;
}

function periodStatus(start: string | null, end: string | null, today: string) {
  if (start && start > today) return "예정";
  if (end && end < today) return "종료";
  return null;
}

function PeriodFields({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-stone-600">
      <span>기간</span>
      <input
        type="date"
        value={start}
        max={end || undefined}
        onChange={(e) => onStart(e.target.value)}
        aria-label="시작일"
        className={inputClass}
      />
      <span>~</span>
      <input
        type="date"
        value={end}
        min={start || undefined}
        onChange={(e) => onEnd(e.target.value)}
        aria-label="종료일"
        className={inputClass}
      />
      {(start || end) && (
        <button
          type="button"
          onClick={() => {
            onStart("");
            onEnd("");
          }}
          className="text-xs text-stone-500 underline hover:text-brand-700"
        >
          매일 반복으로
        </button>
      )}
    </div>
  );
}

export function ManageTab({
  items,
  today,
  pending,
  onAdd,
  onUpdate,
  onArchive,
}: {
  items: ManageItem[];
  today: string;
  pending: boolean;
  onAdd: (
    title: string,
    count: number,
    start: string | null,
    end: string | null,
    reset: () => void,
  ) => void;
  onUpdate: (
    id: number,
    title: string,
    count: number,
    start: string | null,
    end: string | null,
    close: () => void,
  ) => void;
  onArchive: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [count, setCount] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  const isPast = (g: ManageItem) =>
    periodStatus(g.startDate, g.endDate, today) === "종료";
  const pastCount = items.filter(isPast).length;
  const visible = items.filter((g) => showPast || !isPast(g));

  return (
    <div className="space-y-4">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(title, Number(count), start || null, end || null, () => {
            setTitle("");
            setCount("1");
            setStart("");
            setEnd("");
          });
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="예: 뉴스 3개 읽기"
            aria-label="목표 내용"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <label className="flex items-center gap-1.5 text-sm text-stone-600">
            하루
            <input
              type="number"
              min={1}
              max={99}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              aria-label="하루 목표량"
              className={`${inputClass} w-16`}
            />
            회
          </label>
          <button
            type="submit"
            disabled={pending || !title.trim() || !count}
            className={primaryBtn}
          >
            목표 추가
          </button>
        </div>
        <PeriodFields start={start} end={end} onStart={setStart} onEnd={setEnd} />
        <p className="text-xs text-stone-500">
          기간을 비워 두면 매일 반복돼요. 하루만 정하려면 시작일과 종료일을 같게
          입력하세요.
        </p>
      </form>

      {visible.length === 0 ? (
        <EmptyState>아직 목표가 없어요. 위에서 추가해 주세요.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {visible.map((g) => {
            const status = periodStatus(g.startDate, g.endDate, today);
            return editingId === g.id ? (
              <EditRow
                key={g.id}
                goal={g}
                pending={pending}
                onSave={(t, c, s, e) =>
                  onUpdate(g.id, t, c, s, e, () => setEditingId(null))
                }
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 px-3 py-2"
              >
                <span
                  className={`min-w-0 flex-1 ${status === "종료" ? "text-stone-400" : ""}`}
                >
                  {g.title}
                </span>
                <span className="text-sm text-stone-500">
                  하루 {g.targetCount}회 · {formatPeriod(g.startDate, g.endDate)}
                </span>
                {status && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {status}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditingId(g.id)}
                  className={secondaryBtn}
                >
                  수정
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`'${g.title}' 목표를 삭제할까요?`)) onArchive(g.id);
                  }}
                  className="rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {pastCount > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="text-sm text-stone-500 underline hover:text-brand-700"
        >
          {showPast ? "지난 목표 숨기기" : `지난 목표 보기 (${pastCount})`}
        </button>
      )}
      <p className="text-xs text-stone-500">
        저장하면 바로 대시보드에 반영돼요. 기간 안의 목표만 &apos;오늘 현황&apos;에
        나타나요.
      </p>
    </div>
  );
}

function EditRow({
  goal,
  pending,
  onSave,
  onCancel,
}: {
  goal: ManageItem;
  pending: boolean;
  onSave: (
    title: string,
    count: number,
    start: string | null,
    end: string | null,
  ) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [count, setCount] = useState(String(goal.targetCount));
  const [start, setStart] = useState(goal.startDate ?? "");
  const [end, setEnd] = useState(goal.endDate ?? "");

  return (
    <li className="space-y-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          aria-label="목표 내용"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <input
          type="number"
          min={1}
          max={99}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          aria-label="하루 목표량"
          className={`${inputClass} w-16`}
        />
        <button
          type="button"
          disabled={pending || !title.trim() || !count}
          onClick={() => onSave(title, Number(count), start || null, end || null)}
          className={primaryBtn}
        >
          저장
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>
          취소
        </button>
      </div>
      <PeriodFields start={start} end={end} onStart={setStart} onEnd={setEnd} />
    </li>
  );
}

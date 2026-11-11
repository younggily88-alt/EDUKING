"use client";

import { useState, useTransition } from "react";
import {
  addGoal,
  archiveGoal,
  setGoalProgress,
  updateGoal,
  type GoalResult,
} from "@/app/actions";
import { formatDayLabel } from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
import { ManageTab, primaryBtn } from "./goals-manage";
import { Card, EmptyState, LoadError, ProgressBar } from "./ui";

type GoalItem = DashboardData["goals"]["data"][number];
type Tab = "today" | "manage";

export function GoalsCard({
  today,
  goals,
  manageGoals,
}: {
  today: string;
  goals: DashboardData["goals"];
  manageGoals: DashboardData["manageGoals"];
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 서버 액션 실행 후 실패하면 오류 문구를 보여준다 (성공 시 서버가 화면을 갱신)
  function run(action: () => Promise<GoalResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onOk?.();
      else setError(result.error ?? "처리하지 못했어요.");
    });
  }

  const items = goals.data;
  const done = items.filter((g) => g.progress >= g.targetCount).length;
  const allDone = items.length > 0 && done === items.length;

  return (
    <Card
      title="오늘의 목표"
      className="lg:col-span-2"
      action={
        <span className="text-sm text-stone-500">{formatDayLabel(today)}</span>
      }
    >
      <div
        role="tablist"
        aria-label="오늘의 목표 탭"
        className="mb-4 inline-flex rounded-lg bg-brand-50 p-1"
      >
        {(
          [
            ["today", "오늘 현황"],
            ["manage", "목표 설정"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand-500 ${
              tab === key
                ? "bg-white text-brand-700 shadow-sm"
                : "text-stone-500 hover:text-brand-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {goals.failed || manageGoals.failed ? (
        <LoadError />
      ) : tab === "today" ? (
        <TodayTab
          items={items}
          done={done}
          allDone={allDone}
          pending={pending}
          onProgress={(id, value) => run(() => setGoalProgress(id, value))}
          onGoManage={() => setTab("manage")}
        />
      ) : (
        <ManageTab
          items={manageGoals.data}
          today={today}
          pending={pending}
          onAdd={(title, count, start, end, reset) =>
            run(() => addGoal(title, count, start, end), reset)
          }
          onUpdate={(id, title, count, start, end, close) =>
            run(() => updateGoal(id, title, count, start, end), close)
          }
          onArchive={(id) => run(() => archiveGoal(id))}
        />
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </Card>
  );
}

function TodayTab({
  items,
  done,
  allDone,
  pending,
  onProgress,
  onGoManage,
}: {
  items: GoalItem[];
  done: number;
  allDone: boolean;
  pending: boolean;
  onProgress: (id: number, value: number) => void;
  onGoManage: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <EmptyState>등록된 목표가 없어요. 오늘의 목표를 설정해 보세요.</EmptyState>
        <button type="button" onClick={onGoManage} className={primaryBtn}>
          목표 설정하기
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar value={done} max={items.length} />
        </div>
        <span className="text-sm font-medium text-brand-700">
          {done}/{items.length} 달성
        </span>
        {allDone && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
            오늘 목표 달성!
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((g) => {
          const achieved = g.progress >= g.targetCount;
          return (
            <li
              key={g.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-brand-50"
            >
              <button
                type="button"
                disabled={pending}
                aria-pressed={achieved}
                aria-label={`${g.title} ${achieved ? "달성 취소" : "달성 처리"}`}
                onClick={() => onProgress(g.id, achieved ? 0 : g.targetCount)}
                className={`flex size-5 shrink-0 items-center justify-center rounded border text-xs focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  achieved
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-stone-300 text-transparent hover:border-brand-500"
                }`}
              >
                ✓
              </button>
              <span
                className={`flex-1 ${achieved ? "text-stone-400 line-through" : ""}`}
              >
                {g.title}
              </span>
              {g.targetCount > 1 && (
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending || g.progress <= 0}
                    onClick={() => onProgress(g.id, g.progress - 1)}
                    aria-label={`${g.title} 1 감소`}
                    className="size-7 rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    disabled={pending || achieved}
                    onClick={() => onProgress(g.id, g.progress + 1)}
                    aria-label={`${g.title} 1 증가`}
                    className="size-7 rounded-md border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-40"
                  >
                    +
                  </button>
                </span>
              )}
              <span className="w-12 text-right text-sm text-stone-500">
                {g.progress}/{g.targetCount}
                <span className="sr-only">{achieved ? " 달성" : " 미달성"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}


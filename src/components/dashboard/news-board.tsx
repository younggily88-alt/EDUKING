"use client";

import { useState, useTransition } from "react";
import {
  addCategory,
  deleteCategory,
  renameCategory,
  type CategoryResult,
} from "@/app/category-actions";
import { formatShortDate } from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
import { EmptyState } from "./ui";
import {
  UNCATEGORIZED_COLOR,
  colorForCategory,
  type CategoryColor,
} from "@/lib/category-colors";

type Filter = "all" | "none" | number;
const PAGE = 6;

export function NewsBoard({
  news,
  categories,
}: {
  news: DashboardData["news"]["data"];
  categories: DashboardData["categories"]["data"];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = news.filter((n) =>
    filter === "all" ? true : filter === "none" ? n.categoryId === null : n.categoryId === filter,
  );

  function run(action: () => Promise<CategoryResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await action();
      if (r.ok) onOk?.();
      else setError(r.error ?? "처리하지 못했어요.");
    });
  }

  // 카테고리마다 다른 색, '전체'는 브랜드 초록
  const chip = (active: boolean, color?: CategoryColor) =>
    `rounded-full px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-brand-500 ${
      color
        ? active
          ? color.solid
          : `${color.soft} ${color.softHover}`
        : active
          ? "bg-brand-600 text-white"
          : "bg-brand-100 text-brand-700 hover:bg-brand-200"
    }`;

  return (
    <>
      <div className="mb-4 space-y-2 border-b border-stone-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => {
              setFilter("all");
              setVisible(PAGE);
            }}
            className={chip(filter === "all")}
          >
            전체
          </button>
          {categories.map((c) =>
            editing === c.id ? (
              <span key={c.id} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={draft}
                  maxLength={50}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") run(() => renameCategory(c.id, draft), () => setEditing(null));
                    if (e.key === "Escape") setEditing(null);
                  }}
                  aria-label="카테고리 이름 수정"
                  className="w-28 rounded-full border border-stone-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => renameCategory(c.id, draft), () => setEditing(null))}
                  className="text-sm text-brand-700"
                >
                  저장
                </button>
                <button type="button" onClick={() => setEditing(null)} className="text-sm text-stone-500">
                  취소
                </button>
              </span>
            ) : (
              <span key={c.id} className="inline-flex items-center">
                <button
                  type="button"
                  aria-pressed={filter === c.id}
                  onClick={() => {
                    setFilter(c.id);
                    setVisible(PAGE);
                  }}
                  className={`${chip(filter === c.id, colorForCategory(c.id))} rounded-r-none`}
                >
                  {c.name}
                </button>
                <button
                  type="button"
                  aria-label={`${c.name} 이름 수정`}
                  onClick={() => {
                    setEditing(c.id);
                    setDraft(c.name);
                    setError(null);
                  }}
                  className={`${colorForCategory(c.id).soft} ${colorForCategory(c.id).softHover} px-1.5 py-1 text-xs`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`${c.name} 삭제`}
                  onClick={() => {
                    if (confirm(`'${c.name}' 카테고리를 삭제할까요? 이 카테고리의 뉴스는 '미분류'로 이동합니다.`)) {
                      if (filter === c.id) setFilter("all");
                      run(() => deleteCategory(c.id));
                    }
                  }}
                  className={`rounded-r-full ${colorForCategory(c.id).soft} ${colorForCategory(c.id).softHover} px-2 py-1 text-xs`}
                >
                  ×
                </button>
              </span>
            ),
          )}
          <button
            type="button"
            aria-pressed={filter === "none"}
            onClick={() => {
              setFilter("none");
              setVisible(PAGE);
            }}
            className={chip(filter === "none", UNCATEGORIZED_COLOR)}
          >
            미분류
          </button>
          {editing === "new" ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={draft}
                maxLength={50}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") run(() => addCategory(draft), () => setEditing(null));
                  if (e.key === "Escape") setEditing(null);
                }}
                placeholder="새 카테고리"
                aria-label="새 카테고리 이름"
                className="w-28 rounded-full border border-stone-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => addCategory(draft), () => setEditing(null))}
                className="text-sm text-brand-700"
              >
                추가
              </button>
              <button type="button" onClick={() => setEditing(null)} className="text-sm text-stone-500">
                취소
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing("new");
                setDraft("");
                setError(null);
              }}
              className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-sm text-stone-500 hover:border-brand-500 hover:text-brand-700"
            >
              + 카테고리 추가
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          {news.length === 0
            ? "아직 뉴스가 없어요. '뉴스 가져오기'를 눌러보세요."
            : "이 카테고리의 뉴스가 아직 없어요."}
        </EmptyState>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visible).map((n) => {
              const color = colorForCategory(n.categoryId);
              return (
              <li
                key={n.id}
                className={`flex flex-col rounded-xl border border-l-4 border-stone-200 ${color.border} p-4 transition hover:shadow-md`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-stone-500">{n.source}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color.soft}`}>
                    {n.category ?? "미분류"}
                  </span>
                </div>
                <h3 className="line-clamp-2 font-semibold">{n.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-stone-600">{n.summary}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-stone-500">{formatShortDate(n.publishedAt)}</span>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    원본 보기 ↗
                  </a>
                </div>
              </li>
              );
            })}
          </ul>
          {filtered.length > visible && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
              >
                더 보기 ({filtered.length - visible})
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

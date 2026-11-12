"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "./ui";
import { IssueItem, type IssueRow } from "./issue-item";

const splitKeywords = (s: string) =>
  s
    .split(/[,，、]/)
    .map((k) => k.trim())
    .filter(Boolean);

// 전체 현안 게시판: 제목·키워드·본문 검색 + 키워드 칩 필터
export function IssueBoard({ issues }: { issues: IssueRow[] }) {
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState<string | null>(null);

  const keywordCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of issues) {
      for (const k of new Set(splitKeywords(n.keywords))) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [issues]);

  const q = query.trim().toLowerCase();
  const filtered = issues.filter((n) => {
    if (keyword && !splitKeywords(n.keywords).includes(keyword)) return false;
    if (!q) return true;
    return [
      n.titleSummary,
      n.keywords,
      n.statusQuo,
      n.problems,
      n.causes,
      n.policyTrends,
      n.regionalContext,
      n.solutions,
      n.fieldCase,
      n.counterarguments,
    ].some((t) => t.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="현안 검색 (제목·키워드·내용)"
          aria-label="현안 검색"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {keywordCounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywordCounts.map(([k, count]) => (
              <button
                key={k}
                type="button"
                aria-pressed={keyword === k}
                onClick={() => setKeyword(keyword === k ? null : k)}
                className={`rounded-full px-2.5 py-0.5 text-xs focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  keyword === k
                    ? "bg-brand-600 text-white"
                    : "bg-brand-100 text-brand-700 hover:bg-brand-200"
                }`}
              >
                {k} · {count}
              </button>
            ))}
          </div>
        )}
      </div>
      {filtered.length === 0 ? (
        <EmptyState>
          {issues.length === 0 ? "정리한 현안이 아직 없어요." : "조건에 맞는 현안이 없어요."}
        </EmptyState>
      ) : (
        <>
          {(q || keyword) && (
            <p className="text-sm text-stone-500">
              {issues.length}건 중 {filtered.length}건
            </p>
          )}
          <ul className="space-y-1">
            {filtered.map((n) => (
              <IssueItem key={n.id} n={n} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

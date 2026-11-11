import { formatShortDate } from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
import { NewsFetchButton } from "./news-fetch-button";
import { Card, Chip, EmptyState, LoadError } from "./ui";

export function NewsSection({
  news,
  categories,
}: {
  news: DashboardData["news"];
  categories: DashboardData["categories"];
}) {
  return (
    <Card
      title="교육계 주요 뉴스"
      action={<NewsFetchButton />}
    >
      {/* 카테고리 목록 + 추가 버튼 (뉴스 분류 관리) */}
      {!categories.failed && (
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-stone-100 pb-4">
          {categories.data.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
            >
              {c.name}
            </span>
          ))}
          {categories.data.length === 0 && (
            <span className="text-sm text-stone-500">
              카테고리가 아직 없어요.
            </span>
          )}
          <button
            type="button"
            disabled
            title="준비 중"
            className="cursor-not-allowed rounded-full border border-dashed border-stone-300 px-3 py-1 text-sm text-stone-400"
          >
            + 카테고리 추가
          </button>
        </div>
      )}
      {news.failed ? (
        <LoadError />
      ) : news.data.length === 0 ? (
        <EmptyState>
          아직 뉴스가 없어요. &apos;뉴스 가져오기&apos;를 눌러보세요.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {news.data.map((n) => (
            <li
              key={n.id}
              className="flex flex-col rounded-xl border border-stone-200 p-4 transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-stone-500">
                  {n.source}
                </span>
                <Chip>{n.category ?? "미분류"}</Chip>
              </div>
              <h3 className="line-clamp-2 font-semibold">{n.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-stone-600">
                {n.summary}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-stone-500">
                  {formatShortDate(n.publishedAt)}
                </span>
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
          ))}
        </ul>
      )}
    </Card>
  );
}

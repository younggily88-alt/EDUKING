import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
      {children}
    </p>
  );
}

export function LoadError() {
  return (
    <p className="rounded-lg bg-red-50 px-4 py-6 text-center text-sm text-red-600">
      데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
    </p>
  );
}

// 준비 중인 기능의 자리 표시용 버튼
export function DisabledButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      disabled
      title="준비 중"
      className="cursor-not-allowed rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-400"
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-brand-100"
    >
      <div
        className={`h-full rounded-full ${value >= max && max > 0 ? "bg-brand-600" : "bg-brand-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

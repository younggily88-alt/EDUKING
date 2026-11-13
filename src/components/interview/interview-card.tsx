import Link from "next/link";
import type { Loaded } from "@/lib/dashboard-data";
import type { InterviewStats } from "@/lib/interview-data";
import { Card } from "@/components/dashboard/ui";

// 대시보드의 면접 준비 자판기 입구: 현황 요약 + 바로가기
export function InterviewCard({ stats }: { stats: Loaded<InterviewStats> }) {
  const s = stats.data;
  return (
    <Card
      title="🎰 면접 준비 자판기"
      action={
        <Link
          href="/interview"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          자판기 열기 →
        </Link>
      }
    >
      <p className="mb-4 text-sm text-stone-600">
        자료를 넣으면 면접 문항이 나오고, 내 답변을 AI가 채점해 줘요.
      </p>
      {stats.failed ? null : (
        <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {[
            ["자료", `${s.materials}개`],
            ["문항", `${s.questions}개`],
            ["답변", `${s.attempts}회`],
            ["최근 평균", s.recentAvgPct === null ? "-" : `${s.recentAvgPct}점`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-brand-50/60 px-3 py-2">
              <dt className="text-xs text-stone-500">{label}</dt>
              <dd className="text-lg font-semibold text-brand-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

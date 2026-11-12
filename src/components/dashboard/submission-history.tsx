import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { assertAllowed } from "@/lib/access";
import { UserButton } from "@clerk/nextjs";
import { getAllAssignments, getRubrics, type SubmissionKind } from "@/lib/dashboard-data";
import { AssignmentItem } from "./assignment-item";
import { ScoreTrend } from "./score-trend";
import { Card, EmptyState, LoadError } from "./ui";

async function History({
  kind,
  title,
  emptyText,
}: {
  kind: SubmissionKind;
  title: string;
  emptyText: string;
}) {
  await connection(); // 요청마다 최신 DB 데이터를 조회
  await assertAllowed();
  const [{ data, failed }, rubricList] = await Promise.all([getAllAssignments(kind), getRubrics()]);

  const graded = data.filter((a) => a.score != null && a.maxScore);
  const average =
    graded.length > 0
      ? Math.round(
          (graded.reduce((s, a) => s + (a.score! / a.maxScore!) * 100, 0) /
            graded.length) *
            10,
        ) / 10
      : null;

  return (
    <Card
      title={title}
      action={
        <span className="text-sm text-stone-500">
          총 {data.length}건
          {average !== null && ` · 채점 ${graded.length}건 평균 ${average}점(100점 환산)`}
        </span>
      }
    >
      {failed ? (
        <LoadError />
      ) : data.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <>
          <ScoreTrend items={data} />
          <ul className="space-y-1">
            {data.map((a) => (
              <AssignmentItem key={a.id} a={a} rubrics={rubricList.data} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

// 전체 기록 페이지 공용 틀 (헤더 + 대시보드로 돌아가기 + 로딩 스켈레톤)
export function HistoryShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-xl font-bold text-brand-900">
            🌿 교육전문직을 준비
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-brand-600 hover:text-brand-700"
        >
          ← 대시보드로
        </Link>
        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-2xl bg-white" />}
        >
          {children}
        </Suspense>
      </main>
    </>
  );
}

// 과제 제출 / 과제 수정 제출 전체 기록 페이지
export function SubmissionHistoryPage(props: {
  kind: SubmissionKind;
  title: string;
  emptyText: string;
}) {
  return (
    <HistoryShell>
      <History {...props} />
    </HistoryShell>
  );
}

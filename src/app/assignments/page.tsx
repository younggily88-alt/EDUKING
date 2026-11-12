import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { UserButton } from "@clerk/nextjs";
import { AssignmentItem } from "@/components/dashboard/assignment-item";
import { Card, EmptyState, LoadError } from "@/components/dashboard/ui";
import { getAllAssignments } from "@/lib/dashboard-data";

export const metadata = { title: "과제 제출 기록 · 교육전문직을 준비" };

async function AssignmentHistory() {
  await connection(); // 요청마다 최신 DB 데이터를 조회
  const { data, failed } = await getAllAssignments();

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
      title="과제 제출 기록"
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
        <EmptyState>제출한 과제가 아직 없어요.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {data.map((a) => (
            <AssignmentItem key={a.id} a={a} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AssignmentsPage() {
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
          <AssignmentHistory />
        </Suspense>
      </main>
    </>
  );
}

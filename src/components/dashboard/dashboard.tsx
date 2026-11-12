import { connection } from "next/server";
import { assertAllowed } from "@/lib/access";
import { getDashboardData } from "@/lib/dashboard-data";
import { ExamCard } from "./exam-card";
import { GoalsCard } from "./goals-card";
import { NewsSection } from "./news-section";
import {
  AssignmentsCard,
  IssueNotesCard,
  RevisionsCard,
} from "./records-sections";

export async function Dashboard() {
  await connection(); // 요청마다 최신 DB 데이터를 조회 (프리렌더 제외)
  await assertAllowed(); // 허용 목록에 없는 계정은 데이터를 읽기 전에 차단
  const d = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GoalsCard
          today={d.today}
          goals={d.goals}
          manageGoals={d.manageGoals}
          streak={d.streak}
        />
        <ExamCard today={d.today} examDate={d.examDate} />
      </div>
      <NewsSection news={d.news} categories={d.categories} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AssignmentsCard assignments={d.assignments} rubrics={d.rubrics} />
        <RevisionsCard revisions={d.revisions} rubrics={d.rubrics} />
      </div>
      <IssueNotesCard issues={d.issues} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl bg-white lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white" />
      <div className="h-48 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}

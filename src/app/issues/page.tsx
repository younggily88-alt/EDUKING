import { connection } from "next/server";
import { assertAllowed } from "@/lib/access";
import { HistoryShell } from "@/components/dashboard/submission-history";
import { IssueBoard } from "@/components/dashboard/issue-board";
import { IssueForm } from "@/components/dashboard/issue-form";
import { Card, LoadError } from "@/components/dashboard/ui";
import { getAllIssues } from "@/lib/dashboard-data";

export const metadata = { title: "현안 정리 · 교육전문직을 준비" };

// AI 검토(Claude 호출)가 오래 걸릴 수 있다.
export const maxDuration = 120;

async function IssueBoardLoader() {
  await connection(); // 요청마다 최신 DB 데이터를 조회
  await assertAllowed();
  const { data, failed } = await getAllIssues();

  return (
    <Card
      title="현안 정리"
      action={<span className="text-sm text-stone-500">총 {data.length}건</span>}
    >
      <IssueForm />
      {failed ? <LoadError /> : <IssueBoard issues={data} />}
    </Card>
  );
}

export default function IssuesPage() {
  return (
    <HistoryShell>
      <IssueBoardLoader />
    </HistoryShell>
  );
}

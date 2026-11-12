import { SubmissionHistoryPage } from "@/components/dashboard/submission-history";

export const metadata = { title: "과제 수정 제출 기록 · 교육전문직을 준비" };

// 다시 채점(Claude 호출)이 오래 걸릴 수 있다.
export const maxDuration = 120;

export default function RevisionsPage() {
  return (
    <SubmissionHistoryPage
      kind="revision"
      title="과제 수정 제출 기록"
      emptyText="수정 제출한 과제가 아직 없어요."
    />
  );
}

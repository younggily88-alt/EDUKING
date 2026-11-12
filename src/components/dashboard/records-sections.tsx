import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard-data";
import { AssignmentItem } from "./assignment-item";
import { AssignmentSubmit } from "./assignment-submit";
import { IssueForm } from "./issue-form";
import { IssueItem } from "./issue-item";
import { RubricManager } from "./rubric-manager";
import { Card, EmptyState, LoadError } from "./ui";

// 과제 제출 / 과제 수정 제출 공용 카드: 제목·제출 구분·기록 페이지 경로만 다르다.
function SubmissionCard({
  title,
  kind,
  historyHref,
  emptyText,
  items,
  rubrics,
}: {
  title: string;
  kind: "assignment" | "revision";
  historyHref: string;
  emptyText: string;
  items: DashboardData["assignments"];
  rubrics: DashboardData["rubrics"];
}) {
  return (
    <Card
      title={title}
      action={
        <Link
          href={historyHref}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          전체 기록 보기 →
        </Link>
      }
    >
      {!rubrics.failed && <AssignmentSubmit rubrics={rubrics.data} kind={kind} />}
      {items.failed ? (
        <LoadError />
      ) : items.data.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <ul className="space-y-1">
          {items.data.map((a) => (
            <AssignmentItem key={a.id} a={a} rubrics={rubrics.failed ? [] : rubrics.data} />
          ))}
        </ul>
      )}
      {!rubrics.failed && (
        <details className="mt-4 border-t border-stone-100 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-brand-700">
            채점 기준표 관리 ({rubrics.data.length})
          </summary>
          <div className="mt-3">
            <RubricManager rubrics={rubrics.data} />
          </div>
        </details>
      )}
    </Card>
  );
}

export function AssignmentsCard({
  assignments,
  rubrics,
}: {
  assignments: DashboardData["assignments"];
  rubrics: DashboardData["rubrics"];
}) {
  return (
    <SubmissionCard
      title="과제 제출"
      kind="assignment"
      historyHref="/assignments"
      emptyText="제출한 과제가 아직 없어요."
      items={assignments}
      rubrics={rubrics}
    />
  );
}

export function RevisionsCard({
  revisions,
  rubrics,
}: {
  revisions: DashboardData["revisions"];
  rubrics: DashboardData["rubrics"];
}) {
  return (
    <SubmissionCard
      title="과제 수정 제출"
      kind="revision"
      historyHref="/revisions"
      emptyText="수정 제출한 과제가 아직 없어요."
      items={revisions}
      rubrics={rubrics}
    />
  );
}

export function IssueNotesCard({
  issues,
}: {
  issues: DashboardData["issues"];
}) {
  return (
    <Card
      title="현안 정리"
      action={
        <Link
          href="/issues"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          전체 보기 →
        </Link>
      }
    >
      <IssueForm />
      {issues.failed ? (
        <LoadError />
      ) : issues.data.length === 0 ? (
        <EmptyState>정리한 현안이 아직 없어요. &apos;+ 새 현안&apos;으로 첫 현안을 남겨 보세요.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {issues.data.map((n) => (
            <IssueItem key={n.id} n={n} />
          ))}
        </ul>
      )}
    </Card>
  );
}

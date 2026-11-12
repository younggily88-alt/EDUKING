import Link from "next/link";
import { formatDotted } from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
import { AssignmentItem } from "./assignment-item";
import { AssignmentSubmit } from "./assignment-submit";
import { RubricManager } from "./rubric-manager";
import { Card, Chip, DisabledButton, EmptyState, LoadError } from "./ui";

function Row({
  title,
  date,
  extra,
}: {
  title: string;
  date: string;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-brand-50">
      <div className="min-w-0">
        <p className="truncate">{title}</p>
        {extra && <div className="mt-1">{extra}</div>}
      </div>
      <span className="shrink-0 text-sm text-stone-500">
        {formatDotted(date)}
      </span>
    </li>
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
    <Card
      title="과제 제출"
      action={
        <Link
          href="/assignments"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          전체 기록 보기 →
        </Link>
      }
    >
      {!rubrics.failed && <AssignmentSubmit rubrics={rubrics.data} />}
      {assignments.failed ? (
        <LoadError />
      ) : assignments.data.length === 0 ? (
        <EmptyState>제출한 과제가 아직 없어요.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {assignments.data.map((a) => (
            <AssignmentItem key={a.id} a={a} />
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

export function RevisionsCard({
  revisions,
}: {
  revisions: DashboardData["revisions"];
}) {
  return (
    <Card
      title="과제 수정 제출"
      action={<DisabledButton>새 수정본</DisabledButton>}
    >
      {revisions.failed ? (
        <LoadError />
      ) : revisions.data.length === 0 ? (
        <EmptyState>수정 제출한 과제가 아직 없어요.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {revisions.data.map((r) => (
            <Row
              key={r.id}
              title={r.title}
              date={r.date}
              extra={
                r.originalTitle ? <Chip>원본: {r.originalTitle}</Chip> : null
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function IssueNotesCard({
  issues,
}: {
  issues: DashboardData["issues"];
}) {
  return (
    <Card title="현안 정리" action={<DisabledButton>새 현안</DisabledButton>}>
      {issues.failed ? (
        <LoadError />
      ) : issues.data.length === 0 ? (
        <EmptyState>정리한 현안이 아직 없어요.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {issues.data.map((n) => (
            <Row
              key={n.id}
              title={n.titleSummary}
              date={n.date}
              extra={
                <span className="line-clamp-1 text-xs text-stone-500">
                  {n.keywords}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

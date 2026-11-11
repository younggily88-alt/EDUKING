import { formatDotted } from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
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
}: {
  assignments: DashboardData["assignments"];
}) {
  return (
    <Card title="과제 제출" action={<DisabledButton>새 과제</DisabledButton>}>
      {assignments.failed ? (
        <LoadError />
      ) : assignments.data.length === 0 ? (
        <EmptyState>제출한 과제가 아직 없어요.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {assignments.data.map((a) => (
            <Row key={a.id} title={a.title} date={a.date} />
          ))}
        </ul>
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

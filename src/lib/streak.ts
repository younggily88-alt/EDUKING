import { and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignments, goalLogs, goals, issueNotes } from "@/db/schema";
import { addDaysISO, toKSTDate } from "./date";

const LOOKBACK_DAYS = 90;

export type Streak = { days: number; todayDone: boolean };

// 연속 달성일: 그날 적용되는 목표를 모두 달성한 날이 연속된 일수.
// - 오늘은 아직 끝나지 않았으므로, 달성 전이면 어제까지의 연속일을 보여주고 끊지 않는다.
// - 적용 목표가 하나도 없는 날을 만나면(목표를 만들기 전 등) 거기서 멈춘다.
// - 보관(삭제)된 목표는 과거 계산에서도 빠진다.
export async function computeStreak(today: string): Promise<Streak> {
  const from = addDaysISO(today, -LOOKBACK_DAYS);

  const [goalRows, logRows, activity] = await Promise.all([
    db
      .select({
        id: goals.id,
        target: goals.targetCount,
        start: goals.startDate,
        end: goals.endDate,
        auto: goals.autoType,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(sql`${goals.isActive} = true`),
    db
      .select({ goalId: goalLogs.goalId, date: goalLogs.date, progress: goalLogs.progress })
      .from(goalLogs)
      .where(gte(goalLogs.date, from)),
    // 날짜별 활동 수 (자동 집계 목표용)
    Promise.all([
      db
        .select({ date: assignments.date, kind: assignments.kind, n: sql<number>`count(*)`.mapWith(Number) })
        .from(assignments)
        .where(and(gte(assignments.date, from)))
        .groupBy(assignments.date, assignments.kind),
      db
        .select({ date: issueNotes.date, n: sql<number>`count(*)`.mapWith(Number) })
        .from(issueNotes)
        .where(gte(issueNotes.date, from))
        .groupBy(issueNotes.date),
    ]),
  ]);

  const logs = new Map(logRows.map((l) => [`${l.goalId}|${l.date}`, l.progress]));
  const counts = new Map<string, number>();
  for (const r of activity[0]) counts.set(`${r.kind}|${r.date}`, r.n);
  for (const r of activity[1]) counts.set(`issue|${r.date}`, r.n);

  const progressOn = (g: (typeof goalRows)[number], d: string) =>
    g.auto ? (counts.get(`${g.auto}|${d}`) ?? 0) : (logs.get(`${g.id}|${d}`) ?? 0);

  // d일에 적용되는 목표가 없으면 null, 있으면 전부 달성했는지
  const dayResult = (d: string): boolean | null => {
    const applicable = goalRows.filter(
      (g) =>
        toKSTDate(g.createdAt) <= d &&
        (!g.start || g.start <= d) &&
        (!g.end || g.end >= d),
    );
    if (applicable.length === 0) return null;
    return applicable.every((g) => progressOn(g, d) >= g.target);
  };

  const todayResult = dayResult(today);
  let days = 0;
  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    const r = dayResult(addDaysISO(today, -i));
    if (r !== true) break;
    days += 1;
  }
  const todayDone = todayResult === true;
  return { days: days + (todayDone ? 1 : 0), todayDone };
}

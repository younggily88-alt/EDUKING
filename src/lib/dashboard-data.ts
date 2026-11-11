import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  articles,
  assignmentRevisions,
  assignments,
  categories,
  goalLogs,
  goals,
  issueNotes,
} from "@/db/schema";
import { todayKST } from "./date";

export type Loaded<T> = { data: T; failed: boolean };

// 섹션 하나가 실패해도(예: 마이그레이션 미적용) 나머지 화면은 보여준다.
async function load<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<Loaded<T>> {
  try {
    return { data: await fn(), failed: false };
  } catch (error) {
    console.error(`[dashboard] ${label} 조회 실패`, error);
    return { data: fallback, failed: true };
  }
}

export async function getDashboardData() {
  const today = todayKST();

  const [latestNews, categoryList, goalList, manageList, settings, assignmentList, revisionList, issueList] =
    await Promise.all([
      // 뉴스: 발행일 최신순 (발행일 없으면 뒤로), 같으면 가져온 순
      load(
        "news",
        () =>
          db
            .select({
              id: articles.id,
              title: articles.title,
              source: articles.source,
              url: articles.url,
              summary: articles.summary,
              category: categories.name,
              publishedAt: articles.publishedAt,
            })
            .from(articles)
            .leftJoin(categories, eq(articles.categoryId, categories.id))
            .orderBy(desc(articles.publishedAt), desc(articles.id))
            .limit(6),
        [],
      ),
      load(
        "categories",
        () => db.select().from(categories).orderBy(asc(categories.id)),
        [],
      ),
      // 오늘의 목표: 활성 목표 + 오늘 기록(없으면 0)
      load(
        "goals",
        () =>
          db
            .select({
              id: goals.id,
              title: goals.title,
              targetCount: goals.targetCount,
              progress: sql<number>`coalesce(${goalLogs.progress}, 0)`.mapWith(
                Number,
              ),
            })
            .from(goals)
            .leftJoin(
              goalLogs,
              and(eq(goalLogs.goalId, goals.id), eq(goalLogs.date, today)),
            )
            .where(
              and(
                eq(goals.isActive, true),
                or(isNull(goals.startDate), lte(goals.startDate, today)),
                or(isNull(goals.endDate), gte(goals.endDate, today)),
              ),
            )
            .orderBy(asc(goals.id)),
        [],
      ),
      // 목표 설정 탭용: 기간이 지났거나 아직 시작 전인 목표까지 모두
      load(
        "goals_manage",
        () =>
          db
            .select({
              id: goals.id,
              title: goals.title,
              targetCount: goals.targetCount,
              startDate: goals.startDate,
              endDate: goals.endDate,
            })
            .from(goals)
            .where(eq(goals.isActive, true))
            .orderBy(asc(goals.id)),
        [],
      ),
      load(
        "app_settings",
        async () => {
          const [row] = await db
            .select({ examDate: appSettings.examDate })
            .from(appSettings)
            .where(eq(appSettings.id, 1));
          return row?.examDate ?? null;
        },
        null as string | null,
      ),
      load(
        "assignments",
        () =>
          db
            .select({
              id: assignments.id,
              title: assignments.title,
              date: assignments.date,
            })
            .from(assignments)
            .orderBy(desc(assignments.date), desc(assignments.id))
            .limit(5),
        [],
      ),
      load(
        "assignment_revisions",
        () =>
          db
            .select({
              id: assignmentRevisions.id,
              title: assignmentRevisions.title,
              date: assignmentRevisions.date,
              originalTitle: assignments.title,
            })
            .from(assignmentRevisions)
            .leftJoin(
              assignments,
              eq(assignmentRevisions.assignmentId, assignments.id),
            )
            .orderBy(desc(assignmentRevisions.date), desc(assignmentRevisions.id))
            .limit(5),
        [],
      ),
      load(
        "issue_notes",
        () =>
          db
            .select({
              id: issueNotes.id,
              titleSummary: issueNotes.titleSummary,
              keywords: issueNotes.keywords,
              date: issueNotes.date,
            })
            .from(issueNotes)
            .orderBy(desc(issueNotes.date), desc(issueNotes.id))
            .limit(5),
        [],
      ),
    ]);

  return {
    today,
    news: latestNews,
    categories: categoryList,
    goals: goalList,
    manageGoals: manageList,
    examDate: settings,
    assignments: assignmentList,
    revisions: revisionList,
    issues: issueList,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

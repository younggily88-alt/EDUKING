import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  articles,
  assignments,
  categories,
  goalLogs,
  goals,
  issueNotes,
  rubrics,
} from "@/db/schema";
import { todayKST } from "./date";
import { computeStreak, type Streak } from "./streak";

// 제출 PDF 원본 보관 여부 (본문은 불러오지 않고 존재 여부만 확인)
const hasFile = sql<boolean>`exists (select 1 from assignment_files where assignment_files.assignment_id = ${assignments.id})`;

const issueColumns = {
  id: issueNotes.id,
  date: issueNotes.date,
  titleSummary: issueNotes.titleSummary,
  statusQuo: issueNotes.statusQuo,
  problems: issueNotes.problems,
  causes: issueNotes.causes,
  policyTrends: issueNotes.policyTrends,
  regionalContext: issueNotes.regionalContext,
  solutions: issueNotes.solutions,
  fieldCase: issueNotes.fieldCase,
  counterarguments: issueNotes.counterarguments,
  keywords: issueNotes.keywords,
  aiFeedback: issueNotes.aiFeedback,
  feedbackAt: issueNotes.feedbackAt,
};

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

  const [latestNews, categoryList, goalList, manageList, settings, assignmentList, revisionList, issueList, rubricList, streak] =
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
              categoryId: articles.categoryId,
              category: categories.name,
              publishedAt: articles.publishedAt,
            })
            .from(articles)
            .leftJoin(categories, eq(articles.categoryId, categories.id))
            .orderBy(desc(articles.publishedAt), desc(articles.id))
            .limit(60),
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
              autoType: goals.autoType,
              // 자동 집계 목표는 오늘 활동 수(과제·수정 제출·현안)를, 나머지는 직접 기록한 진행도를 쓴다.
              progress: sql<number>`case ${goals.autoType}
                when 'assignment' then (select count(*) from assignments where kind = 'assignment' and date = ${today})
                when 'revision' then (select count(*) from assignments where kind = 'revision' and date = ${today})
                when 'issue' then (select count(*) from issue_notes where date = ${today})
                else coalesce(${goalLogs.progress}, 0) end`.mapWith(Number),
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
              autoType: goals.autoType,
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
              content: assignments.content,
              fileName: assignments.fileName,
              score: assignments.score,
              maxScore: assignments.maxScore,
              gradeResult: assignments.gradeResult,
              rubricId: assignments.rubricId,
              hasFile,
            })
            .from(assignments)
            .where(eq(assignments.kind, "assignment"))
            .orderBy(desc(assignments.date), desc(assignments.id))
            .limit(5),
        [],
      ),
      // 과제 수정 제출: 과제 제출과 같은 테이블·같은 형태 (kind만 다름)
      load(
        "revisions",
        () =>
          db
            .select({
              id: assignments.id,
              title: assignments.title,
              date: assignments.date,
              content: assignments.content,
              fileName: assignments.fileName,
              score: assignments.score,
              maxScore: assignments.maxScore,
              gradeResult: assignments.gradeResult,
              rubricId: assignments.rubricId,
              hasFile,
            })
            .from(assignments)
            .where(eq(assignments.kind, "revision"))
            .orderBy(desc(assignments.date), desc(assignments.id))
            .limit(5),
        [],
      ),
      load(
        "issue_notes",
        () =>
          db
            .select(issueColumns)
            .from(issueNotes)
            .orderBy(desc(issueNotes.date), desc(issueNotes.id))
            .limit(5),
        [],
      ),
      load(
        "rubrics",
        () =>
          db
            .select({
              id: rubrics.id,
              name: rubrics.name,
              criteria: rubrics.criteria,
            })
            .from(rubrics)
            .orderBy(asc(rubrics.id)),
        [],
      ),
      load("streak", () => computeStreak(today), { days: 0, todayDone: false } as Streak),
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
    rubrics: rubricList,
    streak,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

// 과제 전체 기록(최신순). 대시보드는 5건만 보여주고, 전체는 /assignments 페이지에서 본다.
export type SubmissionKind = "assignment" | "revision";

export async function getAllAssignments(kind: SubmissionKind = "assignment") {
  return load(
    `submissions_all_${kind}`,
    () =>
      db
        .select({
          id: assignments.id,
          title: assignments.title,
          date: assignments.date,
          content: assignments.content,
          fileName: assignments.fileName,
          score: assignments.score,
          maxScore: assignments.maxScore,
          gradeResult: assignments.gradeResult,
              rubricId: assignments.rubricId,
              hasFile,
        })
        .from(assignments)
        .where(eq(assignments.kind, kind))
        .orderBy(desc(assignments.date), desc(assignments.id)),
    [],
  );
}

// 현안 전체 목록(최신순). 대시보드는 5건만 보여주고, 전체는 /issues 페이지에서 본다.
export async function getAllIssues() {
  return load(
    "issue_notes_all",
    () =>
      db
        .select(issueColumns)
        .from(issueNotes)
        .orderBy(desc(issueNotes.date), desc(issueNotes.id)),
    [],
  );
}

export async function getRubrics() {
  return load(
    "rubrics_list",
    () =>
      db
        .select({ id: rubrics.id, name: rubrics.name })
        .from(rubrics)
        .orderBy(asc(rubrics.id)),
    [],
  );
}

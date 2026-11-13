import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  interviewAttempts,
  interviewQuestions,
  materials,
  rubrics,
  type InterviewAttempt,
  type InterviewQuestion,
} from "@/db/schema";
import { load } from "./dashboard-data";

export type QuestionWithAttempts = InterviewQuestion & { attempts: InterviewAttempt[] };

// 면접 자판기 페이지용 데이터. 자료 본문(PDF base64·텍스트)은 목록에서 읽지 않는다.
export async function getInterviewData() {
  const [mats, questions] = await Promise.all([
    load(
      "materials",
      () =>
        db
          .select({
            id: materials.id,
            title: materials.title,
            kind: materials.kind,
            fileName: materials.fileName,
            sizeBytes: materials.sizeBytes,
            createdAt: materials.createdAt,
          })
          .from(materials)
          .orderBy(desc(materials.id)),
      [],
    ),
    load(
      "interview_questions",
      async (): Promise<QuestionWithAttempts[]> => {
        const qs = await db
          .select()
          .from(interviewQuestions)
          .orderBy(desc(interviewQuestions.id))
          .limit(100);
        if (qs.length === 0) return [];
        const attempts = await db
          .select()
          .from(interviewAttempts)
          .where(inArray(interviewAttempts.questionId, qs.map((q) => q.id)))
          .orderBy(desc(interviewAttempts.id));
        const byQuestion = new Map<number, InterviewAttempt[]>();
        for (const a of attempts) {
          const list = byQuestion.get(a.questionId) ?? [];
          list.push(a);
          byQuestion.set(a.questionId, list);
        }
        return qs.map((q) => ({ ...q, attempts: byQuestion.get(q.id) ?? [] }));
      },
      [],
    ),
  ]);
  return { materials: mats, questions };
}

export type InterviewStats = {
  materials: number;
  questions: number;
  attempts: number;
  recentAvgPct: number | null; // 최근 5번 답변의 100점 환산 평균
};

// 대시보드 카드용 요약
export async function getInterviewStats() {
  return load<InterviewStats>(
    "interview_stats",
    async () => {
      const [[m], [q], [a], recent] = await Promise.all([
        db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(materials),
        db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(interviewQuestions),
        db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(interviewAttempts),
        db
          .select({ score: interviewAttempts.score, max: interviewAttempts.maxScore })
          .from(interviewAttempts)
          .orderBy(desc(interviewAttempts.id))
          .limit(5),
      ]);
      const recentAvgPct =
        recent.length > 0
          ? Math.round(
              (recent.reduce((s, r) => s + (r.score / r.max) * 100, 0) / recent.length) * 10,
            ) / 10
          : null;
      return { materials: m.n, questions: q.n, attempts: a.n, recentAvgPct };
    },
    { materials: 0, questions: 0, attempts: 0, recentAvgPct: null },
  );
}

// 면접 채점 기준표(사용자가 만든 것). 비어 있으면 화면에서 기본 기준을 쓴다.
export async function getInterviewRubrics() {
  return load(
    "interview_rubrics",
    () =>
      db
        .select({ id: rubrics.id, name: rubrics.name, criteria: rubrics.criteria })
        .from(rubrics)
        .where(eq(rubrics.kind, "interview"))
        .orderBy(asc(rubrics.id)),
    [],
  );
}

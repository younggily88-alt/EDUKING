import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// 뉴스 카테고리 (기본값: 정책, 교원, 학생생활, 교육과정, 지역교육, 평가)
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 뉴스: 원문 전문은 저장하지 않고 요약과 원문 링크만 저장.
// URL 중복 허용(unique 제약 없음). 카테고리 삭제 시 category_id = null → '미분류'.
export const news = pgTable("news", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  originalUrl: text("original_url").notNull(),
  summaryKo: text("summary_ko").notNull(),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// RSS로 수집한 교육 기사. 원문 전문은 저장하지 않고 RSS가 주는 짧은 요약(summary)과 링크만 저장.
// category_id는 이후 Claude 분류 단계에서 채우므로 nullable. URL 중복 허용(PRD: 가져올 때마다 새로 쌓음).
export const articles = pgTable(
  "articles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: text("title").notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    url: text("url").notNull(),
    summary: text("summary"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // AI 요약·분류를 마친 시각. null이면 아직 처리 전(다음 수집 때 재시도).
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  // 같은 URL 기사는 한 번만 저장 (PRD의 '중복 허용'에서 변경)
  (t) => [unique("articles_url_unique").on(t.url)],
);

// 과제 업로드
export type RubricCriterion = {
  name: string;
  description: string;
  maxPoints: number;
};

export type GradeResult = {
  criteria: { name: string; maxPoints: number; score: number; comment: string }[];
  overall: string;
  strengths: string[];
  improvements: string[];
};

// 채점 기준표: 항목(이름·설명·배점) 목록. 과제 채점 시 선택해서 사용한다.
export const rubrics = pgTable("rubrics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  // 'assignment' = 과제 채점용, 'interview' = 면접 답변 채점용 (각각 따로 관리)
  kind: varchar("kind", { length: 20 }).default("assignment").notNull(),
  criteria: jsonb("criteria").$type<RubricCriterion[]>().notNull(),
  ...timestamps,
});

// PDF로 제출한 과제는 PDF 파일을 저장하지 않고 Claude 채점 결과만 남긴다.
// content에는 제출물 요약(PDF) 또는 직접 입력한 본문(텍스트 제출)이 들어간다.
export const assignments = pgTable("assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // 'assignment' = 과제 제출, 'revision' = 과제 수정 제출 (두 보드는 동일한 기능을 쓴다)
  kind: varchar("kind", { length: 20 }).default("assignment").notNull(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fileName: text("file_name"),
  rubricId: integer("rubric_id").references(() => rubrics.id, {
    onDelete: "set null",
  }),
  score: integer("score"),
  maxScore: integer("max_score"),
  gradeResult: jsonb("grade_result").$type<GradeResult>(),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  ...timestamps,
});

// 제출한 PDF 원본. 목록 조회가 무거워지지 않도록 assignments와 분리하고, base64 텍스트로 저장한다.
// 과제를 지우면 함께 삭제된다. (이 기능 도입 전에 제출한 과제에는 원본이 없다.)
export const assignmentFiles = pgTable("assignment_files", {
  assignmentId: integer("assignment_id")
    .primaryKey()
    .references(() => assignments.id, { onDelete: "cascade" }),
  dataBase64: text("data_base64").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 과제 수정 및 보완: 원본 과제 연결은 선택, 원본 삭제 시 연결만 해제
export const assignmentRevisions = pgTable("assignment_revisions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assignmentId: integer("assignment_id").references(() => assignments.id, {
    onDelete: "set null",
  }),
  date: date("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  ...timestamps,
});

export type IssueFeedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  likelyQuestions: { question: string; answerTip: string }[];
};

// 현안 정리: 10개 항목 모두 필수 (notNull). 빈 문자열 검증은 서버에서 별도로 수행.
export const issueNotes = pgTable("issue_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: date("date").notNull(),
  titleSummary: text("title_summary").notNull(), // 현안명 한 줄 요약
  statusQuo: text("status_quo").notNull(), // 현황
  problems: text("problems").notNull(), // 문제점
  causes: text("causes").notNull(), // 원인
  policyTrends: text("policy_trends").notNull(), // 정책 동향
  regionalContext: text("regional_context").notNull(), // 지역특수성
  solutions: text("solutions").notNull(), // 대안 및 실행 방안
  fieldCase: text("field_case").notNull(), // 내 현장 사례
  counterarguments: text("counterarguments").notNull(), // 예상 반론
  keywords: text("keywords").notNull(), // 키워드
  // Claude 검토 결과(논리 점검 + 면접 예상 질문). 아직 검토 전이면 null.
  aiFeedback: jsonb("ai_feedback").$type<IssueFeedback>(),
  feedbackAt: timestamp("feedback_at", { withTimezone: true }),
  // Notion에 저장한 페이지. 다시 저장하면 이 페이지를 갱신한다.
  notionPageId: text("notion_page_id"),
  notionUrl: text("notion_url"),
  notionSavedAt: timestamp("notion_saved_at", { withTimezone: true }),
  ...timestamps,
});

// 일일 목표 정의 (예: 뉴스 3개 읽기). 매일 반복되는 목표이며 목표량(target_count)을 가진다.
export const goals = pgTable("goals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  targetCount: integer("target_count").default(1).notNull(), // 하루 목표량
  // 적용 기간(선택). 둘 다 null이면 매일 반복. 시작일만/종료일만 있어도 허용(열린 구간).
  startDate: date("start_date"),
  endDate: date("end_date"),
  // 활동 자동 집계: 'assignment'(과제 제출)·'revision'(수정 제출)·'issue'(현안 작성). null이면 직접 체크.
  autoType: varchar("auto_type", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(), // 보관 처리용 (삭제 대신 비활성화)
  ...timestamps,
});

// 일일 목표 달성 기록: 목표 × 날짜당 1행. progress >= goals.target_count 이면 달성.
export const goalLogs = pgTable(
  "goal_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    progress: integer("progress").default(0).notNull(),
    ...timestamps,
  },
  (t) => [unique("goal_logs_goal_id_date_unique").on(t.goalId, t.date)],
);

// 앱 설정 (단일 사용자 앱이므로 1행만 사용): 시험일 등. 시험일은 나중에 수정 가능.
export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1), // 항상 1
  examDate: date("exam_date"), // 미설정이면 null → 대시보드에서 "시험일을 설정해 주세요"
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 앱 안에서 관리하는 접근 허용 이메일. 환경 변수 ALLOWED_EMAILS의 이메일은 '관리자'로 항상 허용되고,
// 여기에 추가한 이메일은 '멤버'로 앱을 쓸 수 있다(접근 관리 화면은 관리자만).
export const allowedUsers = pgTable("allowed_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 200 }).notNull().unique(), // 항상 소문자
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── 면접 준비 자판기 ─────────────────────────────────────────────
export type InterviewResult = {
  criteria: { name: string; maxPoints: number; score: number; comment: string }[];
  overall: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  followUp: string;
};

// 면접 문항의 근거가 되는 자료. PDF는 base64로, 텍스트는 content에 그대로 저장한다.
export const materials = pgTable("materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  kind: varchar("kind", { length: 10 }).notNull(), // 'pdf' | 'text'
  content: text("content"), // kind = 'text'
  fileName: text("file_name"), // kind = 'pdf'
  dataBase64: text("data_base64"), // kind = 'pdf'
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Claude가 자료에서 뽑아 낸 면접 문항. keyPoints(좋은 답변의 핵심)는 채점 기준으로 쓰고 답변 전에는 숨긴다.
export const interviewQuestions = pgTable("interview_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question").notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  intent: text("intent").notNull(), // 출제 의도
  keyPoints: jsonb("key_points").$type<string[]>().notNull(),
  materialTitles: jsonb("material_titles").$type<string[]>().notNull(), // 출제 당시 자료 제목(자료를 지워도 남김)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 문항 하나에 여러 번 답해 볼 수 있다 (다시 도전).
export const interviewAttempts = pgTable("interview_attempts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  questionId: integer("question_id")
    .notNull()
    .references(() => interviewQuestions.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  result: jsonb("result").$type<InterviewResult>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type News = typeof news.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Rubric = typeof rubrics.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type InterviewAttempt = typeof interviewAttempts.$inferSelect;
export type AssignmentRevision = typeof assignmentRevisions.$inferSelect;
export type IssueNote = typeof issueNotes.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalLog = typeof goalLogs.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;

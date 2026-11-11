import {
  boolean,
  date,
  integer,
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
export const articles = pgTable("articles", {
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
});

// 과제 업로드
export const assignments = pgTable("assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  ...timestamps,
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

export type Category = typeof categories.$inferSelect;
export type News = typeof news.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentRevision = typeof assignmentRevisions.$inferSelect;
export type IssueNote = typeof issueNotes.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalLog = typeof goalLogs.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;

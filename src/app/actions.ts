"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, goalLogs, goals } from "@/db/schema";
import { todayKST } from "@/lib/date";

export type ExamDateState = { ok: boolean; error?: string };
export type GoalResult = { ok: boolean; error?: string };

const MAX_TITLE = 100;
const MAX_COUNT = 99;

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// 시험일 저장 (app_settings 단일 행 upsert). 서버에서 로그인·날짜 형식을 다시 검증한다.
export async function updateExamDate(
  _prev: ExamDateState,
  formData: FormData,
): Promise<ExamDateState> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };

  const examDate = String(formData.get("examDate") ?? "").trim();
  if (!isRealDate(examDate)) {
    return { ok: false, error: "올바른 날짜를 입력해 주세요." };
  }

  try {
    await db
      .insert(appSettings)
      .values({ id: 1, examDate })
      .onConflictDoUpdate({ target: appSettings.id, set: { examDate } });
  } catch (error) {
    console.error("[updateExamDate] 저장 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/");
  return { ok: true };
}

// 빈 문자열/null → null(제한 없음), 그 외에는 실제 존재하는 날짜여야 한다.
function normalizeDate(value: string | null | undefined): string | null | false {
  const v = (value ?? "").trim();
  if (!v) return null;
  return isRealDate(v) ? v : false;
}

function validateGoal(
  title: string,
  targetCount: number,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): { error: string } | { start: string | null; end: string | null } {
  if (!title.trim()) return { error: "목표 내용을 입력해 주세요." };
  if (title.trim().length > MAX_TITLE) {
    return { error: `목표는 ${MAX_TITLE}자 이내로 입력해 주세요.` };
  }
  if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > MAX_COUNT) {
    return { error: `목표량은 1~${MAX_COUNT} 사이의 정수여야 해요.` };
  }
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (start === false || end === false) {
    return { error: "올바른 날짜를 입력해 주세요." };
  }
  if (start && end && start > end) {
    return { error: "종료일은 시작일보다 같거나 늦어야 해요." };
  }
  return { start, end };
}

async function requireUser() {
  const { userId } = await auth();
  return userId;
}

// 목표 추가: 언제든 설정 가능하며 저장 즉시 대시보드에 반영된다.
// 시작일·종료일이 모두 비면 매일 반복, 있으면 해당 기간(포함)에만 나타난다.
export async function addGoal(
  title: string,
  targetCount: number,
  startDate: string | null,
  endDate: string | null,
): Promise<GoalResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  const v = validateGoal(String(title), Number(targetCount), startDate, endDate);
  if ("error" in v) return { ok: false, error: v.error };

  try {
    await db.insert(goals).values({
      title: String(title).trim(),
      targetCount: Number(targetCount),
      startDate: v.start,
      endDate: v.end,
    });
  } catch (e) {
    console.error("[addGoal] 저장 실패", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

// 목표 수정 (내용·목표량·기간)
export async function updateGoal(
  id: number,
  title: string,
  targetCount: number,
  startDate: string | null,
  endDate: string | null,
): Promise<GoalResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  const v = validateGoal(String(title), Number(targetCount), startDate, endDate);
  if ("error" in v) return { ok: false, error: v.error };

  try {
    await db
      .update(goals)
      .set({
        title: String(title).trim(),
        targetCount: Number(targetCount),
        startDate: v.start,
        endDate: v.end,
      })
      .where(eq(goals.id, Number(id)));
  } catch (e) {
    console.error("[updateGoal] 저장 실패", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

// 목표 삭제 = 보관(비활성화). 과거 달성 기록은 남긴다.
export async function archiveGoal(id: number): Promise<GoalResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db
      .update(goals)
      .set({ isActive: false })
      .where(eq(goals.id, Number(id)));
  } catch (e) {
    console.error("[archiveGoal] 실패", e);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

// 오늘 진행도 기록 (목표 × 날짜당 1행 upsert). 0 ~ 목표량 범위로 제한.
export async function setGoalProgress(
  id: number,
  progress: number,
): Promise<GoalResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  const goalId = Number(id);
  if (!Number.isInteger(goalId) || !Number.isInteger(Number(progress))) {
    return { ok: false, error: "잘못된 요청이에요." };
  }

  try {
    const [goal] = await db
      .select({ targetCount: goals.targetCount })
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.isActive, true)));
    if (!goal) return { ok: false, error: "목표를 찾을 수 없어요." };

    const value = Math.min(Math.max(Number(progress), 0), goal.targetCount);
    await db
      .insert(goalLogs)
      .values({ goalId, date: todayKST(), progress: value })
      .onConflictDoUpdate({
        target: [goalLogs.goalId, goalLogs.date],
        set: { progress: value },
      });
  } catch (e) {
    console.error("[setGoalProgress] 실패", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

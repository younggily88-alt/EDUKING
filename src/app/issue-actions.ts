"use server";

import { getAllowedUserId } from "@/lib/access";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { issueNotes } from "@/db/schema";
import { todayKST } from "@/lib/date";
import { ISSUE_FIELDS, type IssueValues } from "@/lib/issue-fields";
import { AiError } from "@/lib/claude";
import { reviewIssue } from "@/lib/issue-review";

export type IssueResult = { ok: boolean; error?: string };

// 10개 항목 모두 필수. 화면의 버튼 비활성화와 별개로 서버에서 다시 검증한다
// (공백만 있는 값, 빈 문자열, 누락, 길이 초과 모두 거부).
function validate(values: unknown): { error: string } | { values: IssueValues } {
  const cleaned: Record<string, string> = {};
  for (const f of ISSUE_FIELDS) {
    const v = String((values as Record<string, unknown> | null)?.[f.key] ?? "").trim();
    if (!v) return { error: `'${f.label}' 항목을 입력해 주세요.` };
    if (v.length > f.max) {
      return { error: `'${f.label}'은(는) ${f.max}자 이내로 입력해 주세요.` };
    }
    cleaned[f.key] = v;
  }
  return { values: cleaned as IssueValues };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/issues");
}

export async function addIssueNote(values: IssueValues): Promise<IssueResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  const v = validate(values);
  if ("error" in v) return { ok: false, error: v.error };

  try {
    await db.insert(issueNotes).values({ date: todayKST(), ...v.values });
  } catch (error) {
    console.error("[addIssueNote] 저장 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

// 내용을 고치면 이전 AI 검토는 더 이상 맞지 않으므로 함께 지운다.
export async function updateIssueNote(id: number, values: IssueValues): Promise<IssueResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  const v = validate(values);
  if ("error" in v) return { ok: false, error: v.error };

  try {
    await db
      .update(issueNotes)
      .set({ ...v.values, aiFeedback: null, feedbackAt: null })
      .where(eq(issueNotes.id, Number(id)));
  } catch (error) {
    console.error("[updateIssueNote] 저장 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

export async function deleteIssueNote(id: number): Promise<IssueResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db.delete(issueNotes).where(eq(issueNotes.id, Number(id)));
  } catch (error) {
    console.error("[deleteIssueNote] 실패", error);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

// Claude가 현안을 검토해 논리 점검 + 면접 예상 질문을 저장한다.
export async function reviewIssueNote(id: number): Promise<IssueResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };

  const [note] = await db.select().from(issueNotes).where(eq(issueNotes.id, Number(id)));
  if (!note) return { ok: false, error: "현안을 찾을 수 없어요." };

  let feedback;
  try {
    feedback = await reviewIssue(note);
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    console.error("[reviewIssueNote] 실패", error);
    return { ok: false, error: "검토 중 오류가 발생했어요." };
  }

  try {
    await db
      .update(issueNotes)
      .set({ aiFeedback: feedback, feedbackAt: new Date() })
      .where(eq(issueNotes.id, note.id));
  } catch (error) {
    console.error("[reviewIssueNote] 저장 실패", error);
    return { ok: false, error: "검토는 끝났지만 저장하지 못했어요." };
  }
  refresh();
  return { ok: true };
}

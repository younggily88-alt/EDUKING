"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { interviewAttempts, interviewQuestions, materials, rubrics } from "@/db/schema";
import { getAllowedUserId } from "@/lib/access";
import { AiError } from "@/lib/claude";
import { generateQuestions, gradeAnswer } from "@/lib/interview";
import { QUESTION_CATEGORIES } from "@/lib/interview-config";

export type InterviewActionResult = { ok: boolean; error?: string; count?: number };

const MAX_RUN_MATERIALS = 5;
const MAX_RUN_PDF_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_CHARS = 40_000;
const MAX_ANSWER_CHARS = 4_000;
const MIN_ANSWER_CHARS = 20;

function refresh() {
  revalidatePath("/interview");
  revalidatePath("/");
}

export async function addTextMaterial(
  title: string,
  content: string,
): Promise<InterviewActionResult> {
  if (!(await getAllowedUserId())) return { ok: false, error: "로그인이 필요해요." };
  const t = String(title ?? "").trim();
  const c = String(content ?? "").trim();
  if (!t) return { ok: false, error: "자료 제목을 입력해 주세요." };
  if (t.length > 200) return { ok: false, error: "제목은 200자 이내로 입력해 주세요." };
  if (c.length < 50) return { ok: false, error: "자료 내용을 50자 이상 붙여 넣어 주세요." };
  if (c.length > MAX_TEXT_CHARS) {
    return {
      ok: false,
      error: `자료는 ${MAX_TEXT_CHARS.toLocaleString()}자 이내로 넣어 주세요. 나누어 등록해 주세요.`,
    };
  }
  try {
    await db.insert(materials).values({
      title: t,
      kind: "text",
      content: c,
      sizeBytes: Buffer.byteLength(c, "utf8"),
    });
  } catch (error) {
    console.error("[addTextMaterial] 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

export async function deleteMaterial(id: number): Promise<InterviewActionResult> {
  if (!(await getAllowedUserId())) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db.delete(materials).where(eq(materials.id, Number(id)));
  } catch (error) {
    console.error("[deleteMaterial] 실패", error);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

// 선택한 자료에서 면접 문항을 뽑아 저장한다 (자판기 버튼).
export async function generateInterviewQuestions(
  materialIds: number[],
  count: number,
  focus: string | null,
): Promise<InterviewActionResult> {
  if (!(await getAllowedUserId())) return { ok: false, error: "로그인이 필요해요." };

  const ids = [...new Set((materialIds ?? []).map(Number))].filter(Number.isInteger);
  if (ids.length === 0) return { ok: false, error: "문항을 뽑을 자료를 선택해 주세요." };
  if (ids.length > MAX_RUN_MATERIALS) {
    return { ok: false, error: `한 번에 자료 ${MAX_RUN_MATERIALS}개까지 선택할 수 있어요.` };
  }
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    return { ok: false, error: "문항 수는 1~5개로 선택해 주세요." };
  }
  const focusValue =
    focus && (QUESTION_CATEGORIES as readonly string[]).includes(focus) ? focus : null;

  const rows = await db.select().from(materials).where(inArray(materials.id, ids));
  if (rows.length === 0) return { ok: false, error: "선택한 자료를 찾을 수 없어요." };
  const pdfBytes = rows.reduce((s, r) => s + (r.kind === "pdf" ? r.sizeBytes : 0), 0);
  if (pdfBytes > MAX_RUN_PDF_BYTES) {
    return { ok: false, error: "선택한 PDF가 너무 커요. 자료를 줄여서 다시 선택해 주세요." };
  }

  let questions;
  try {
    questions = await generateQuestions({
      materials: rows.map((r) => ({
        title: r.title,
        kind: r.kind === "pdf" ? "pdf" : "text",
        content: r.content,
        pdfBase64: r.dataBase64,
      })),
      count: n,
      focus: focusValue,
    });
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    console.error("[generateInterviewQuestions] 실패", error);
    return { ok: false, error: "문항을 만드는 중 오류가 발생했어요." };
  }
  if (questions.length === 0) {
    return { ok: false, error: "자료에서 문항을 만들지 못했어요. 자료를 바꿔 다시 시도해 주세요." };
  }

  try {
    const titles = rows.map((r) => r.title);
    await db.insert(interviewQuestions).values(
      questions.map((q) => ({
        question: q.question,
        category: q.category,
        intent: q.intent,
        keyPoints: q.keyPoints,
        materialTitles: titles,
      })),
    );
  } catch (error) {
    console.error("[generateInterviewQuestions] 저장 실패", error);
    return { ok: false, error: "문항은 만들었지만 저장하지 못했어요." };
  }
  refresh();
  return { ok: true, count: questions.length };
}

// 내 답변을 채점해 기록한다. 같은 문항에 여러 번 답할 수 있다.
export async function submitInterviewAnswer(
  questionId: number,
  answer: string,
  rubricId: number | null = null,
): Promise<InterviewActionResult> {
  if (!(await getAllowedUserId())) return { ok: false, error: "로그인이 필요해요." };

  const text = String(answer ?? "").trim();
  if (text.length < MIN_ANSWER_CHARS) {
    return { ok: false, error: `답변을 ${MIN_ANSWER_CHARS}자 이상 써 주세요.` };
  }
  if (text.length > MAX_ANSWER_CHARS) {
    return { ok: false, error: `답변은 ${MAX_ANSWER_CHARS.toLocaleString()}자 이내로 써 주세요.` };
  }

  const [q] = await db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.id, Number(questionId)));
  if (!q) return { ok: false, error: "문항을 찾을 수 없어요." };

  // 선택한 면접 기준표가 있으면 그 기준으로, 없으면 기본 기준으로 채점한다.
  let criteria;
  if (rubricId !== null && rubricId !== undefined) {
    const [rubric] = await db
      .select()
      .from(rubrics)
      .where(and(eq(rubrics.id, Number(rubricId)), eq(rubrics.kind, "interview")));
    if (!rubric) return { ok: false, error: "선택한 채점 기준을 찾을 수 없어요." };
    criteria = rubric.criteria;
  }

  let graded;
  try {
    graded = await gradeAnswer({
      question: q.question,
      intent: q.intent,
      keyPoints: q.keyPoints,
      answer: text,
      criteria,
    });
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    console.error("[submitInterviewAnswer] 채점 실패", error);
    return { ok: false, error: "채점 중 오류가 발생했어요. 다시 시도해 주세요." };
  }

  try {
    await db.insert(interviewAttempts).values({
      questionId: q.id,
      answer: text,
      score: graded.score,
      maxScore: graded.maxScore,
      result: graded.result,
    });
  } catch (error) {
    console.error("[submitInterviewAnswer] 저장 실패", error);
    return { ok: false, error: "채점은 끝났지만 저장하지 못했어요." };
  }
  refresh();
  return { ok: true };
}

export async function deleteInterviewQuestion(id: number): Promise<InterviewActionResult> {
  if (!(await getAllowedUserId())) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db.delete(interviewQuestions).where(eq(interviewQuestions.id, Number(id)));
  } catch (error) {
    console.error("[deleteInterviewQuestion] 실패", error);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

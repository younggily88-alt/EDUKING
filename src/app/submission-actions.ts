"use server";

import { getAllowedUserId } from "@/lib/access";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignmentFiles, assignments, rubrics } from "@/db/schema";
import { GradingError, gradePdf } from "@/lib/grading";

export type SubmissionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/");
  revalidatePath("/assignments");
  revalidatePath("/revisions");
}

// 삭제하면 저장된 PDF 원본도 함께 지워진다 (FK on delete cascade).
export async function deleteSubmission(id: number): Promise<SubmissionResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db.delete(assignments).where(eq(assignments.id, Number(id)));
  } catch (error) {
    console.error("[deleteSubmission] 실패", error);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}

// 저장해 둔 PDF 원본을 선택한 기준표로 다시 채점한다. 이전 채점 결과는 새 결과로 덮어쓴다.
export async function regradeSubmission(
  id: number,
  rubricId: number,
): Promise<SubmissionResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };

  const [row] = await db
    .select({ title: assignments.title, data: assignmentFiles.dataBase64 })
    .from(assignments)
    .innerJoin(assignmentFiles, eq(assignmentFiles.assignmentId, assignments.id))
    .where(eq(assignments.id, Number(id)));
  if (!row) return { ok: false, error: "저장된 PDF 원본이 없어 다시 채점할 수 없어요." };

  const [rubric] = await db.select().from(rubrics).where(eq(rubrics.id, Number(rubricId)));
  if (!rubric) return { ok: false, error: "선택한 채점 기준표를 찾을 수 없어요." };

  let graded;
  try {
    graded = await gradePdf({
      title: row.title,
      pdfBase64: row.data,
      criteria: rubric.criteria,
    });
  } catch (error) {
    if (error instanceof GradingError) return { ok: false, error: error.message };
    console.error("[regradeSubmission] 채점 실패", error);
    return { ok: false, error: "채점 중 오류가 발생했어요." };
  }

  try {
    await db
      .update(assignments)
      .set({
        rubricId: rubric.id,
        content: graded.summary,
        score: graded.score,
        maxScore: graded.maxScore,
        gradeResult: graded.result,
        gradedAt: new Date(),
      })
      .where(eq(assignments.id, Number(id)));
  } catch (error) {
    console.error("[regradeSubmission] 저장 실패", error);
    return { ok: false, error: "채점은 끝났지만 저장하지 못했어요." };
  }
  refresh();
  return { ok: true };
}

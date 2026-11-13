import { getAllowedUserId } from "@/lib/access";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignmentFiles, assignments, rubrics } from "@/db/schema";
import { todayKST } from "@/lib/date";
import { GradingError, gradePdf } from "@/lib/grading";

// PDF 채점은 Claude 호출 때문에 오래 걸릴 수 있다.
export const maxDuration = 120;

// Vercel 요청 본문 한도(4.5MB)보다 조금 작게 제한
const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_TITLE = 200;

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const userId = await getAllowedUserId();
  if (!userId) return fail("로그인이 필요해요.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("요청을 읽지 못했어요. 파일이 너무 크지 않은지 확인해 주세요.", 400);
  }

  const title = String(form.get("title") ?? "").trim();
  const rubricId = Number(form.get("rubricId"));
  // 과제 제출 / 과제 수정 제출 구분 (허용 목록 외 값은 거부)
  const kind = String(form.get("kind") ?? "assignment");
  if (kind !== "assignment" && kind !== "revision") {
    return fail("잘못된 요청이에요.", 400);
  }
  const file = form.get("file");

  if (!title) return fail("과제 제목을 입력해 주세요.", 400);
  if (title.length > MAX_TITLE) return fail(`제목은 ${MAX_TITLE}자 이내로 입력해 주세요.`, 400);
  if (!Number.isInteger(rubricId)) return fail("채점 기준표를 선택해 주세요.", 400);
  if (!(file instanceof File) || file.size === 0) return fail("PDF 파일을 선택해 주세요.", 400);
  if (file.size > MAX_PDF_BYTES) return fail("PDF는 4MB 이하만 제출할 수 있어요.", 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  // 확장자·MIME은 조작 가능하므로 PDF 시그니처(%PDF-)를 직접 확인한다.
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return fail("PDF 파일만 제출할 수 있어요.", 400);
  }

  const [rubric] = await db.select().from(rubrics).where(and(eq(rubrics.id, rubricId), eq(rubrics.kind, "assignment")));
  if (!rubric) return fail("선택한 채점 기준표를 찾을 수 없어요.", 400);

  let graded;
  try {
    graded = await gradePdf({
      title,
      pdfBase64: bytes.toString("base64"),
      criteria: rubric.criteria,
    });
  } catch (error) {
    if (error instanceof GradingError) return fail(error.message, 502);
    console.error("[assignments] 채점 실패", error);
    return fail("채점 중 오류가 발생했어요.", 500);
  }

  try {
    const [row] = await db
      .insert(assignments)
      .values({
        kind,
        date: todayKST(),
        title,
        content: graded.summary,
        fileName: file.name.slice(0, 200),
        rubricId: rubric.id,
        score: graded.score,
        maxScore: graded.maxScore,
        gradeResult: graded.result,
        gradedAt: new Date(),
      })
      .returning({ id: assignments.id });

    // 원본 PDF 보관. 실패해도 채점 결과는 이미 저장됐으므로 제출 자체는 성공으로 처리한다.
    try {
      await db.insert(assignmentFiles).values({
        assignmentId: row.id,
        dataBase64: bytes.toString("base64"),
        sizeBytes: bytes.length,
      });
    } catch (error) {
      console.error("[assignments] 원본 PDF 저장 실패", error);
    }
    revalidatePath("/");
    revalidatePath(kind === "revision" ? "/revisions" : "/assignments");
    return Response.json({
      ok: true,
      id: row.id,
      score: graded.score,
      maxScore: graded.maxScore,
    });
  } catch (error) {
    console.error("[assignments] 저장 실패", error);
    return fail("채점은 끝났지만 저장하지 못했어요. 다시 시도해 주세요.", 500);
  }
}

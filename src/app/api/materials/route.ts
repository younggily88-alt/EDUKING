import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { getAllowedUserId } from "@/lib/access";

// 면접 자료 PDF 업로드. Vercel 요청 본문 한도(4.5MB)보다 조금 작게 제한한다.
const MAX_PDF_BYTES = 4 * 1024 * 1024;

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  if (!(await getAllowedUserId())) return fail("로그인이 필요해요.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("요청을 읽지 못했어요. 파일이 너무 크지 않은지 확인해 주세요.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("PDF 파일을 선택해 주세요.", 400);
  if (file.size > MAX_PDF_BYTES) return fail("PDF는 4MB 이하만 올릴 수 있어요.", 400);

  const title = (
    String(form.get("title") ?? "").trim() || file.name.replace(/\.pdf$/i, "")
  ).slice(0, 200);
  if (!title) return fail("자료 제목을 입력해 주세요.", 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  // 확장자·MIME은 조작 가능하므로 PDF 시그니처(%PDF-)를 직접 확인한다.
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return fail("PDF 파일만 올릴 수 있어요.", 400);
  }

  try {
    await db.insert(materials).values({
      title,
      kind: "pdf",
      fileName: file.name.slice(0, 200),
      dataBase64: bytes.toString("base64"),
      sizeBytes: bytes.length,
    });
  } catch (error) {
    console.error("[materials] 저장 실패", error);
    return fail("저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }
  revalidatePath("/interview");
  return Response.json({ ok: true });
}

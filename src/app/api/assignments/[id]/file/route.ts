import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assignmentFiles, assignments } from "@/db/schema";

// 제출한 PDF 원본을 브라우저에서 바로 열어 준다. 로그인한 사용자만 접근 가능.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("로그인이 필요해요.", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("잘못된 요청이에요.", { status: 400 });

  const [row] = await db
    .select({
      data: assignmentFiles.dataBase64,
      fileName: assignments.fileName,
    })
    .from(assignmentFiles)
    .innerJoin(assignments, eq(assignments.id, assignmentFiles.assignmentId))
    .where(eq(assignmentFiles.assignmentId, id));
  if (!row) return new Response("저장된 원본이 없어요.", { status: 404 });

  const name = encodeURIComponent(row.fileName ?? `assignment-${id}.pdf`);
  return new Response(Buffer.from(row.data, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

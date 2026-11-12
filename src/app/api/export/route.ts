import { getAllowedUserId } from "@/lib/access";
import { db } from "@/db";
import {
  appSettings,
  articles,
  assignmentFiles,
  assignments,
  categories,
  goalLogs,
  goals,
  issueNotes,
  rubrics,
} from "@/db/schema";
import { todayKST } from "@/lib/date";

// 전체 기록 백업(JSON 다운로드). 기본은 PDF 원본을 뺀 가벼운 백업이고,
// ?files=1 을 붙이면 제출한 PDF 원본(base64)까지 포함한다. 로그인한 본인만 내려받을 수 있다.
export const maxDuration = 60;

export async function GET(request: Request) {
  const userId = await getAllowedUserId();
  if (!userId) return new Response("로그인이 필요해요.", { status: 401 });

  const withFiles = new URL(request.url).searchParams.get("files") === "1";

  const [
    settingsRows,
    categoryRows,
    articleRows,
    goalRows,
    goalLogRows,
    rubricRows,
    assignmentRows,
    issueRows,
    fileRows,
  ] = await Promise.all([
    db.select().from(appSettings),
    db.select().from(categories),
    db.select().from(articles),
    db.select().from(goals),
    db.select().from(goalLogs),
    db.select().from(rubrics),
    db.select().from(assignments),
    db.select().from(issueNotes),
    withFiles ? db.select().from(assignmentFiles) : Promise.resolve([]),
  ]);

  const today = todayKST();
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      includesFiles: withFiles,
      appSettings: settingsRows,
      categories: categoryRows,
      articles: articleRows,
      goals: goalRows,
      goalLogs: goalLogRows,
      rubrics: rubricRows,
      assignments: assignmentRows, // kind: 'assignment'(과제 제출) | 'revision'(과제 수정 제출)
      issueNotes: issueRows,
      ...(withFiles ? { assignmentFiles: fileRows } : {}),
    },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="eduking-backup-${today}${withFiles ? "-with-files" : ""}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

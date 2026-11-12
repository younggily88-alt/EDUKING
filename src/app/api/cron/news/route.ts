import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NEWS_SOURCES } from "@/lib/news-feed";
import { ingestSource } from "@/lib/news-ingest";

// 매일 자동 수집용. Vercel Cron이 `Authorization: Bearer $CRON_SECRET`을 붙여 호출한다.
export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 시크릿이 없으면 누구도 호출할 수 없다
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const results: Record<string, { saved: number; classified: number; error?: string }> = {};
  for (const s of NEWS_SOURCES) {
    const r = await ingestSource(s.id);
    results[s.id] = {
      saved: r.saved,
      classified: r.classified,
      error: r.error ?? r.aiError,
    };
  }
  revalidatePath("/");
  return Response.json({ ok: true, results });
}

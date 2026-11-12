import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// 접근 허용 목록: 환경 변수 ALLOWED_EMAILS(쉼표로 구분)에 등록된 이메일의 사용자만 쓸 수 있다.
// 목록이 비어 있으면 아무도 들어올 수 없다(실수로 전체 공개되는 일 방지).
// Clerk 대시보드의 가입 제한과 별개로 코드에서 한 번 더 막는 이중 보호이다.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { ok: boolean; at: number }>();

export function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// userId의 인증된(verified) 이메일 중 하나라도 허용 목록에 있으면 true.
// Clerk API 호출을 줄이려고 1분간 결과를 기억한다. 확인에 실패하면 거부한다.
export async function isAllowedUser(userId: string): Promise<boolean> {
  const allowed = allowedEmails();
  if (allowed.size === 0) return false;

  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.ok;

  let ok = false;
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    ok = user.emailAddresses.some(
      (e) =>
        e.verification?.status === "verified" &&
        allowed.has(e.emailAddress.trim().toLowerCase()),
    );
  } catch (error) {
    console.error("[access] 사용자 확인 실패", error);
    return false;
  }
  cache.set(userId, { ok, at: Date.now() });
  return ok;
}

// 로그인했고 허용된 사용자의 id를 돌려준다. 아니면 null (서버 액션·API 라우트용).
export async function getAllowedUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return (await isAllowedUser(userId)) ? userId : null;
}

// 서버 컴포넌트(페이지)용: 허용되지 않은 사용자는 안내 페이지로 보낸다.
export async function assertAllowed(): Promise<void> {
  const { userId } = await auth();
  if (!userId || !(await isAllowedUser(userId))) redirect("/not-allowed");
}

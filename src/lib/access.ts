import { auth, clerkClient } from "@clerk/nextjs/server";
import { inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { allowedUsers } from "@/db/schema";

// 접근 제어는 두 단계다.
// - 관리자(owner): 환경 변수 ALLOWED_EMAILS(쉼표로 구분)에 있는 이메일. 항상 허용되고 '접근 관리' 화면을 열 수 있다.
// - 멤버: '접근 관리' 화면에서 추가해 DB(allowed_users)에 저장된 이메일. 앱은 쓸 수 있지만 접근 관리는 못 한다.
// 둘 다 아니면 로그인해도 들어올 수 없다. 확인에 실패하면 거부한다(fail-closed).
// Clerk 대시보드의 가입 제한과 별개로 코드에서 한 번 더 막는 이중 보호이다.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { allowed: boolean; owner: boolean; at: number }>();

export function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// 이메일을 추가·삭제한 직후 같은 서버 인스턴스에서 바로 반영되도록 기억해 둔 결과를 비운다.
export function clearAccessCache() {
  cache.clear();
}

async function resolve(userId: string): Promise<{ allowed: boolean; owner: boolean }> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;

  // 인증된(verified) 이메일만 인정한다.
  let emails: string[];
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    emails = user.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.trim().toLowerCase());
  } catch (error) {
    console.error("[access] 사용자 확인 실패", error);
    return { allowed: false, owner: false };
  }

  const env = allowedEmails();
  const owner = emails.some((e) => env.has(e));
  let allowed = owner;
  if (!allowed && emails.length > 0) {
    try {
      const rows = await db
        .select({ email: allowedUsers.email })
        .from(allowedUsers)
        .where(inArray(allowedUsers.email, emails));
      allowed = rows.length > 0;
    } catch (error) {
      console.error("[access] 허용 목록 조회 실패", error);
      return { allowed: false, owner: false }; // 확인 실패 시 거부(기억하지 않음)
    }
  }

  const result = { allowed, owner, at: Date.now() };
  cache.set(userId, result);
  return result;
}

export async function isAllowedUser(userId: string): Promise<boolean> {
  return (await resolve(userId)).allowed;
}

export async function isOwnerUser(userId: string): Promise<boolean> {
  return (await resolve(userId)).owner;
}

// 로그인했고 허용된 사용자의 id를 돌려준다. 아니면 null (서버 액션·API 라우트용).
export async function getAllowedUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return (await isAllowedUser(userId)) ? userId : null;
}

// 관리자(환경 변수에 등록된 이메일)의 id. 접근 관리 기능용.
export async function getOwnerUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return (await isOwnerUser(userId)) ? userId : null;
}

// 서버 컴포넌트(페이지)용: 허용되지 않은 사용자는 안내 페이지로 보낸다.
export async function assertAllowed(): Promise<void> {
  const { userId } = await auth();
  if (!userId || !(await isAllowedUser(userId))) redirect("/not-allowed");
}

// 관리자가 아니면 대시보드로 돌려보낸다 (허용되지 않은 사용자는 안내 페이지로).
export async function assertOwner(): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/not-allowed");
  const r = await resolve(userId);
  if (!r.allowed) redirect("/not-allowed");
  if (!r.owner) redirect("/");
}

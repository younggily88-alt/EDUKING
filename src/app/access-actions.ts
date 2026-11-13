"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { allowedUsers } from "@/db/schema";
import { allowedEmails, clearAccessCache, getOwnerUserId } from "@/lib/access";

export type AccessResult = { ok: boolean; error?: string };

// 간단한 이메일 형식 확인 (실제 로그인 가능 여부는 Clerk가 가린다)
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// 접근 관리는 관리자(환경 변수 ALLOWED_EMAILS)만 할 수 있다.
export async function addAllowedEmail(email: string): Promise<AccessResult> {
  if (!(await getOwnerUserId())) return { ok: false, error: "관리자만 할 수 있어요." };

  const value = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(value) || value.length > 200) {
    return { ok: false, error: "올바른 이메일 주소를 입력해 주세요." };
  }
  if (allowedEmails().has(value)) {
    return { ok: false, error: "이미 관리자로 등록된 이메일이에요." };
  }

  try {
    await db.insert(allowedUsers).values({ email: value });
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "23505") {
      return { ok: false, error: "이미 추가된 이메일이에요." };
    }
    console.error("[addAllowedEmail] 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  clearAccessCache();
  revalidatePath("/access");
  return { ok: true };
}

export async function removeAllowedEmail(id: number): Promise<AccessResult> {
  if (!(await getOwnerUserId())) return { ok: false, error: "관리자만 할 수 있어요." };
  try {
    await db.delete(allowedUsers).where(eq(allowedUsers.id, Number(id)));
  } catch (error) {
    console.error("[removeAllowedEmail] 실패", error);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  clearAccessCache();
  revalidatePath("/access");
  return { ok: true };
}

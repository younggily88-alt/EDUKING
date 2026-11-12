"use server";

import { getAllowedUserId } from "@/lib/access";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type CategoryResult = { ok: boolean; error?: string };

const MAX_NAME = 50;

function cleanName(value: unknown): { name: string } | { error: string } {
  const name = String(value ?? "").trim();
  if (!name) return { error: "카테고리 이름을 입력해 주세요." };
  if (name.length > MAX_NAME) return { error: `이름은 ${MAX_NAME}자 이내로 입력해 주세요.` };
  if (name === "미분류") return { error: "'미분류'는 예약된 이름이에요." };
  return { name };
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: string } | null)?.code === "23505";
}

export async function addCategory(name: string): Promise<CategoryResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  const v = cleanName(name);
  if ("error" in v) return { ok: false, error: v.error };
  try {
    await db.insert(categories).values({ name: v.name });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "이미 있는 카테고리예요." };
    console.error("[addCategory] 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

// 이름을 바꾸면 id로 연결된 기존 뉴스에 그대로 반영된다.
export async function renameCategory(id: number, name: string): Promise<CategoryResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  const v = cleanName(name);
  if ("error" in v) return { ok: false, error: v.error };
  try {
    await db.update(categories).set({ name: v.name }).where(eq(categories.id, Number(id)));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "이미 있는 카테고리예요." };
    console.error("[renameCategory] 실패", error);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

// 삭제하면 해당 뉴스의 category_id는 FK(on delete set null)로 비워져 '미분류'가 된다.
export async function deleteCategory(id: number): Promise<CategoryResult> {
  const userId = await getAllowedUserId();
  if (!userId) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db.delete(categories).where(eq(categories.id, Number(id)));
  } catch (error) {
    console.error("[deleteCategory] 실패", error);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

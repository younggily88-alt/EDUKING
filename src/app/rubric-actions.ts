"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { rubrics, type RubricCriterion } from "@/db/schema";

export type RubricResult = { ok: boolean; error?: string };

const MAX_CRITERIA = 20;

// 서버에서 기준표를 다시 검증·정리한다 (클라이언트 값은 신뢰하지 않음).
function validate(
  name: unknown,
  criteria: unknown,
): { error: string } | { name: string; criteria: RubricCriterion[] } {
  const rubricName = String(name ?? "").trim();
  if (!rubricName) return { error: "기준표 이름을 입력해 주세요." };
  if (rubricName.length > 100) return { error: "기준표 이름은 100자 이내로 입력해 주세요." };
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return { error: "채점 항목을 1개 이상 추가해 주세요." };
  }
  if (criteria.length > MAX_CRITERIA) {
    return { error: `채점 항목은 최대 ${MAX_CRITERIA}개까지 만들 수 있어요.` };
  }

  const cleaned: RubricCriterion[] = [];
  for (const [i, c] of (criteria as Partial<RubricCriterion>[]).entries()) {
    const itemName = String(c?.name ?? "").trim();
    const description = String(c?.description ?? "").trim();
    const maxPoints = Number(c?.maxPoints);
    if (!itemName) return { error: `${i + 1}번 항목의 이름을 입력해 주세요.` };
    if (itemName.length > 100) return { error: `${i + 1}번 항목 이름이 너무 길어요.` };
    if (description.length > 500) return { error: `${i + 1}번 항목 설명이 너무 길어요.` };
    if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 100) {
      return { error: `${i + 1}번 항목의 배점은 1~100 사이 정수여야 해요.` };
    }
    cleaned.push({ name: itemName, description, maxPoints });
  }
  return { name: rubricName, criteria: cleaned };
}

async function requireUser() {
  const { userId } = await auth();
  return userId;
}

export async function createRubric(
  name: string,
  criteria: RubricCriterion[],
): Promise<RubricResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  const v = validate(name, criteria);
  if ("error" in v) return { ok: false, error: v.error };
  try {
    await db.insert(rubrics).values(v);
  } catch (e) {
    console.error("[createRubric] 실패", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function updateRubric(
  id: number,
  name: string,
  criteria: RubricCriterion[],
): Promise<RubricResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  const v = validate(name, criteria);
  if ("error" in v) return { ok: false, error: v.error };
  try {
    await db.update(rubrics).set(v).where(eq(rubrics.id, Number(id)));
  } catch (e) {
    console.error("[updateRubric] 실패", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

// 삭제해도 이미 채점된 과제의 결과는 남는다 (과제의 rubric_id만 비워짐).
export async function deleteRubric(id: number): Promise<RubricResult> {
  if (!(await requireUser())) return { ok: false, error: "로그인이 필요해요." };
  try {
    await db.delete(rubrics).where(eq(rubrics.id, Number(id)));
  } catch (e) {
    console.error("[deleteRubric] 실패", e);
    return { ok: false, error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/");
  return { ok: true };
}

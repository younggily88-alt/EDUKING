import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

export class AiError extends Error {}

// 텍스트 입력 → JSON 출력(스키마 강제) 호출을 한곳에 모은 헬퍼.
// 뉴스 분류, 현안 검토처럼 "프롬프트 하나 → 구조화된 결과" 용도로 쓴다.
export async function askClaudeJson<T>(args: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError(
      ".env.local(배포 시에는 Vercel 환경 변수)에 ANTHROPIC_API_KEY를 설정해 주세요.",
    );
  }
  const client = new Anthropic();

  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: args.maxTokens ?? 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: args.system,
      output_config: {
        effort: args.effort ?? "medium",
        format: { type: "json_schema", schema: args.schema },
      },
      messages: [{ role: "user", content: args.prompt }],
    });
  } catch (error) {
    console.error("[claude] 호출 실패", error);
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiError("요청이 많아요. 잠시 후 다시 시도해 주세요.");
    }
    throw new AiError("AI 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
  }

  if (response.stop_reason === "refusal") throw new AiError("AI가 이 요청을 거절했어요.");
  if (response.stop_reason === "max_tokens") {
    throw new AiError("AI 응답이 너무 길어 완료하지 못했어요. 다시 시도해 주세요.");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new AiError("AI 응답을 받지 못했어요.");
  try {
    return JSON.parse(text.text) as T;
  } catch {
    throw new AiError("AI 응답을 해석하지 못했어요. 다시 시도해 주세요.");
  }
}

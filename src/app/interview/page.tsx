import { connection } from "next/server";
import { InterviewMachine } from "@/components/interview/interview-machine";
import { InterviewQuestionCard } from "@/components/interview/interview-question-card";
import { HistoryShell } from "@/components/dashboard/submission-history";
import { Card, EmptyState, LoadError } from "@/components/dashboard/ui";
import { assertAllowed } from "@/lib/access";
import { getInterviewData, getInterviewRubrics } from "@/lib/interview-data";
import { INTERVIEW_CRITERIA } from "@/lib/interview-config";
import { RubricManager } from "@/components/dashboard/rubric-manager";

export const metadata = { title: "면접 준비 자판기 · 교육전문직 준비 도우미" };

// 문항 생성·채점(Claude 호출)이 오래 걸릴 수 있다.
export const maxDuration = 120;

async function Machine() {
  await connection(); // 요청마다 최신 DB 데이터를 조회
  await assertAllowed();
  const [{ materials, questions }, rubricList] = await Promise.all([
    getInterviewData(),
    getInterviewRubrics(),
  ]);

  const attempts = questions.data.flatMap((q) => q.attempts);
  const avg =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + (a.score / a.maxScore) * 100, 0) / attempts.length) * 10) / 10
      : null;

  return (
    <div className="space-y-6">
      <Card title="🎰 면접 준비 자판기">
        <p className="mb-4 text-sm text-stone-600">
          자료를 넣고 버튼을 누르면 그 자료에서 면접 문항이 나와요. 답변을 쓰면 AI가 채점하고, 모범 답안과 꼬리 질문까지 알려 줘요.
        </p>
        {materials.failed ? <LoadError /> : <InterviewMachine materials={materials.data} />}
      </Card>

      <Card title="채점 기준 관리">
        <p className="mb-3 text-sm text-stone-600">
          답변을 채점할 기준을 직접 만들 수 있어요. 문항마다 &apos;채점 기준&apos;에서 골라 쓰고, 고르지 않으면 기본 기준으로 채점해요.
        </p>
        <details className="mb-4 rounded-lg bg-stone-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-stone-700">기본 기준 보기 (고칠 수 없음)</summary>
          <ul className="mt-2 space-y-1 text-stone-600">
            {INTERVIEW_CRITERIA.map((c) => (
              <li key={c.name}>
                <span className="font-medium">{c.name}</span> {c.maxPoints}점 — {c.description}
              </li>
            ))}
          </ul>
        </details>
        {rubricList.failed ? (
          <LoadError />
        ) : (
          <RubricManager rubrics={rubricList.data} kind="interview" />
        )}
      </Card>

      <Card
        title="내 문항"
        action={
          <span className="text-sm text-stone-500">
            문항 {questions.data.length}개 · 답변 {attempts.length}회
            {avg !== null && ` · 평균 ${avg}점`}
          </span>
        }
      >
        {questions.failed ? (
          <LoadError />
        ) : questions.data.length === 0 ? (
          <EmptyState>아직 문항이 없어요. 위에서 자료를 고르고 &apos;문항 뽑기&apos;를 눌러 보세요.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {questions.data.map((q) => (
              <InterviewQuestionCard
                key={q.id}
                q={q}
                rubrics={rubricList.failed ? [] : rubricList.data.map((r) => ({ id: r.id, name: r.name }))}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <HistoryShell>
      <Machine />
    </HistoryShell>
  );
}

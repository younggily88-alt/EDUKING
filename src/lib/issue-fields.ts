// 현안 정리의 10개 필수 항목. 폼(클라이언트)과 서버 검증이 같은 정의를 공유한다.
export const ISSUE_FIELDS = [
  { key: "titleSummary", label: "현안명 한 줄 요약", hint: "예: 농어촌 소규모 학교 통폐합 문제", long: false, max: 200 },
  { key: "statusQuo", label: "현황", hint: "현재 어떤 상황인지 사실과 수치로", long: true, max: 5000 },
  { key: "problems", label: "문제점", hint: "무엇이 문제인지", long: true, max: 5000 },
  { key: "causes", label: "원인", hint: "왜 그런 문제가 생겼는지", long: true, max: 5000 },
  { key: "policyTrends", label: "정책 동향", hint: "국가·시도교육청의 관련 정책 흐름", long: true, max: 5000 },
  { key: "regionalContext", label: "지역특수성", hint: "전남·광주 등 우리 지역의 특성", long: true, max: 5000 },
  { key: "solutions", label: "대안 및 실행 방안", hint: "구체적으로 무엇을 어떻게", long: true, max: 5000 },
  { key: "fieldCase", label: "내 현장 사례", hint: "직접 겪거나 본 현장 사례", long: true, max: 5000 },
  { key: "counterarguments", label: "예상 반론", hint: "반대 의견과 그에 대한 답변", long: true, max: 5000 },
  { key: "keywords", label: "키워드", hint: "쉼표로 구분 (예: 학교통폐합, 작은학교, 지역소멸)", long: false, max: 200 },
] as const;

export type IssueFieldKey = (typeof ISSUE_FIELDS)[number]["key"];
export type IssueValues = Record<IssueFieldKey, string>;

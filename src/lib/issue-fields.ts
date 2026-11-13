// 현안 정리의 10개 필수 항목. 폼(클라이언트)과 서버 검증이 같은 정의를 공유한다.
// 배열 순서가 폼과 게시판에 보이는 순서다.
// 주의: key는 DB 컬럼(issue_notes)과 연결되어 있어 처음 이름을 그대로 둔다. 화면에 보이는 이름(label)만 바뀌었다.
//   statusQuo → 현황(목표) / solutions → 세부 운영 방안 / counterarguments → 대책 / causes → 기대효과
export const ISSUE_FIELDS = [
  { key: "titleSummary", label: "현안명 한 줄 요약", hint: "예: 농어촌 소규모 학교 통폐합 문제", long: false, max: 200 },
  { key: "statusQuo", label: "현황(목표)", hint: "현재 상황과 도달하려는 목표를 사실·수치로", long: true, max: 5000 },
  { key: "problems", label: "문제점", hint: "무엇이 문제인지", long: true, max: 5000 },
  { key: "policyTrends", label: "정책 동향", hint: "국가·시도교육청의 관련 정책 흐름", long: true, max: 5000 },
  { key: "regionalContext", label: "지역특수성", hint: "전남·광주 등 우리 지역의 특성", long: true, max: 5000 },
  { key: "solutions", label: "세부 운영 방안(간략히)", hint: "핵심만 간략히 — 누가·무엇을·어떻게", long: true, max: 5000 },
  { key: "fieldCase", label: "내 현장 사례", hint: "직접 겪거나 본 현장 사례", long: true, max: 5000 },
  { key: "counterarguments", label: "대책", hint: "예상되는 반대·우려와 이에 대한 대책", long: true, max: 5000 },
  { key: "causes", label: "기대효과", hint: "이 방안을 실행했을 때 기대되는 효과", long: true, max: 5000 },
  { key: "keywords", label: "키워드", hint: "쉼표로 구분 (예: 학교통폐합, 작은학교, 지역소멸)", long: false, max: 200 },
] as const;

export type IssueFieldKey = (typeof ISSUE_FIELDS)[number]["key"];
export type IssueValues = Record<IssueFieldKey, string>;

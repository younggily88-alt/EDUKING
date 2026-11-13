// 면접 자판기의 문항 유형과 채점 기준. 서버(Claude 호출)와 화면이 함께 쓰므로 서버 전용 코드를 import하지 않는다.
export const QUESTION_CATEGORIES = [
  "정책 이해",
  "현장 사례",
  "갈등·딜레마",
  "가치관·소신",
  "시사·현안",
] as const;

// 채점 기준 (총 100점). 말로 하는 면접 답변을 기준으로 한다.
export const INTERVIEW_CRITERIA = [
  { name: "논리성", maxPoints: 20, description: "주장→이유→결론의 흐름이 자연스럽고 비약이 없는가" },
  { name: "근거·구체성", maxPoints: 20, description: "수치·사례·제도 등 구체적 근거로 뒷받침하는가" },
  { name: "정책·현안 이해", maxPoints: 20, description: "질문과 관련된 정책·현안을 정확하고 깊이 있게 이해하는가" },
  { name: "현장 적합성", maxPoints: 20, description: "교육 현장에서 실현 가능하고 학생·교사 입장을 고려한 답인가" },
  { name: "전달력", maxPoints: 20, description: "2~3분 안에 핵심부터 명료하게 말할 수 있는 구조와 분량인가" },
] as const;

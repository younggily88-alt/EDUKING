// 뉴스 카테고리별 색. Tailwind는 클래스 이름을 문자열 그대로 찾기 때문에 전부 완성된 문자열로 적는다.
// 글자/배경 대비는 WCAG AA(4.5:1) 이상이 되도록 골랐다 (연한 배경 + 800 글자, 진한 배경 + 흰 글자).
export type CategoryColor = {
  soft: string; // 연한 칩(비선택·카드 뱃지)
  softHover: string;
  solid: string; // 진한 칩(선택됨)
  border: string; // 카드 왼쪽 강조선
};

const PALETTE: CategoryColor[] = [
  { soft: "bg-blue-100 text-blue-800", softHover: "hover:bg-blue-200", solid: "bg-blue-600 text-white", border: "border-l-blue-500" },
  { soft: "bg-rose-100 text-rose-800", softHover: "hover:bg-rose-200", solid: "bg-rose-600 text-white", border: "border-l-rose-500" },
  { soft: "bg-amber-100 text-amber-900", softHover: "hover:bg-amber-200", solid: "bg-amber-700 text-white", border: "border-l-amber-500" },
  { soft: "bg-violet-100 text-violet-800", softHover: "hover:bg-violet-200", solid: "bg-violet-600 text-white", border: "border-l-violet-500" },
  { soft: "bg-cyan-100 text-cyan-900", softHover: "hover:bg-cyan-200", solid: "bg-cyan-700 text-white", border: "border-l-cyan-500" },
  { soft: "bg-orange-100 text-orange-900", softHover: "hover:bg-orange-200", solid: "bg-orange-700 text-white", border: "border-l-orange-500" },
  { soft: "bg-pink-100 text-pink-800", softHover: "hover:bg-pink-200", solid: "bg-pink-600 text-white", border: "border-l-pink-500" },
  { soft: "bg-indigo-100 text-indigo-800", softHover: "hover:bg-indigo-200", solid: "bg-indigo-600 text-white", border: "border-l-indigo-500" },
  { soft: "bg-lime-100 text-lime-900", softHover: "hover:bg-lime-200", solid: "bg-lime-700 text-white", border: "border-l-lime-500" },
  { soft: "bg-fuchsia-100 text-fuchsia-800", softHover: "hover:bg-fuchsia-200", solid: "bg-fuchsia-600 text-white", border: "border-l-fuchsia-500" },
];

export const UNCATEGORIZED_COLOR: CategoryColor = {
  soft: "bg-stone-100 text-stone-700",
  softHover: "hover:bg-stone-200",
  solid: "bg-stone-600 text-white",
  border: "border-l-stone-400",
};

// 카테고리 id로 색을 정한다. id는 이름을 바꿔도, 다른 카테고리를 지워도 그대로라서 색이 바뀌지 않는다.
export function colorForCategory(id: number | null): CategoryColor {
  if (id === null) return UNCATEGORIZED_COLOR;
  return PALETTE[(((id - 1) % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

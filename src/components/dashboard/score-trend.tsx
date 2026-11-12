import type { AssignmentRow } from "./assignment-item";
import { formatDotted } from "@/lib/date";

// 점수 추이(꺾은선) + 항목별 평균 달성률(막대). 채점된 제출이 2건 이상일 때만 보여준다.
export function ScoreTrend({ items }: { items: AssignmentRow[] }) {
  const graded = items
    .filter((a) => a.score != null && a.maxScore && a.gradeResult)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));
  if (graded.length < 2) return null;

  const pct = (a: AssignmentRow) => Math.round((a.score! / a.maxScore!) * 1000) / 10;

  // 항목별 달성률: 같은 이름의 항목을 모든 제출에 걸쳐 합산
  const byCriterion = new Map<string, { got: number; max: number; n: number }>();
  for (const a of graded) {
    for (const c of a.gradeResult!.criteria) {
      const cur = byCriterion.get(c.name) ?? { got: 0, max: 0, n: 0 };
      cur.got += c.score;
      cur.max += c.maxPoints;
      cur.n += 1;
      byCriterion.set(c.name, cur);
    }
  }
  const criteria = [...byCriterion.entries()]
    .map(([name, v]) => ({ name, rate: Math.round((v.got / v.max) * 1000) / 10, n: v.n }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 8);

  const W = 600;
  const H = 160;
  const padX = 28;
  const padY = 16;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (graded.length - 1);
  const y = (p: number) => padY + ((100 - p) * (H - padY * 2)) / 100;
  const points = graded.map((a, i) => `${x(i)},${y(pct(a))}`).join(" ");
  const first = graded[0];
  const last = graded[graded.length - 1];
  const delta = Math.round((pct(last) - pct(first)) * 10) / 10;

  return (
    <div className="mb-5 grid gap-5 md:grid-cols-2">
      <figure>
        <figcaption className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-brand-900">점수 추이 (100점 환산)</span>
          <span className="text-stone-500">
            첫 {pct(first)}점 → 최근 {pct(last)}점 ({delta >= 0 ? "+" : ""}
            {delta})
          </span>
        </figcaption>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`제출 ${graded.length}건의 점수 추이. 첫 제출 ${pct(first)}점, 최근 ${pct(last)}점`}
          className="h-auto w-full text-brand-600"
        >
          {[0, 50, 100].map((p) => (
            <g key={p}>
              <line x1={padX} x2={W - padX} y1={y(p)} y2={y(p)} className="stroke-stone-200" />
              <text x={padX - 6} y={y(p) + 4} textAnchor="end" className="fill-stone-400 text-[10px]">
                {p}
              </text>
            </g>
          ))}
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {graded.map((a, i) => (
            <circle key={a.id} cx={x(i)} cy={y(pct(a))} r={4} fill="currentColor">
              <title>{`${formatDotted(a.date)} · ${a.title} · ${pct(a)}점`}</title>
            </circle>
          ))}
          <text x={padX} y={H - 2} className="fill-stone-400 text-[10px]">
            {formatDotted(first.date)}
          </text>
          <text x={W - padX} y={H - 2} textAnchor="end" className="fill-stone-400 text-[10px]">
            {formatDotted(last.date)}
          </text>
        </svg>
      </figure>

      <figure>
        <figcaption className="mb-2 text-sm">
          <span className="font-semibold text-brand-900">항목별 평균 달성률</span>
          <span className="ml-2 text-stone-500">낮은 순 — 먼저 보완할 부분</span>
        </figcaption>
        <ul className="space-y-1.5 text-sm">
          {criteria.map((c) => (
            <li key={c.name} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2">
              <span className="truncate" title={c.name}>
                {c.name}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-brand-100">
                <span
                  className="block h-full rounded-full bg-brand-500"
                  style={{ width: `${c.rate}%` }}
                />
              </span>
              <span className="text-right text-stone-600">{c.rate}%</span>
            </li>
          ))}
        </ul>
      </figure>
    </div>
  );
}

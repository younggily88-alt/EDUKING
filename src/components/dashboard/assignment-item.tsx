import { formatDotted } from "@/lib/date";
import type { Assignment } from "@/db/schema";
import { Chip } from "./ui";

export type AssignmentRow = Pick<
  Assignment,
  | "id"
  | "title"
  | "date"
  | "content"
  | "fileName"
  | "score"
  | "maxScore"
  | "gradeResult"
> & { hasFile: boolean };

// 과제 한 건: 채점 결과가 있으면 점수 칩 + 펼쳐서 항목별 점수·피드백을 볼 수 있다.
export function AssignmentItem({ a }: { a: AssignmentRow }) {
  const g = a.gradeResult;

  if (a.score == null || a.maxScore == null || !g) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-brand-50">
        <p className="min-w-0 truncate">{a.title}</p>
        <span className="shrink-0 text-sm text-stone-500">{formatDotted(a.date)}</span>
      </li>
    );
  }

  return (
    <li className="rounded-lg hover:bg-brand-50">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0 truncate">{a.title}</span>
          <span className="flex shrink-0 items-center gap-2 text-sm">
            <Chip>
              {a.score}/{a.maxScore}점
            </Chip>
            <span className="text-stone-500">{formatDotted(a.date)}</span>
          </span>
        </summary>
        <div className="space-y-3 px-3 pb-3 text-sm">
          {a.fileName && (
            <p className="text-xs text-stone-500">
              제출 파일: {a.fileName}
              {a.hasFile ? (
                <>
                  {" · "}
                  <a
                    href={`/api/assignments/${a.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-600 hover:text-brand-700"
                  >
                    PDF 원본 보기 ↗
                  </a>
                </>
              ) : (
                " · 원본 미보관"
              )}
            </p>
          )}
          <p className="text-stone-600">{a.content}</p>
          <table className="w-full text-left">
            <caption className="sr-only">항목별 채점 결과</caption>
            <tbody>
              {g.criteria.map((c) => (
                <tr key={c.name} className="border-t border-stone-100 align-top">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {c.name}
                  </th>
                  <td className="whitespace-nowrap py-2 pr-3 text-brand-700">
                    {c.score}/{c.maxPoints}
                  </td>
                  <td className="py-2 text-stone-600">{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-medium">총평</p>
          <p className="text-stone-600">{g.overall}</p>
          {g.strengths.length > 0 && (
            <div>
              <p className="font-medium">잘한 점</p>
              <ul className="list-disc pl-5 text-stone-600">
                {g.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {g.improvements.length > 0 && (
            <div>
              <p className="font-medium">보완할 점</p>
              <ul className="list-disc pl-5 text-stone-600">
                {g.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

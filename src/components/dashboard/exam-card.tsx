import {
  WEEKDAY_LABELS,
  buildMonth,
  daysUntil,
  formatDotted,
} from "@/lib/date";
import type { DashboardData } from "@/lib/dashboard-data";
import { ExamDateEditor } from "./exam-date-editor";
import { Card, LoadError } from "./ui";

function ddayLabel(diff: number) {
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export function ExamCard({
  today,
  examDate,
}: {
  today: string;
  examDate: DashboardData["examDate"];
}) {
  const { year, month, cells } = buildMonth(today);
  const todayDay = Number(today.slice(8));
  const exam = examDate.data;
  const examInMonth =
    exam && exam.startsWith(`${year}-${String(month).padStart(2, "0")}`)
      ? Number(exam.slice(8))
      : null;

  return (
    <Card
      title="시험일 D-day"
      action={<ExamDateEditor examDate={exam} />}
    >
      {examDate.failed ? (
        <LoadError />
      ) : (
        <div className="mb-4 text-center">
          {exam ? (
            <>
              <p className="text-4xl font-bold text-brand-700">
                {ddayLabel(daysUntil(exam, today))}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                시험일 {formatDotted(exam)}
              </p>
            </>
          ) : (
            <p className="py-2 text-sm text-stone-500">
              시험일이 아직 설정되지 않았어요.
            </p>
          )}
        </div>
      )}

      <p className="mb-2 text-center text-sm font-medium text-stone-700">
        {year}년 {month}월
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {WEEKDAY_LABELS.map((w, i) => (
          <span
            key={w}
            className={`pb-1 text-xs ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-stone-500"}`}
          >
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const isExam = day === examInMonth;
          const isToday = day === todayDay;
          const col = i % 7;
          const tone = isExam
            ? "bg-brand-600 font-semibold text-white"
            : isToday
              ? "bg-brand-100 font-semibold text-brand-700"
              : col === 0
                ? "text-red-500"
                : col === 6
                  ? "text-blue-500"
                  : "text-stone-700";
          return (
            <span
              key={day}
              className={`mx-auto flex size-8 items-center justify-center rounded-full ${tone}`}
              aria-label={
                isExam ? `${day}일 시험일` : isToday ? `${day}일 오늘` : undefined
              }
            >
              {day}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

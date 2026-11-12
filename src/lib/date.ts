const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 서버 시간대와 무관하게 한국 날짜(YYYY-MM-DD)를 반환
export function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
}

// "YYYY-MM-DD" 두 날짜 사이의 일수 (target - from)
export function daysUntil(target: string, from: string): number {
  return Math.round((Date.parse(target) - Date.parse(from)) / 86_400_000);
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

export function formatDotted(iso: string): string {
  return iso.replaceAll("-", ".");
}

export function formatShortDate(value: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

// 해당 날짜가 속한 달의 달력 칸(앞쪽은 null로 채움)
export function buildMonth(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  return { year, month, cells };
}

export const WEEKDAY_LABELS = WEEKDAYS;

// "YYYY-MM-DD"에 일수를 더한 날짜 (음수 가능)
export function addDaysISO(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

// 시각 → 한국 날짜(YYYY-MM-DD)
export function toKSTDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(value),
  );
}

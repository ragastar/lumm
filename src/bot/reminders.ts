import { formatDateIso } from "@/lib/rotation";

export type RemMember = { id: string; displayName: string; telegramId: string | null };
export type RemWeeklyReport = { memberId: string; weekStart: string };
export type RemMonthlyFinancial = { memberId: string; month: string };

export function findLaggardsWeekly(
  members: RemMember[],
  reports: RemWeeklyReport[],
  currentWeekStartIso: string,
): RemMember[] {
  const submitted = new Set(
    reports.filter((r) => r.weekStart === currentWeekStartIso).map((r) => r.memberId),
  );
  return members.filter((m) => !submitted.has(m.id));
}

export function findLaggardsMonthly(
  members: RemMember[],
  financials: RemMonthlyFinancial[],
  currentMonthIso: string,
): RemMember[] {
  const submitted = new Set(
    financials.filter((f) => f.month === currentMonthIso).map((f) => f.memberId),
  );
  return members.filter((m) => !submitted.has(m.id));
}

export function formatMentions(laggards: RemMember[]): string {
  return laggards
    .map((m) => (m.telegramId ? `@${m.displayName}` : m.displayName))
    .join(", ");
}

export function composeWeeklyReminder(laggards: RemMember[]): string | null {
  if (laggards.length === 0) return null;
  const mentions = formatMentions(laggards);
  return `Воскресенье, ждём еженедельный отчёт от: ${mentions}. В групповом чате: @lummbrain_bot Еженедельный отчёт ...`;
}

export function composeMonthlyReminder(
  laggards: RemMember[],
  meetingDateIso: string,
): string | null {
  if (laggards.length === 0) return null;
  const mentions = formatMentions(laggards);
  const [y, m, d] = meetingDateIso.split("-");
  const humanDate = `${d}.${m}.${y}`;
  return `Через 3 дня встреча (${humanDate}). Ждём ежемесячный отчёт от: ${mentions}. Сдать: https://lumm.space/financials`;
}

export function currentWeekStart(from: Date): string {
  const day = from.getDay(); // 0=вс..6=сб
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(from.getFullYear(), from.getMonth(), from.getDate() + diffToMonday);
  return formatDateIso(monday);
}

export function monthIso(from: Date): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

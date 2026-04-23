export type PoolMember = { id: string; displayName: string };

export function nextOrganizer(
  pool: PoolMember[],
  lastOrganizerId: string | null,
): string | null {
  if (pool.length === 0) return null;
  if (!lastOrganizerId) return pool[0].id;
  const idx = pool.findIndex((m) => m.id === lastOrganizerId);
  if (idx === -1) return pool[0].id;
  return pool[(idx + 1) % pool.length].id;
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): Date {
  // monthIndex: 0..11 как в JS Date. weekday: 0=Sun..6=Sat. n: 1..5.
  const first = new Date(year, monthIndex, 1);
  const offsetToFirstWeekday = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offsetToFirstWeekday + (n - 1) * 7);
}

export function nextThirdThursday(from: Date): Date {
  const THURSDAY = 4;
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();
  const thisMonthThird = nthWeekdayOfMonth(y, m, THURSDAY, 3);
  const fromDateOnly = new Date(y, m, d);
  if (thisMonthThird.getTime() >= fromDateOnly.getTime()) {
    return thisMonthThird;
  }
  const nextMonth = m === 11 ? 0 : m + 1;
  const nextYear = m === 11 ? y + 1 : y;
  return nthWeekdayOfMonth(nextYear, nextMonth, THURSDAY, 3);
}

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

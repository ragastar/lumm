export function isQuarterEnd(monthIso: string): boolean {
  const match = /^(\d{4})-(\d{2})-01$/.exec(monthIso);
  if (!match) return false;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;
  return month === 3 || month === 6 || month === 9 || month === 12;
}

export function formatOpenSlots(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n) || n <= 0) return "Мы полны";
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) word = "место";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "места";
  else word = "мест";
  return `Свободно ${n} ${word}`;
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function formatNextWindow(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

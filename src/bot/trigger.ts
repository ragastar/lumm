const MENTION = /@lummbrain_bot/i;
const ADJECTIVE = "(?:еженедельн|ежемесячн|кварталь|ежеквартальн|месячн|годов)[а-яё]*";
const PHRASE = new RegExp(`(?:${ADJECTIVE}\\s+)?отч[её]т`, "i");

export function matchTrigger(text: string): string | null {
  if (!text) return null;
  if (!MENTION.test(text) || !PHRASE.test(text)) return null;

  const stripped = text
    .replace(MENTION, " ")
    .replace(PHRASE, " ")
    .trim()
    .replace(/^[\s:,.\-—–]+/, "")
    .replace(/[\s]+/g, (m) => (m.includes("\n") ? m : " "))
    .trim();

  return stripped.length > 0 ? stripped : null;
}

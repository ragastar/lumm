// Первое слово(а) после mention должно быть либо «прилагательное отч[её]т», либо просто «отч[её]т».
const FIRST_WORD =
  /^(?:(?:еженедельн|ежемесячн|кварталь|ежеквартальн|месячн|годов)[а-яё]*\s+)?отч[её]т(?=\s|[:,.\-—–]|$)/i;

export function matchTrigger(text: string): string | null {
  if (!text) return null;
  const mentionMatch = /@lummbrain_bot/i.exec(text);
  if (!mentionMatch) return null;
  const afterMention = text.slice(mentionMatch.index + mentionMatch[0].length);
  const trimmedStart = afterMention.replace(/^[\s:,.\-—–]+/, "");
  const phraseMatch = FIRST_WORD.exec(trimmedStart);
  if (!phraseMatch) return null;
  const stripped = trimmedStart
    .slice(phraseMatch[0].length)
    .trim()
    .replace(/^[\s:,.\-—–]+/, "")
    .replace(/[\s]+/g, (m) => (m.includes("\n") ? m : " "))
    .trim();
  return stripped.length > 0 ? stripped : null;
}

// src/bot/steeringTrigger.ts

/**
 * Проверяет, является ли сообщение триггером «штурвал».
 * Ожидаемый формат: <mention бота> штурвал <тело>
 * Первое значимое слово после mention должно быть именно «штурвал».
 * Регистр слова «штурвал» не важен.
 * @returns тело штурвала (триммированное) или null если не триггер / тело пустое.
 */
export function matchSteeringTrigger(text: string, botUsername: string): string | null {
  const mention = `@${botUsername}`;
  const mentionIdx = text.toLowerCase().indexOf(mention.toLowerCase());
  if (mentionIdx === -1) return null;

  // Всё что после mention
  const afterMention = text.slice(mentionIdx + mention.length);
  // Снимаем ведущие пробелы и мелкую пунктуацию
  const trimmedStart = afterMention.replace(/^[\s:,.\-—–]+/, "");
  // Первое слово должно быть строго «штурвал» (не «штурвалы», «штурвалить» и т.д.)
  const match = /^штурвал(?=\s|[:,.\-—–]|$)/i.exec(trimmedStart);
  if (!match) return null;

  // Strip separator punctuation that is directly adjacent to «штурвал» (no whitespace
  // between them). Punctuation that follows a space (e.g. "штурвал ,") is body content
  // and must be preserved.
  const raw = trimmedStart.slice(match[0].length);
  const body = raw === "" || /^\s/.test(raw)
    ? raw.trim()
    : raw.replace(/^[:,.\-—–]+/, "").trim();
  if (body.length === 0) return null;
  return body;
}

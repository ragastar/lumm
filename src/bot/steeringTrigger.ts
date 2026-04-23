// src/bot/steeringTrigger.ts

/**
 * Проверяет, является ли сообщение триггером «штурвал».
 * Ожидаемый формат: <mention бота> штурвал <тело>
 * Регистр слова «штурвал» не важен.
 * @returns тело штурвала (триммированное) или null если не триггер / тело пустое.
 */
export function matchSteeringTrigger(text: string, botUsername: string): string | null {
  const mention = `@${botUsername}`;
  const mentionIdx = text.toLowerCase().indexOf(mention.toLowerCase());
  if (mentionIdx === -1) return null;

  // Всё что после mention
  const afterMention = text.slice(mentionIdx + mention.length);
  // Ищем слово «штурвал» (case-insensitive) после mention.
  // Используем (?:^|\s) вместо \b для поддержки кириллицы
  const match = /(?:^|\s)штурвал(?:\s|$)/i.exec(afterMention);
  if (!match) return null;

  const body = afterMention.slice(match.index + match[0].length).trim();
  if (body.length === 0) return null;
  return body;
}

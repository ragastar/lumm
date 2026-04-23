import { describe, it, expect } from "vitest";
import { matchSteeringTrigger } from "../steeringTrigger";

const BOT = "lummbrain_bot";

describe("matchSteeringTrigger", () => {
  it("упоминание + штурвал + тело → возвращает тело", () => {
    expect(matchSteeringTrigger("@lummbrain_bot штурвал есть баг", BOT)).toBe("есть баг");
  });

  it("регистронезависимо", () => {
    expect(matchSteeringTrigger("@lummbrain_bot ШТУРВАЛ важная идея", BOT)).toBe("важная идея");
    expect(matchSteeringTrigger("@lummbrain_bot Штурвал идея", BOT)).toBe("идея");
  });

  it("другой бот — null", () => {
    expect(matchSteeringTrigger("@other_bot штурвал тест", BOT)).toBe(null);
  });

  it("без слова штурвал — null", () => {
    expect(matchSteeringTrigger("@lummbrain_bot отчёт", BOT)).toBe(null);
  });

  it("без упоминания — null", () => {
    expect(matchSteeringTrigger("штурвал без упоминания", BOT)).toBe(null);
  });

  it("пустое тело — null", () => {
    expect(matchSteeringTrigger("@lummbrain_bot штурвал", BOT)).toBe(null);
    expect(matchSteeringTrigger("@lummbrain_bot штурвал   ", BOT)).toBe(null);
  });

  it("тело с переносами строк сохраняется", () => {
    const msg = "@lummbrain_bot штурвал первая строка\nвторая строка";
    expect(matchSteeringTrigger(msg, BOT)).toBe("первая строка\nвторая строка");
  });

  it("порядок: упоминание → штурвал → тело; иначе null", () => {
    expect(matchSteeringTrigger("штурвал @lummbrain_bot тест", BOT)).toBe(null);
  });

  it("пробелы вокруг тела — триммятся", () => {
    expect(matchSteeringTrigger("@lummbrain_bot штурвал    тест   ", BOT)).toBe("тест");
  });
});

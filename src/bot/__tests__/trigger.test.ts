import { describe, it, expect } from "vitest";
import { matchTrigger } from "../trigger";

describe("matchTrigger", () => {
  it("matches mention followed by phrase", () => {
    const r = matchTrigger("@lummbrain_bot Еженедельный отчёт: бизнес провалил, спорт ок");
    expect(r).toBe("бизнес провалил, спорт ок");
  });

  it("matches phrase then mention at end", () => {
    const r = matchTrigger("Еженедельный отчёт: закрыл 3 сделки, 10 км пробежал @lummbrain_bot");
    expect(r).toBe("закрыл 3 сделки, 10 км пробежал");
  });

  it("is case-insensitive", () => {
    expect(matchTrigger("@lummbrain_bot еженедельный Отчет всё норм")).toBe("всё норм");
    expect(matchTrigger("@LUMMBRAIN_BOT ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ текст")).toBe("текст");
  });

  it("accepts both отчёт and отчет", () => {
    expect(matchTrigger("@lummbrain_bot еженедельный отчет текст")).toBe("текст");
    expect(matchTrigger("@lummbrain_bot еженедельный отчёт текст")).toBe("текст");
  });

  it("accepts just отчёт without adjective", () => {
    expect(matchTrigger("@lummbrain_bot Отчёт: закрыл сделки")).toBe("закрыл сделки");
    expect(matchTrigger("@lummbrain_bot отчет — три пробежки")).toBe("три пробежки");
  });

  it("accepts квартальный and другие прилагательные", () => {
    expect(matchTrigger("@lummbrain_bot квартальный отчёт текст")).toBe("текст");
    expect(matchTrigger("@lummbrain_bot ежемесячный отчёт текст")).toBe("текст");
  });

  it("returns null when mention is absent", () => {
    expect(matchTrigger("Еженедельный отчёт: без бота")).toBeNull();
  });

  it("returns null when phrase is absent", () => {
    expect(matchTrigger("@lummbrain_bot напомни мне завтра")).toBeNull();
  });

  it("returns null for empty or unrelated text", () => {
    expect(matchTrigger("")).toBeNull();
    expect(matchTrigger("Привет всем!")).toBeNull();
  });

  it("handles multi-line reports", () => {
    const text = "@lummbrain_bot Еженедельный отчёт\n\nБизнес: всё плохо\nСпорт: лучше";
    expect(matchTrigger(text)).toBe("Бизнес: всё плохо\nСпорт: лучше");
  });

  it("trims leading punctuation and whitespace from body", () => {
    expect(matchTrigger("@lummbrain_bot Еженедельный отчёт   —   текст отчёта")).toBe("текст отчёта");
  });

  it("returns null when body is empty after stripping", () => {
    expect(matchTrigger("@lummbrain_bot Еженедельный отчёт")).toBeNull();
    expect(matchTrigger("@lummbrain_bot Еженедельный отчёт    ")).toBeNull();
  });
});

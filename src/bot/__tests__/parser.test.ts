import { describe, it, expect } from "vitest";
import { parseReport } from "../parser";

describe("parseReport", () => {
  it("parses a full report with scores", () => {
    const text = `#отчет\nБизнес: Закрыл 3 сделки, запустил рекламу\nСемья: Провёл выходные с ребёнком\nЛичное: Начал бегать по утрам\nОценки: Б:8 С:7 Л:6\nПлан: Финализировать КП, встреча с партнёром`;
    const result = parseReport(text);
    expect(result).not.toBeNull();
    expect(result!.businessText).toBe("Закрыл 3 сделки, запустил рекламу");
    expect(result!.familyText).toBe("Провёл выходные с ребёнком");
    expect(result!.personalText).toBe("Начал бегать по утрам");
    expect(result!.scoreBusiness).toBe(8);
    expect(result!.scoreFamily).toBe(7);
    expect(result!.scorePersonal).toBe(6);
    expect(result!.planText).toBe("Финализировать КП, встреча с партнёром");
  });

  it("parses report without scores", () => {
    const text = `#отчет\nБизнес: Провёл переговоры\nСемья: Всё стабильно\nЛичное: Читаю книгу`;
    const result = parseReport(text);
    expect(result).not.toBeNull();
    expect(result!.businessText).toBe("Провёл переговоры");
    expect(result!.scoreBusiness).toBeNull();
  });

  it("returns null for non-report messages", () => {
    expect(parseReport("Привет всем!")).toBeNull();
    expect(parseReport("")).toBeNull();
  });

  it("parses #report tag (english)", () => {
    const text = `#report\nБизнес: Тест\nСемья: Тест\nЛичное: Тест`;
    expect(parseReport(text)).not.toBeNull();
  });

  it("parses scores in slash format", () => {
    const text = `#отчет\nБизнес: Тест\nОценки: 8/7/6`;
    const r = parseReport(text);
    expect(r!.scoreBusiness).toBe(8);
    expect(r!.scoreFamily).toBe(7);
    expect(r!.scorePersonal).toBe(6);
  });

  it("handles multiline category text", () => {
    const text = `#отчет\nБизнес: Закрыл сделку.\nЗапустил рекламу.\nСемья: Всё хорошо\nЛичное: Бегаю`;
    const result = parseReport(text);
    expect(result!.businessText).toBe("Закрыл сделку.\nЗапустил рекламу.");
  });

  it("clamps scores to 1-10 range", () => {
    const text = `#отчет\nБизнес: Тест\nОценки: Б:15 С:0 Л:5`;
    const r = parseReport(text);
    expect(r!.scoreBusiness).toBe(10);
    expect(r!.scoreFamily).toBe(1);
    expect(r!.scorePersonal).toBe(5);
  });
});

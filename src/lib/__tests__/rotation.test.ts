import { describe, it, expect } from "vitest";
import { nextOrganizer, nextThirdThursday, formatDateIso } from "../rotation";

const A = { id: "a", displayName: "Alice" };
const B = { id: "b", displayName: "Bob" };
const C = { id: "c", displayName: "Carol" };
const pool = [A, B, C];

describe("nextOrganizer", () => {
  it("возвращает null для пустого пула", () => {
    expect(nextOrganizer([], null)).toBe(null);
    expect(nextOrganizer([], "a")).toBe(null);
  });

  it("возвращает первого, если lastOrganizerId = null", () => {
    expect(nextOrganizer(pool, null)).toBe("a");
  });

  it("возвращает следующего по кругу", () => {
    expect(nextOrganizer(pool, "a")).toBe("b");
    expect(nextOrganizer(pool, "b")).toBe("c");
    expect(nextOrganizer(pool, "c")).toBe("a");
  });

  it("возвращает первого, если прошлый организатор вне пула", () => {
    expect(nextOrganizer(pool, "zzz")).toBe("a");
  });
});

describe("nextThirdThursday", () => {
  it("апрель 2026: 3-й четверг — 16 апреля", () => {
    // 2026-04-01 — среда. Первый чт — 2 апреля. Второй — 9. Третий — 16.
    const result = nextThirdThursday(new Date(2026, 3, 1));
    expect(formatDateIso(result)).toBe("2026-04-16");
  });

  it("если from = 3-й чт текущего месяца — вернуть его", () => {
    const result = nextThirdThursday(new Date(2026, 3, 16));
    expect(formatDateIso(result)).toBe("2026-04-16");
  });

  it("если from позже 3-го чт месяца — вернуть 3-й чт следующего", () => {
    // 17 апреля — пятница, уже позже 16-го.
    // 3-й чт мая 2026: 1 мая — пт. Первый чт — 7. Второй — 14. Третий — 21.
    const result = nextThirdThursday(new Date(2026, 3, 17));
    expect(formatDateIso(result)).toBe("2026-05-21");
  });

  it("переход через декабрь в январь", () => {
    // 3-й чт дек 2026: 1 дек — вт. Первый чт — 3. Второй — 10. Третий — 17.
    // 18 декабря 2026 — пт. next = 3-й чт января 2027.
    // 2027-01-01 — пт. Первый чт — 7. Третий — 21.
    const result = nextThirdThursday(new Date(2026, 11, 18));
    expect(formatDateIso(result)).toBe("2027-01-21");
  });

  it("високосный год февраль не ломает", () => {
    // 3-й чт февраля 2024: 1 фев — чт. Первый чт — 1. Второй — 8. Третий — 15.
    const result = nextThirdThursday(new Date(2024, 1, 1));
    expect(formatDateIso(result)).toBe("2024-02-15");
  });
});

describe("formatDateIso", () => {
  it("форматирует Date в YYYY-MM-DD (local-time)", () => {
    expect(formatDateIso(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(formatDateIso(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

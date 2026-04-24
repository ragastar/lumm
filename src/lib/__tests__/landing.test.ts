import { describe, it, expect } from "vitest";
import { formatOpenSlots, formatNextWindow } from "../landing";

describe("formatOpenSlots", () => {
  it("возвращает «Мы полны» при 0", () => {
    expect(formatOpenSlots(0)).toBe("Мы полны");
  });

  it("возвращает «Мы полны» при undefined/NaN/отрицательном", () => {
    expect(formatOpenSlots(undefined)).toBe("Мы полны");
    expect(formatOpenSlots(NaN)).toBe("Мы полны");
    expect(formatOpenSlots(-1)).toBe("Мы полны");
  });

  it("плюрализация «место/места/мест»", () => {
    expect(formatOpenSlots(1)).toBe("Свободно 1 место");
    expect(formatOpenSlots(2)).toBe("Свободно 2 места");
    expect(formatOpenSlots(3)).toBe("Свободно 3 места");
    expect(formatOpenSlots(4)).toBe("Свободно 4 места");
    expect(formatOpenSlots(5)).toBe("Свободно 5 мест");
    expect(formatOpenSlots(11)).toBe("Свободно 11 мест");
    expect(formatOpenSlots(21)).toBe("Свободно 21 место");
    expect(formatOpenSlots(22)).toBe("Свободно 22 места");
  });
});

describe("formatNextWindow", () => {
  it("возвращает null при пустой/невалидной дате", () => {
    expect(formatNextWindow(undefined)).toBeNull();
    expect(formatNextWindow("")).toBeNull();
    expect(formatNextWindow("не-дата")).toBeNull();
  });

  it("форматирует ISO-дату по-русски", () => {
    expect(formatNextWindow("2026-09-01")).toBe("1 сентября 2026");
    expect(formatNextWindow("2026-12-31")).toBe("31 декабря 2026");
  });
});

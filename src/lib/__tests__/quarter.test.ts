import { describe, it, expect } from "vitest";
import { isQuarterEnd } from "../quarter";

describe("isQuarterEnd", () => {
  it("true for March/June/September/December (YYYY-MM-01)", () => {
    expect(isQuarterEnd("2026-03-01")).toBe(true);
    expect(isQuarterEnd("2026-06-01")).toBe(true);
    expect(isQuarterEnd("2026-09-01")).toBe(true);
    expect(isQuarterEnd("2026-12-01")).toBe(true);
  });

  it("false for non-quarter months", () => {
    expect(isQuarterEnd("2026-01-01")).toBe(false);
    expect(isQuarterEnd("2026-02-01")).toBe(false);
    expect(isQuarterEnd("2026-04-01")).toBe(false);
    expect(isQuarterEnd("2026-05-01")).toBe(false);
    expect(isQuarterEnd("2026-07-01")).toBe(false);
    expect(isQuarterEnd("2026-08-01")).toBe(false);
    expect(isQuarterEnd("2026-10-01")).toBe(false);
    expect(isQuarterEnd("2026-11-01")).toBe(false);
  });

  it("works for leap year (2024) and non-leap (2026)", () => {
    expect(isQuarterEnd("2024-03-01")).toBe(true);
    expect(isQuarterEnd("2024-02-01")).toBe(false);
  });

  it("returns false for malformed input (no throw)", () => {
    expect(isQuarterEnd("2026-13-01")).toBe(false);
    expect(isQuarterEnd("not-a-date")).toBe(false);
    expect(isQuarterEnd("")).toBe(false);
  });
});

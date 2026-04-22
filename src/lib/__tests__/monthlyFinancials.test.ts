import { describe, it, expect } from "vitest";
import { validateMonthlyFinancialsBody } from "../monthlyFinancials";

describe("validateMonthlyFinancialsBody", () => {
  const valid = {
    month: "2026-04-01",
    revenue: 100000,
    netProfit: 30000,
    capital: null,
    scoreBusiness: 7,
    scoreFamily: 6,
    scorePersonal: 8,
    reportText: "хороший месяц",
    requestText: null,
  };

  it("accepts valid non-quarter body and normalizes capital to null", () => {
    const r = validateMonthlyFinancialsBody(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capital).toBe(null);
  });

  it("forces capital=null in non-quarter month even if provided", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, capital: 50_000_000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capital).toBe(null);
  });

  it("requires capital in quarter months", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, month: "2026-03-01", capital: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/[Кк]апитал/);
  });

  it("accepts capital in quarter months", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, month: "2026-06-01", capital: 5_000_000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capital).toBe(5_000_000);
  });

  it("rejects bad month format", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, month: "2026-04" });
    expect(r.ok).toBe(false);
  });

  it("rejects non-numeric revenue", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, revenue: "100k" as unknown as number });
    expect(r.ok).toBe(false);
  });

  it("rejects score out of 1..10", () => {
    const r1 = validateMonthlyFinancialsBody({ ...valid, scoreBusiness: 0 });
    const r2 = validateMonthlyFinancialsBody({ ...valid, scoreFamily: 11 });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
  });

  it("rejects empty reportText", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, reportText: "   " });
    expect(r.ok).toBe(false);
  });

  it("accepts null requestText and empty-string requestText (coerced to null)", () => {
    const r1 = validateMonthlyFinancialsBody({ ...valid, requestText: null });
    const r2 = validateMonthlyFinancialsBody({ ...valid, requestText: "" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok) expect(r1.value.requestText).toBe(null);
    if (r2.ok) expect(r2.value.requestText).toBe(null);
  });
});

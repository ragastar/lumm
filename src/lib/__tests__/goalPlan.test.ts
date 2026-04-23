import { describe, expect, test } from "vitest";
import { computeSciScore, computeKleinAvg } from "../goalPlan";

describe("computeSciScore", () => {
  test("максимум: intrinsic+identified=9+9, shame+external=1+1 → +16", () => {
    const r = computeSciScore({ sciIntrinsic: 9, sciIdentified: 9, sciShame: 1, sciExternal: 1 });
    expect(r).toBe(16);
  });

  test("минимум: все shame/external=9, intrinsic/identified=1 → −16", () => {
    const r = computeSciScore({ sciIntrinsic: 1, sciIdentified: 1, sciShame: 9, sciExternal: 9 });
    expect(r).toBe(-16);
  });

  test("нейтраль: все 5 → 0", () => {
    const r = computeSciScore({ sciIntrinsic: 5, sciIdentified: 5, sciShame: 5, sciExternal: 5 });
    expect(r).toBe(0);
  });

  test("дефолтное значение: все 5 → 0", () => {
    const r = computeSciScore({ sciIntrinsic: 5, sciIdentified: 5, sciShame: 5, sciExternal: 5 });
    expect(r).toBe(0);
  });
});

describe("computeKleinAvg", () => {
  test("все 1 → 1.0", () => {
    expect(computeKleinAvg({ klein1: 1, klein2: 1, klein3: 1, klein4: 1 })).toBe(1);
  });

  test("все 5 → 5.0", () => {
    expect(computeKleinAvg({ klein1: 5, klein2: 5, klein3: 5, klein4: 5 })).toBe(5);
  });

  test("смешанный: 3+4+4+5 / 4 = 4.0", () => {
    expect(computeKleinAvg({ klein1: 3, klein2: 4, klein3: 4, klein4: 5 })).toBe(4);
  });

  test("округление до 1 знака: 3+3+3+4=13 → 3.3 (не 3.25)", () => {
    expect(computeKleinAvg({ klein1: 3, klein2: 3, klein3: 3, klein4: 4 })).toBe(3.3);
  });
});

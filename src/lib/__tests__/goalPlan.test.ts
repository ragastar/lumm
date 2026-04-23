import { describe, expect, test } from "vitest";
import { computeSciScore, computeKleinAvg, validateGoalPlanPayload } from "../goalPlan";

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

const validBody = {
  wish: "Вывести бизнес на выручку 5 млн ₽/мес к 12-й неделе",
  sphere: "business",
  difficulty: 7,
  metricName: "Выручка",
  metricStart: "2.3 млн ₽",
  metricTarget: "5 млн ₽",
  sciShame: 3,
  sciExternal: 4,
  sciIdentified: 8,
  sciIntrinsic: 7,
  klein1: 4,
  klein2: 5,
  klein3: 4,
  klein4: 5,
  data: { foo: "bar" },
};

describe("validateGoalPlanPayload", () => {
  test("валидный body проходит", () => {
    const r = validateGoalPlanPayload(validBody);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.wish).toBe(validBody.wish);
  });

  test("пустое тело → error", () => {
    expect(validateGoalPlanPayload(null).ok).toBe(false);
    expect(validateGoalPlanPayload("не объект").ok).toBe(false);
  });

  test("wish короче 20 символов → error", () => {
    const r = validateGoalPlanPayload({ ...validBody, wish: "короткий" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/wish/i);
  });

  test("wish длиннее 200 символов → error", () => {
    const longWish = "a".repeat(201);
    const r = validateGoalPlanPayload({ ...validBody, wish: longWish });
    expect(r.ok).toBe(false);
  });

  test("неизвестный sphere → error", () => {
    const r = validateGoalPlanPayload({ ...validBody, sphere: "martial_arts" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/sphere/i);
  });

  test("difficulty вне 1..10 → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, difficulty: 0 }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, difficulty: 11 }).ok).toBe(false);
  });

  test("SCI raw вне 1..9 → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, sciShame: 0 }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, sciIntrinsic: 10 }).ok).toBe(false);
  });

  test("Klein raw вне 1..5 → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, klein1: 0 }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, klein2: 6 }).ok).toBe(false);
  });

  test("metricName допускает null и пустую строку (необязательное поле)", () => {
    expect(validateGoalPlanPayload({ ...validBody, metricName: null, metricStart: null, metricTarget: null }).ok).toBe(true);
    expect(validateGoalPlanPayload({ ...validBody, metricName: "" }).ok).toBe(true);
  });

  test("data обязательно должен быть объектом (можно пустым)", () => {
    expect(validateGoalPlanPayload({ ...validBody, data: {} }).ok).toBe(true);
    expect(validateGoalPlanPayload({ ...validBody, data: "не объект" }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, data: null }).ok).toBe(false);
  });

  test("difficulty NaN / Infinity / float → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, difficulty: NaN }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, difficulty: Infinity }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, difficulty: -Infinity }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, difficulty: 7.5 }).ok).toBe(false);
  });

  test("числовые поля как строка → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, difficulty: "7" }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, sciShame: "3" }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, klein1: "4" }).ok).toBe(false);
  });

  test("data как массив → error (Array.isArray защита)", () => {
    expect(validateGoalPlanPayload({ ...validBody, data: [] }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, data: [1, 2, 3] }).ok).toBe(false);
  });

  test("data: undefined / отсутствует → error", () => {
    const noDataBody = { ...validBody } as Record<string, unknown>;
    delete noDataBody.data;
    expect(validateGoalPlanPayload(noDataBody).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, data: undefined }).ok).toBe(false);
  });
});

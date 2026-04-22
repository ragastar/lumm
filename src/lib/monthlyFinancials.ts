import { isQuarterEnd } from "./quarter";

export type MonthlyFinancialsInput = {
  month: string;
  revenue: number;
  netProfit: number;
  capital: number | null;
  scoreBusiness: number;
  scoreFamily: number;
  scorePersonal: number;
  reportText: string;
  requestText: string | null;
};

export type ValidateResult =
  | { ok: true; value: MonthlyFinancialsInput }
  | { ok: false; error: string };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v >= min && v <= max;
}

export function validateMonthlyFinancialsBody(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Пустое тело запроса" };
  const b = raw as Record<string, unknown>;

  if (typeof b.month !== "string" || !/^\d{4}-\d{2}-01$/.test(b.month)) {
    return { ok: false, error: "month должен быть в формате YYYY-MM-01" };
  }

  if (!isFiniteNumber(b.revenue)) return { ok: false, error: "revenue обязательное число" };
  if (!isFiniteNumber(b.netProfit)) return { ok: false, error: "netProfit обязательное число" };

  if (!isIntInRange(b.scoreBusiness, 1, 10)) return { ok: false, error: "scoreBusiness должен быть 1..10" };
  if (!isIntInRange(b.scoreFamily, 1, 10)) return { ok: false, error: "scoreFamily должен быть 1..10" };
  if (!isIntInRange(b.scorePersonal, 1, 10)) return { ok: false, error: "scorePersonal должен быть 1..10" };

  if (typeof b.reportText !== "string" || b.reportText.trim() === "") {
    return { ok: false, error: "reportText обязательное поле" };
  }

  let requestText: string | null = null;
  if (b.requestText !== null && b.requestText !== undefined && b.requestText !== "") {
    if (typeof b.requestText !== "string") return { ok: false, error: "requestText должен быть строкой" };
    requestText = b.requestText;
  }

  const isQuarter = isQuarterEnd(b.month);
  let capital: number | null;
  if (isQuarter) {
    if (!isFiniteNumber(b.capital)) {
      return { ok: false, error: "Капитал обязателен в квартальный месяц" };
    }
    capital = b.capital;
  } else {
    capital = null;
  }

  return {
    ok: true,
    value: {
      month: b.month,
      revenue: b.revenue,
      netProfit: b.netProfit,
      capital,
      scoreBusiness: b.scoreBusiness,
      scoreFamily: b.scoreFamily,
      scorePersonal: b.scorePersonal,
      reportText: b.reportText,
      requestText,
    },
  };
}

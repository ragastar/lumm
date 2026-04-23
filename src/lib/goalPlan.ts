// src/lib/goalPlan.ts — чистая логика структурной цели.

export const SPHERES = ["business", "health", "skills", "family", "creative", "finance"] as const;
export type Sphere = typeof SPHERES[number];

export const OBSTACLE_TYPES = ["emotion", "habit", "belief", "state"] as const;
export type ObstacleType = typeof OBSTACLE_TYPES[number];

/** Payload, приходящий с клиента (мастер) на POST /api/goal-plans */
export type GoalPlanPayload = {
  wish: string;
  sphere: Sphere;
  difficulty: number;                    // 1..10
  metricName: string | null;
  metricStart: string | null;
  metricTarget: string | null;
  // SCI raw (шкала Sheldon-Elliot, 1..9 каждое поле)
  sciShame: number;
  sciExternal: number;
  sciIdentified: number;
  sciIntrinsic: number;
  // Klein raw (1..5 каждое)
  klein1: number;
  klein2: number;
  klein3: number;
  klein4: number;
  // Всё остальное — свободный JSON, хранится в колонке data
  data: Record<string, unknown>;
};

/** SCI = (intrinsic + identified) − (shame + external) */
export function computeSciScore(raw: {
  sciShame: number;
  sciExternal: number;
  sciIdentified: number;
  sciIntrinsic: number;
}): number {
  return (raw.sciIntrinsic + raw.sciIdentified) - (raw.sciShame + raw.sciExternal);
}

/** Klein среднее, с округлением до 1 знака */
export function computeKleinAvg(raw: {
  klein1: number;
  klein2: number;
  klein3: number;
  klein4: number;
}): number {
  const sum = raw.klein1 + raw.klein2 + raw.klein3 + raw.klein4;
  return Math.round((sum / 4) * 10) / 10;
}

export type ValidateResult =
  | { ok: true; value: GoalPlanPayload }
  | { ok: false; error: string };

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return isInt(v) && v >= min && v <= max;
}

function normalizeStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export function validateGoalPlanPayload(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Пустое или некорректное тело запроса" };
  }
  const b = raw as Record<string, unknown>;

  if (typeof b.wish !== "string") return { ok: false, error: "wish обязателен" };
  const wish = b.wish.trim();
  if (wish.length < 20) return { ok: false, error: "wish слишком короткий (минимум 20 символов)" };
  if (wish.length > 200) return { ok: false, error: "wish слишком длинный (максимум 200 символов)" };

  if (typeof b.sphere !== "string" || !SPHERES.includes(b.sphere as Sphere)) {
    return { ok: false, error: `sphere должен быть один из: ${SPHERES.join(", ")}` };
  }

  if (!isIntInRange(b.difficulty, 1, 10)) {
    return { ok: false, error: "difficulty должен быть целым 1..10" };
  }

  // SCI raw — 1..9 каждое
  for (const k of ["sciShame", "sciExternal", "sciIdentified", "sciIntrinsic"] as const) {
    if (!isIntInRange(b[k], 1, 9)) {
      return { ok: false, error: `${k} должен быть целым 1..9` };
    }
  }

  // Klein raw — 1..5 каждое
  for (const k of ["klein1", "klein2", "klein3", "klein4"] as const) {
    if (!isIntInRange(b[k], 1, 5)) {
      return { ok: false, error: `${k} должен быть целым 1..5` };
    }
  }

  if (!b.data || typeof b.data !== "object" || Array.isArray(b.data)) {
    return { ok: false, error: "data должен быть объектом" };
  }

  return {
    ok: true,
    value: {
      wish,
      sphere: b.sphere as Sphere,
      difficulty: b.difficulty as number,
      metricName: normalizeStringOrNull(b.metricName),
      metricStart: normalizeStringOrNull(b.metricStart),
      metricTarget: normalizeStringOrNull(b.metricTarget),
      sciShame: b.sciShame as number,
      sciExternal: b.sciExternal as number,
      sciIdentified: b.sciIdentified as number,
      sciIntrinsic: b.sciIntrinsic as number,
      klein1: b.klein1 as number,
      klein2: b.klein2 as number,
      klein3: b.klein3 as number,
      klein4: b.klein4 as number,
      data: b.data as Record<string, unknown>,
    },
  };
}

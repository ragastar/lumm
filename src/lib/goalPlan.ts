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

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { computeKleinAvg, computeSciScore, validateGoalPlanPayload } from "@/lib/goalPlan";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = validateGoalPlanPayload(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const existing = await db
    .select({ id: goalPlans.id, locked: goalPlans.locked })
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);

  if (existing.length > 0 && existing[0].locked === 1) {
    return Response.json(
      { error: "Цель зафиксирована на цикл, редактирование запрещено" },
      { status: 409 },
    );
  }

  const v = result.value;
  const now = new Date().toISOString();
  const sciScore = computeSciScore(v);
  const kleinAvg = computeKleinAvg(v);

  const id = existing.length > 0 ? existing[0].id : randomUUID();
  const createdAt = existing.length > 0 ? undefined : now;

  await db
    .insert(goalPlans)
    .values({
      id,
      memberId: user.id,
      wish: v.wish,
      sphere: v.sphere,
      sciScore,
      kleinAvg,
      difficulty: v.difficulty,
      metricName: v.metricName,
      metricStart: v.metricStart,
      metricTarget: v.metricTarget,
      data: JSON.stringify(v.data),
      locked: 0,
      createdAt: createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: goalPlans.memberId,
      set: {
        wish: v.wish,
        sphere: v.sphere,
        sciScore,
        kleinAvg,
        difficulty: v.difficulty,
        metricName: v.metricName,
        metricStart: v.metricStart,
        metricTarget: v.metricTarget,
        data: JSON.stringify(v.data),
        updatedAt: now,
      },
    });

  return Response.json({ id });
}

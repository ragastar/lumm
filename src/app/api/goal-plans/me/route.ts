import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);

  if (rows.length === 0) {
    return Response.json(null);
  }

  const plan = rows[0];
  return Response.json({
    ...plan,
    data: JSON.parse(plan.data),
  });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  await db.delete(goalPlans).where(eq(goalPlans.memberId, user.id));
  return Response.json({ ok: true });
}

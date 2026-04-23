import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const { memberId } = await params;

  const memberRow = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, user.groupId)))
    .limit(1);

  if (memberRow.length === 0) {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(goalPlans)
    .where(eq(goalPlans.memberId, memberId))
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

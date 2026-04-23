import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: feedbackItems.id,
      text: feedbackItems.text,
      status: feedbackItems.status,
      createdAt: feedbackItems.createdAt,
      updatedAt: feedbackItems.updatedAt,
    })
    .from(feedbackItems)
    .where(eq(feedbackItems.memberId, user.id))
    .orderBy(desc(feedbackItems.createdAt));

  return Response.json(rows);
}

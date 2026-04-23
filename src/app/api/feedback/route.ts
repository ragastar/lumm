import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackItems, members } from "@/db/schema";
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
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
    })
    .from(feedbackItems)
    .innerJoin(members, eq(members.id, feedbackItems.memberId))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(feedbackItems.createdAt));

  return Response.json(rows);
}

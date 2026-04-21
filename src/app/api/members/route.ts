import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(asc(members.displayName));

  return Response.json(rows);
}

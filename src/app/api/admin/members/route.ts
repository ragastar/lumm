import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: members.id,
      username: members.username,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(eq(members.groupId, user.groupId));

  return Response.json(rows);
}

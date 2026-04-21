import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

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
    .where(and(eq(members.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0 || rows[0].status !== "active") {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }

  return Response.json(rows[0]);
}

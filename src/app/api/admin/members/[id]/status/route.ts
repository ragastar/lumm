import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await params;

  let body: { status?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (body.status !== "active" && body.status !== "inactive") {
    return Response.json({ error: "Неверный статус" }, { status: 400 });
  }

  if (id === user.id) {
    return Response.json({ error: "Нельзя деактивировать себя" }, { status: 400 });
  }

  const result = await db
    .update(members)
    .set({ status: body.status })
    .where(and(eq(members.id, id), eq(members.groupId, user.groupId)))
    .returning({ id: members.id });

  if (result.length === 0) {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }

  return Response.json({ ok: true });
}

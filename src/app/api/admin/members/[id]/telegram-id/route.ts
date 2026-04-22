import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

const TG_ID_REGEX = /^\d{1,15}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await params;

  let body: { telegramId?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const raw = body.telegramId;
  let telegramId: string | null;
  if (raw === null || raw === undefined || raw === "") {
    telegramId = null;
  } else if (typeof raw === "string" && TG_ID_REGEX.test(raw)) {
    telegramId = raw;
  } else {
    return Response.json({ error: "telegramId должен быть числом или null" }, { status: 400 });
  }

  const target = await db
    .select({ id: members.id, groupId: members.groupId })
    .from(members)
    .where(eq(members.id, id))
    .limit(1);

  if (target.length === 0) {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }
  if (target[0].groupId !== user.groupId) {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  if (telegramId !== null) {
    const clash = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.telegramId, telegramId), ne(members.id, id)))
      .limit(1);
    if (clash.length > 0) {
      return Response.json({ error: "Этот Telegram ID уже привязан к другому участнику" }, { status: 409 });
    }
  }

  await db.update(members).set({ telegramId }).where(eq(members.id, id));

  return Response.json({ ok: true });
}

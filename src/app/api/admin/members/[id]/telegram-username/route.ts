import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

// Telegram username: 5-32 символа, буквы/цифры/подчёркивания, начинается с буквы.
// См. https://core.telegram.org/method/account.checkUsername
const TG_USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await params;

  let body: { telegramUsername?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const raw = body.telegramUsername;
  let telegramUsername: string | null;
  if (raw === null || raw === undefined || raw === "") {
    telegramUsername = null;
  } else if (typeof raw === "string") {
    // Удаляем ведущий @, если пользователь вставил с ним
    const cleaned = raw.trim().replace(/^@/, "");
    if (!TG_USERNAME_REGEX.test(cleaned)) {
      return Response.json(
        { error: "telegramUsername: 5-32 символа, буквы/цифры/_, начинается с буквы" },
        { status: 400 },
      );
    }
    telegramUsername = cleaned;
  } else {
    return Response.json({ error: "telegramUsername должен быть строкой или null" }, { status: 400 });
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

  if (telegramUsername !== null) {
    const clash = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.telegramUsername, telegramUsername), ne(members.id, id)))
      .limit(1);
    if (clash.length > 0) {
      return Response.json(
        { error: "Этот @username уже привязан к другому участнику" },
        { status: 409 },
      );
    }
  }

  await db.update(members).set({ telegramUsername }).where(eq(members.id, id));

  return Response.json({ ok: true });
}

import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyTelegramLogin } from "@/lib/telegram";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const data = await request.json();

  if (!verifyTelegramLogin(data)) {
    return Response.json({ error: "Невалидные данные Telegram" }, { status: 401 });
  }

  const telegramId = String(data.id);

  const existing = await db
    .select()
    .from(members)
    .where(eq(members.telegramId, telegramId))
    .limit(1);

  if (existing.length > 0 && existing[0].id !== user.id) {
    return Response.json({ error: "Этот Telegram уже привязан к другому аккаунту" }, { status: 409 });
  }

  await db
    .update(members)
    .set({ telegramId })
    .where(eq(members.id, user.id));

  return Response.json({ ok: true });
}

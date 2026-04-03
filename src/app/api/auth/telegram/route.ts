import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signJWT } from "@/lib/jwt";
import { verifyTelegramLogin } from "@/lib/telegram";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const data = await request.json();

  if (!verifyTelegramLogin(data)) {
    return Response.json({ error: "Невалидные данные Telegram" }, { status: 401 });
  }

  const telegramId = String(data.id);

  const result = await db
    .select()
    .from(members)
    .where(eq(members.telegramId, telegramId))
    .limit(1);

  if (result.length === 0) {
    return Response.json({ error: "Пользователь не найден", telegramId }, { status: 404 });
  }

  const member = result[0];

  if (member.status !== "active") {
    return Response.json({ error: "Аккаунт деактивирован" }, { status: 403 });
  }

  const token = await signJWT({ sub: member.id, role: member.role, groupId: member.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ ok: true, member: { id: member.id, displayName: member.displayName, role: member.role } });
}

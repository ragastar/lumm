import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: "Оба пароля обязательны" }, { status: 400 });
  }

  if (body.newPassword.length < 6) {
    return Response.json({ error: "Пароль должен быть минимум 6 символов" }, { status: 400 });
  }

  if (!user.passwordHash) {
    return Response.json({ error: "У вашего аккаунта нет пароля" }, { status: 400 });
  }

  if (!bcrypt.compareSync(body.currentPassword, user.passwordHash)) {
    return Response.json({ error: "Текущий пароль неверный" }, { status: 401 });
  }

  const passwordHash = bcrypt.hashSync(body.newPassword, 10);

  await db.update(members).set({ passwordHash }).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}

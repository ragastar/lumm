import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: { displayName?: string; avatarColor?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const updates: { displayName?: string; avatarColor?: string } = {};

  if (body.displayName !== undefined) {
    const trimmed = body.displayName.trim();
    if (trimmed.length < 2) {
      return Response.json({ error: "Никнейм должен быть минимум 2 символа" }, { status: 400 });
    }
    updates.displayName = trimmed;
  }

  if (body.avatarColor !== undefined) {
    if (!HEX_COLOR.test(body.avatarColor)) {
      return Response.json({ error: "Неверный цвет" }, { status: 400 });
    }
    updates.avatarColor = body.avatarColor;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  await db.update(members).set(updates).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}

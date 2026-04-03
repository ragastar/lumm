import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { displayName, avatarColor } = await request.json();

  if (!displayName || displayName.trim().length < 2) {
    return Response.json({ error: "Имя должно быть минимум 2 символа" }, { status: 400 });
  }

  await db
    .update(members)
    .set({
      displayName: displayName.trim(),
      ...(avatarColor ? { avatarColor } : {}),
    })
    .where(eq(members.id, user.id));

  return Response.json({ ok: true });
}

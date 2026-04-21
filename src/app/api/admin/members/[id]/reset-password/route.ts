import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

function generatePassword(): string {
  // 12 symbols, alphanumeric, no visually confusing chars
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await params;

  const target = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (target.length === 0) {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }

  if (!target[0].username) {
    return Response.json({ error: "У участника нет логина" }, { status: 400 });
  }

  const newPassword = generatePassword();
  const passwordHash = bcrypt.hashSync(newPassword, 10);

  await db
    .update(members)
    .set({ passwordHash })
    .where(eq(members.id, id));

  return Response.json({ ok: true, password: newPassword });
}

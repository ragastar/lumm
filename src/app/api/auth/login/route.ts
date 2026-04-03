import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return Response.json({ error: "Логин и пароль обязательны" }, { status: 400 });
  }

  const result = await db
    .select()
    .from(members)
    .where(eq(members.username, username))
    .limit(1);

  if (result.length === 0) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const member = result[0];

  if (!member.passwordHash || !bcrypt.compareSync(password, member.passwordHash)) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

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

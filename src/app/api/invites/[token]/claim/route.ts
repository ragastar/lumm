import { db } from "@/db";
import { invites, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const inviteResult = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (inviteResult.length === 0) {
    return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
  }

  const invite = inviteResult[0];

  if (invite.usedCount >= invite.maxUses) {
    return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: "Приглашение истекло" }, { status: 410 });
  }

  const body = await request.json();
  const { username, password } = body;

  if (!username || !password || password.length < 6) {
    return Response.json({ error: "Логин и пароль (мин. 6 символов) обязательны" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(members)
    .where(eq(members.username, username))
    .limit(1);

  if (existing.length > 0) {
    return Response.json({ error: "Этот логин уже занят" }, { status: 409 });
  }

  const memberId = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  await db.insert(members).values({
    id: memberId,
    groupId: invite.groupId,
    username,
    passwordHash,
    displayName: username,
    role: "member",
    status: "active",
    avatarColor: "#c9a84c",
    createdAt: now,
  });

  await db
    .update(invites)
    .set({ usedBy: memberId, usedAt: now, usedCount: invite.usedCount + 1 })
    .where(eq(invites.id, invite.id));

  const jwtToken = await signJWT({ sub: memberId, role: "member", groupId: invite.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", jwtToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ ok: true, memberId, needsOnboarding: true }, { status: 201 });
}

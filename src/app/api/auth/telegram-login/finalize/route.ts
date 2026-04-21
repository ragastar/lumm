import { getNonce, deleteNonce } from "@/lib/nonces";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signJWT } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  let body: { nonce?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (!body.nonce) {
    return Response.json({ error: "nonce обязателен" }, { status: 400 });
  }

  const row = await getNonce(body.nonce);

  if (!row) {
    return Response.json({ error: "Nonce не найден" }, { status: 404 });
  }

  if (row.status === "expired") {
    await deleteNonce(body.nonce);
    return Response.json({ error: "Таймаут, попробуйте снова" }, { status: 410 });
  }

  if (row.status !== "confirmed" || !row.memberId) {
    return Response.json({ error: "Ещё не подтверждено" }, { status: 425 });
  }

  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.id, row.memberId))
    .limit(1);

  if (memberRows.length === 0) {
    return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const member = memberRows[0];

  const jwt = await signJWT({ sub: member.id, role: member.role, groupId: member.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", jwt, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  await deleteNonce(body.nonce);

  const needsOnboarding = row.purpose === "invite";

  return Response.json({ ok: true, needsOnboarding });
}

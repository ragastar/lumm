import { createNonce } from "@/lib/nonces";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  let body: { purpose?: string; inviteToken?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const purpose = body.purpose;
  if (purpose !== "login" && purpose !== "invite") {
    return Response.json({ error: "Неверный purpose" }, { status: 400 });
  }

  let inviteToken: string | null = null;
  if (purpose === "invite") {
    if (!body.inviteToken) {
      return Response.json({ error: "inviteToken обязателен" }, { status: 400 });
    }
    inviteToken = body.inviteToken;

    const rows = await db
      .select()
      .from(invites)
      .where(eq(invites.token, inviteToken))
      .limit(1);

    if (rows.length === 0) {
      return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
    }
    const invite = rows[0];
    if (invite.usedCount >= invite.maxUses) {
      return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return Response.json({ error: "Приглашение истекло" }, { status: 410 });
    }
  }

  const { nonce, expiresAt } = await createNonce(purpose, inviteToken);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return Response.json({ error: "Бот не настроен" }, { status: 500 });
  }

  const url = `https://t.me/${botUsername}?start=${nonce}`;

  return Response.json({ nonce, url, expiresAt });
}

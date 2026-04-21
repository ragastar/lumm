import { db } from "@/db";
import { invites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (result.length === 0) {
    return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
  }

  const invite = result[0];

  if (invite.usedCount >= invite.maxUses) {
    return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: "Приглашение истекло" }, { status: 410 });
  }

  return Response.json({
    valid: true,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    usedCount: invite.usedCount,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { token } = await params;

  const result = await db
    .delete(invites)
    .where(and(eq(invites.token, token), eq(invites.groupId, user.groupId)))
    .returning({ id: invites.id });

  if (result.length === 0) {
    return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
  }

  return Response.json({ ok: true });
}

import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  if (invite.usedBy) {
    return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: "Приглашение истекло" }, { status: 410 });
  }

  return Response.json({ valid: true, expiresAt: invite.expiresAt });
}

import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { randomUUID } from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const allInvites = await db
    .select({
      id: invites.id,
      token: invites.token,
      expiresAt: invites.expiresAt,
      maxUses: invites.maxUses,
      usedCount: invites.usedCount,
      usedBy: invites.usedBy,
      usedAt: invites.usedAt,
      createdBy: invites.createdBy,
    })
    .from(invites)
    .where(eq(invites.groupId, user.groupId))
    .orderBy(desc(invites.expiresAt));

  return Response.json(allInvites);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  let maxUses = 1;
  try {
    const body = await request.json();
    if (typeof body.maxUses === "number" && body.maxUses >= 1 && body.maxUses <= 100) {
      maxUses = Math.floor(body.maxUses);
    }
  } catch {
    // No body or invalid JSON — use default
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(invites).values({
    id: randomUUID(),
    groupId: user.groupId,
    token,
    createdBy: user.id,
    expiresAt,
    maxUses,
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://lumm.space"}/invite/${token}`;

  return Response.json({ token, url: inviteUrl, expiresAt, maxUses, usedCount: 0 }, { status: 201 });
}

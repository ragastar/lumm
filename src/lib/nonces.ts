import { db } from "@/db";
import { loginNonces } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { randomBytes } from "crypto";

export const NONCE_TTL_MS = 5 * 60 * 1000;

export type NoncePurpose = "login" | "invite";

export function generateNonce(): string {
  return "tg_" + randomBytes(12).toString("hex");
}

export async function createNonce(
  purpose: NoncePurpose,
  inviteToken: string | null = null,
): Promise<{ nonce: string; expiresAt: string }> {
  const nonce = generateNonce();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS).toISOString();

  await db.insert(loginNonces).values({
    nonce,
    purpose,
    inviteToken,
    status: "pending",
    expiresAt,
    createdAt: now.toISOString(),
  });

  return { nonce, expiresAt };
}

export async function getNonce(nonce: string) {
  const rows = await db
    .select()
    .from(loginNonces)
    .where(eq(loginNonces.nonce, nonce))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  if (new Date(row.expiresAt) < new Date()) {
    return { ...row, status: "expired" as const };
  }

  return row;
}

export async function confirmNonce(
  nonce: string,
  memberId: string,
  telegramId: string,
): Promise<boolean> {
  const result = await db
    .update(loginNonces)
    .set({ status: "confirmed", memberId, telegramId })
    .where(eq(loginNonces.nonce, nonce))
    .returning({ nonce: loginNonces.nonce });

  return result.length > 0;
}

export async function deleteNonce(nonce: string): Promise<void> {
  await db.delete(loginNonces).where(eq(loginNonces.nonce, nonce));
}

export async function cleanupExpiredNonces(): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.delete(loginNonces).where(lt(loginNonces.expiresAt, nowIso));
}

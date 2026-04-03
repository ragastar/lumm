import { cookies } from "next/headers";
import { verifyJWT, type JWTPayload } from "./jwt";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lumm_token")?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const member = await db
    .select()
    .from(members)
    .where(eq(members.id, payload.sub))
    .limit(1);

  if (member.length === 0) return null;
  if (member[0].status !== "active") return null;

  return member[0];
}

export async function getCurrentMemberId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

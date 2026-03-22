import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMemberId } from "@/lib/session";

export async function GET() {
  const memberId = await getCurrentMemberId();

  if (memberId) {
    const member = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId));

    if (member.length > 0) {
      return Response.json(member[0]);
    }
  }

  // No cookie or member not found — return first member as default
  const firstMember = await db.select().from(members).limit(1);

  if (firstMember.length === 0) {
    return Response.json({ error: "No members found" }, { status: 404 });
  }

  return Response.json(firstMember[0]);
}

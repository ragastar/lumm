import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await db.select().from(members).where(eq(members.id, id));

  if (member.length === 0) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  return Response.json(member[0]);
}

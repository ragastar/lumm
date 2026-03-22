import { db } from "@/db";
import { members } from "@/db/schema";

export async function GET() {
  const allMembers = await db.select().from(members);
  return Response.json(allMembers);
}

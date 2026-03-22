import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const allMeetings = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      organizerId: meetings.organizerId,
      location: meetings.location,
      status: meetings.status,
      createdAt: meetings.createdAt,
      organizerDisplayName: members.displayName,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .orderBy(desc(meetings.date));

  return Response.json(allMeetings);
}

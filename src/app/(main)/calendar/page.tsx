// src/app/(main)/calendar/page.tsx
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const all = await db
    .select({
      id: meetings.id,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      organizerId: meetings.organizerId,
      location: meetings.location,
      price: meetings.price,
      title: meetings.title,
      description: meetings.description,
      status: meetings.status,
      kind: meetings.kind,
      organizerDisplayName: members.displayName,
      attendeesCount: sql<number>`(
        SELECT COUNT(*) FROM ${meetingAttendees}
        WHERE ${meetingAttendees.meetingId} = ${meetings.id}
      )`.as("attendeesCount"),
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.groupId, user.groupId))
    .orderBy(desc(meetings.date));

  const pool = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(members.createdAt);

  return <CalendarClient meetings={all} pool={pool} activeMembersCount={pool.length} />;
}

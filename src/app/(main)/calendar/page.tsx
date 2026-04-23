// src/app/(main)/calendar/page.tsx
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
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
      status: meetings.status,
      kind: meetings.kind,
      organizerDisplayName: members.displayName,
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

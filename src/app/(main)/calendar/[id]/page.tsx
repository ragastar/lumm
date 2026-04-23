// src/app/(main)/calendar/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { MeetingDetailClient } from "./MeetingDetailClient";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
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
      organizerAvatarColor: members.avatarColor,
      organizerAvatarUrl: members.avatarUrl,
      organizerTelegramUsername: members.telegramUsername,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.id, id))
    .limit(1);

  if (rows.length === 0 || rows[0].groupId !== user.groupId) notFound();
  const m = rows[0];

  // attendees (для ad_hoc) — те, кто нажал «Записаться»
  const attendees = await db
    .select({
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      telegramUsername: members.telegramUsername,
    })
    .from(meetingAttendees)
    .innerJoin(members, eq(members.id, meetingAttendees.memberId))
    .where(eq(meetingAttendees.meetingId, id))
    .orderBy(meetingAttendees.createdAt);

  // active members группы — для standard (все приглашены) и для расчёта per-person
  const activeMembers = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      telegramUsername: members.telegramUsername,
    })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(members.createdAt);

  return (
    <MeetingDetailClient
      meeting={{
        id: m.id,
        date: m.date,
        timeStart: m.timeStart,
        timeEnd: m.timeEnd,
        organizerId: m.organizerId,
        location: m.location,
        price: m.price,
        title: m.title,
        description: m.description,
        status: m.status,
        kind: m.kind,
      }}
      organizer={
        m.organizerId
          ? {
              id: m.organizerId,
              displayName: m.organizerDisplayName,
              avatarColor: m.organizerAvatarColor,
              avatarUrl: m.organizerAvatarUrl,
              telegramUsername: m.organizerTelegramUsername,
            }
          : null
      }
      attendees={attendees}
      activeMembers={activeMembers}
      currentUserId={user.id}
    />
  );
}

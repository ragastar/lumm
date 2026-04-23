import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { nextOrganizer, nextThirdThursday, formatDateIso, type PoolMember } from "./rotation";

export type EnsureResult =
  | { created: false }
  | { created: true; meetingId: string; organizerId: string | null; date: string };

export async function ensureNextMeeting(groupId: string): Promise<EnsureResult> {
  const today = formatDateIso(new Date());

  const upcoming = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.groupId, groupId),
        eq(meetings.kind, "standard"),
        eq(meetings.status, "scheduled"),
        gte(meetings.date, today),
      ),
    )
    .limit(1);

  if (upcoming.length > 0) return { created: false };

  const poolRows = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.groupId, groupId), eq(members.status, "active")))
    .orderBy(members.createdAt);

  const pool: PoolMember[] = poolRows;

  const lastStandard = await db
    .select({ organizerId: meetings.organizerId })
    .from(meetings)
    .where(and(eq(meetings.groupId, groupId), eq(meetings.kind, "standard")))
    .orderBy(desc(meetings.date))
    .limit(1);

  const lastOrganizerId = lastStandard[0]?.organizerId ?? null;
  const organizerId = nextOrganizer(pool, lastOrganizerId);

  const date = formatDateIso(nextThirdThursday(new Date()));
  const meetingId = randomUUID();
  const now = new Date().toISOString();

  await db.insert(meetings).values({
    id: meetingId,
    groupId,
    date,
    organizerId,
    location: null,
    status: "scheduled",
    kind: "standard",
    createdAt: now,
  });

  return { created: true, meetingId, organizerId, date };
}

export async function findMeetingInNDays(
  groupId: string,
  days: number,
): Promise<{ id: string; date: string; organizerId: string | null } | null> {
  const target = new Date();
  target.setDate(target.getDate() + days);
  const targetIso = formatDateIso(target);

  const rows = await db
    .select({ id: meetings.id, date: meetings.date, organizerId: meetings.organizerId })
    .from(meetings)
    .where(
      and(
        eq(meetings.groupId, groupId),
        eq(meetings.kind, "standard"),
        eq(meetings.status, "scheduled"),
        eq(meetings.date, targetIso),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

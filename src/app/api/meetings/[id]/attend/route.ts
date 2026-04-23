// src/app/api/meetings/[id]/attend/route.ts
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, meetingAttendees } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

async function loadAndCheck(meetingId: string, groupId: string) {
  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      kind: meetings.kind,
      status: meetings.status,
    })
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (rows.length === 0 || rows[0].groupId !== groupId) {
    return { error: { message: "Встреча не найдена", status: 404 } as const };
  }
  if (rows[0].kind !== "ad_hoc") {
    return { error: { message: "RSVP доступен только для доп. встреч", status: 400 } as const };
  }
  if (rows[0].status !== "scheduled") {
    return { error: { message: "Встреча не активна", status: 400 } as const };
  }
  return { ok: true as const };
}

async function countAttendees(meetingId: string): Promise<number> {
  const rows = await db
    .select({ id: meetingAttendees.id })
    .from(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, meetingId));
  return rows.length;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check && check.error) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  try {
    await db.insert(meetingAttendees).values({
      id: randomUUID(),
      meetingId: id,
      memberId: user.id,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // UNIQUE violation — юзер уже записан, идемпотентно продолжаем
    const message = err instanceof Error ? err.message : String(err);
    if (!/UNIQUE/i.test(message)) throw err;
  }

  const attendeesCount = await countAttendees(id);
  return Response.json({ ok: true, attendeesCount }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check && check.error) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  await db
    .delete(meetingAttendees)
    .where(and(eq(meetingAttendees.meetingId, id), eq(meetingAttendees.memberId, user.id)));

  const attendeesCount = await countAttendees(id);
  return Response.json({ ok: true, attendeesCount }, { status: 200 });
}

// src/app/api/meetings/[id]/route.ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { announceMeeting } from "@/lib/meetingAnnouncements";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ALLOWED_KIND = new Set(["standard", "ad_hoc"]);
const ALLOWED_STATUS = new Set(["scheduled", "completed", "cancelled"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }
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
      createdAt: meetings.createdAt,
      organizerDisplayName: members.displayName,
      organizerAvatarColor: members.avatarColor,
      organizerAvatarUrl: members.avatarUrl,
      organizerTelegramUsername: members.telegramUsername,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.id, id))
    .limit(1);

  if (rows.length === 0 || rows[0].groupId !== user.groupId) {
    return Response.json({ error: "Встреча не найдена" }, { status: 404 });
  }
  const m = rows[0];

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

  return Response.json({
    id: m.id,
    date: m.date,
    timeStart: m.timeStart,
    timeEnd: m.timeEnd,
    location: m.location,
    price: m.price,
    title: m.title,
    description: m.description,
    status: m.status,
    kind: m.kind,
    createdAt: m.createdAt,
    organizer: m.organizerId
      ? {
          id: m.organizerId,
          displayName: m.organizerDisplayName,
          avatarColor: m.organizerAvatarColor,
          avatarUrl: m.organizerAvatarUrl,
          telegramUsername: m.organizerTelegramUsername,
        }
      : null,
    attendees,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db
    .select({ id: meetings.id, groupId: meetings.groupId })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  if (existing.length === 0 || existing[0].groupId !== user.groupId) {
    return Response.json({ error: "Встреча не найдена" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.date !== undefined) {
    if (typeof body.date !== "string" || !ISO_DATE.test(body.date)) {
      return Response.json({ error: "date должен быть в формате YYYY-MM-DD" }, { status: 400 });
    }
    update.date = body.date;
  }

  if (body.kind !== undefined) {
    if (typeof body.kind !== "string" || !ALLOWED_KIND.has(body.kind)) {
      return Response.json({ error: "kind должен быть standard или ad_hoc" }, { status: 400 });
    }
    update.kind = body.kind;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUS.has(body.status)) {
      return Response.json(
        { error: "status должен быть scheduled, completed или cancelled" },
        { status: 400 },
      );
    }
    update.status = body.status;
  }

  if (body.timeStart !== undefined) {
    if (typeof body.timeStart !== "string" || !TIME_HHMM.test(body.timeStart)) {
      return Response.json({ error: "timeStart должен быть в формате HH:MM" }, { status: 400 });
    }
    update.timeStart = body.timeStart;
  }

  if (body.timeEnd !== undefined) {
    if (typeof body.timeEnd !== "string" || !TIME_HHMM.test(body.timeEnd)) {
      return Response.json({ error: "timeEnd должен быть в формате HH:MM" }, { status: 400 });
    }
    update.timeEnd = body.timeEnd;
  }

  if (typeof update.timeStart === "string" && typeof update.timeEnd === "string") {
    if (update.timeStart >= update.timeEnd) {
      return Response.json(
        { error: "Время окончания должно быть позже времени начала" },
        { status: 400 },
      );
    }
  }

  if (body.location !== undefined) {
    if (typeof body.location !== "string" || body.location.trim() === "") {
      return Response.json({ error: "Адрес обязательный" }, { status: 400 });
    }
    update.location = body.location.trim();
  }

  if (body.price !== undefined) {
    if (body.price === null || body.price === "") {
      update.price = null;
    } else if (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0) {
      update.price = body.price;
    } else {
      return Response.json({ error: "Цена должна быть неотрицательным числом или null" }, { status: 400 });
    }
  }

  if (body.title !== undefined) {
    if (body.title === null || body.title === "") {
      update.title = null;
    } else if (typeof body.title === "string") {
      const trimmed = body.title.trim();
      update.title = trimmed === "" ? null : trimmed;
    } else {
      return Response.json({ error: "title должен быть строкой или null" }, { status: 400 });
    }
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") {
      update.description = null;
    } else if (typeof body.description === "string") {
      const trimmed = body.description.trim();
      update.description = trimmed === "" ? null : trimmed;
    } else {
      return Response.json({ error: "description должен быть строкой или null" }, { status: 400 });
    }
  }

  if (body.organizerId !== undefined) {
    if (body.organizerId === null) {
      update.organizerId = null;
    } else if (typeof body.organizerId === "string") {
      const member = await db
        .select({ id: members.id, groupId: members.groupId, status: members.status })
        .from(members)
        .where(eq(members.id, body.organizerId))
        .limit(1);
      if (
        member.length === 0 ||
        member[0].groupId !== user.groupId ||
        member[0].status !== "active"
      ) {
        return Response.json({ error: "Организатор должен быть активным участником вашей группы" }, { status: 400 });
      }
      update.organizerId = body.organizerId;
    } else {
      return Response.json({ error: "organizerId должен быть строкой или null" }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  // Определяем был ли переход в cancelled до коммита обновления
  const wasScheduled = (await db
    .select({ status: meetings.status })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1))[0]?.status === "scheduled";

  await db.update(meetings).set(update).where(eq(meetings.id, id));

  if (wasScheduled && update.status === "cancelled") {
    try {
      await announceMeeting(id, "cancelled");
    } catch (err) {
      console.error("[PATCH meeting] announceMeeting cancelled failed:", err);
    }
  }

  const [saved] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  return Response.json(saved, { status: 200 });
}

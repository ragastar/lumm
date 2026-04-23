// src/app/api/meetings/route.ts
import { randomUUID } from "crypto";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { announceMeeting } from "@/lib/meetingAnnouncements";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ALLOWED_KIND = new Set(["standard", "ad_hoc"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

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
      status: meetings.status,
      kind: meetings.kind,
      createdAt: meetings.createdAt,
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

  return Response.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  if (typeof body.date !== "string" || !ISO_DATE.test(body.date)) {
    return Response.json({ error: "date должен быть в формате YYYY-MM-DD" }, { status: 400 });
  }

  if (typeof body.timeStart !== "string" || !TIME_HHMM.test(body.timeStart)) {
    return Response.json({ error: "timeStart должен быть в формате HH:MM" }, { status: 400 });
  }

  if (typeof body.timeEnd !== "string" || !TIME_HHMM.test(body.timeEnd)) {
    return Response.json({ error: "timeEnd должен быть в формате HH:MM" }, { status: 400 });
  }

  if (body.timeStart >= body.timeEnd) {
    return Response.json(
      { error: "Время окончания должно быть позже времени начала" },
      { status: 400 },
    );
  }

  if (typeof body.location !== "string" || body.location.trim() === "") {
    return Response.json({ error: "Адрес обязательный" }, { status: 400 });
  }
  const location = body.location.trim();

  let price: number | null = null;
  if (body.price !== null && body.price !== undefined && body.price !== "") {
    if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) {
      return Response.json({ error: "Цена должна быть неотрицательным числом" }, { status: 400 });
    }
    price = body.price;
  }

  const kind = body.kind ?? "standard";
  if (typeof kind !== "string" || !ALLOWED_KIND.has(kind)) {
    return Response.json({ error: "kind должен быть standard или ad_hoc" }, { status: 400 });
  }

  let organizerId: string | null = null;
  if (body.organizerId !== null && body.organizerId !== undefined) {
    if (typeof body.organizerId !== "string") {
      return Response.json({ error: "organizerId должен быть строкой или null" }, { status: 400 });
    }
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
    organizerId = body.organizerId;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(meetings).values({
    id,
    groupId: user.groupId,
    date: body.date,
    timeStart: body.timeStart,
    timeEnd: body.timeEnd,
    organizerId,
    location,
    price,
    status: "scheduled",
    kind: kind as "standard" | "ad_hoc",
    createdAt: now,
  });

  // Для ad_hoc — организатор автоматически записан
  if (kind === "ad_hoc" && organizerId) {
    try {
      await db.insert(meetingAttendees).values({
        id: randomUUID(),
        meetingId: id,
        memberId: organizerId,
        createdAt: now,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/UNIQUE/i.test(message)) throw err;
    }
  }

  // Анонс в групповой чат
  try {
    await announceMeeting(id, "created");
  } catch (err) {
    console.error("[POST meetings] announceMeeting failed:", err);
  }

  return Response.json(
    {
      id,
      groupId: user.groupId,
      date: body.date,
      timeStart: body.timeStart,
      timeEnd: body.timeEnd,
      organizerId,
      location,
      price,
      status: "scheduled",
      kind,
      createdAt: now,
    },
    { status: 201 },
  );
}

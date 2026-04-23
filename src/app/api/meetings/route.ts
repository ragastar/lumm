// src/app/api/meetings/route.ts
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
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
      organizerId: meetings.organizerId,
      location: meetings.location,
      status: meetings.status,
      kind: meetings.kind,
      createdAt: meetings.createdAt,
      organizerDisplayName: members.displayName,
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

  const location =
    body.location === null || body.location === undefined || body.location === ""
      ? null
      : typeof body.location === "string"
        ? body.location
        : null;

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(meetings).values({
    id,
    groupId: user.groupId,
    date: body.date,
    organizerId,
    location,
    status: "scheduled",
    kind: kind as "standard" | "ad_hoc",
    createdAt: now,
  });

  return Response.json(
    {
      id,
      groupId: user.groupId,
      date: body.date,
      organizerId,
      location,
      status: "scheduled",
      kind,
      createdAt: now,
    },
    { status: 201 },
  );
}

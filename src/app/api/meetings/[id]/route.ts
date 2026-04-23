// src/app/api/meetings/[id]/route.ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_KIND = new Set(["standard", "ad_hoc"]);
const ALLOWED_STATUS = new Set(["scheduled", "completed", "cancelled"]);

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

  if (body.location !== undefined) {
    if (body.location === null || body.location === "") {
      update.location = null;
    } else if (typeof body.location === "string") {
      update.location = body.location;
    } else {
      return Response.json({ error: "location должен быть строкой или null" }, { status: 400 });
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

  await db.update(meetings).set(update).where(eq(meetings.id, id));

  const [saved] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  return Response.json(saved, { status: 200 });
}

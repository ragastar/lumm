import { eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackItems, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const ALLOWED_STATUS = new Set(["new", "in_progress", "done", "rejected"]);

async function loadAndCheck(itemId: string, groupId: string) {
  const rows = await db
    .select({
      id: feedbackItems.id,
      memberGroupId: members.groupId,
    })
    .from(feedbackItems)
    .innerJoin(members, eq(members.id, feedbackItems.memberId))
    .where(eq(feedbackItems.id, itemId))
    .limit(1);

  if (rows.length === 0 || rows[0].memberGroupId !== groupId) {
    return { error: { message: "Штурвал не найден", status: 404 } as const };
  }
  return { ok: true as const };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check && check.error) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  if (typeof body.status !== "string" || !ALLOWED_STATUS.has(body.status)) {
    return Response.json(
      { error: "status должен быть new, in_progress, done или rejected" },
      { status: 400 },
    );
  }

  await db
    .update(feedbackItems)
    .set({
      status: body.status as "new" | "in_progress" | "done" | "rejected",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(feedbackItems.id, id));

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check && check.error) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  await db.delete(feedbackItems).where(eq(feedbackItems.id, id));
  return Response.json({ ok: true }, { status: 200 });
}

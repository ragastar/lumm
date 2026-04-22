import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const GOAL_MAX = 500;

type Body = {
  displayName?: string;
  avatarColor?: string;
  businessGoal?: string | null;
  sportGoal?: string | null;
};

function normalizeGoal(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const updates: Partial<typeof members.$inferInsert> = {};

  if (body.displayName !== undefined) {
    const trimmed = body.displayName.trim();
    if (trimmed.length < 2) {
      return Response.json({ error: "Никнейм должен быть минимум 2 символа" }, { status: 400 });
    }
    updates.displayName = trimmed;
  }

  if (body.avatarColor !== undefined) {
    if (!HEX_COLOR.test(body.avatarColor)) {
      return Response.json({ error: "Неверный цвет" }, { status: 400 });
    }
    updates.avatarColor = body.avatarColor;
  }

  const business = normalizeGoal(body.businessGoal);
  if (business !== undefined) {
    if (business !== null && business.length > GOAL_MAX) {
      return Response.json({ error: `Бизнес-цель — не больше ${GOAL_MAX} символов` }, { status: 400 });
    }
    updates.businessGoal = business;
  }

  const sport = normalizeGoal(body.sportGoal);
  if (sport !== undefined) {
    if (sport !== null && sport.length > GOAL_MAX) {
      return Response.json({ error: `Спортивная цель — не больше ${GOAL_MAX} символов` }, { status: 400 });
    }
    updates.sportGoal = sport;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  await db.update(members).set(updates).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}

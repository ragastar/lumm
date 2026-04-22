// src/app/api/monthly-financials/route.ts
import { type NextRequest } from "next/server";
import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getCurrentMemberId } from "@/lib/session";
import { validateMonthlyFinancialsBody } from "@/lib/monthlyFinancials";

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get("memberId");

  if (memberId) {
    const rows = await db
      .select()
      .from(monthlyFinancials)
      .where(eq(monthlyFinancials.memberId, memberId))
      .orderBy(desc(monthlyFinancials.month));
    return Response.json(rows);
  }

  const rows = await db
    .select({
      id: monthlyFinancials.id,
      memberId: monthlyFinancials.memberId,
      month: monthlyFinancials.month,
      revenue: monthlyFinancials.revenue,
      netProfit: monthlyFinancials.netProfit,
      capital: monthlyFinancials.capital,
      scoreBusiness: monthlyFinancials.scoreBusiness,
      scoreFamily: monthlyFinancials.scoreFamily,
      scorePersonal: monthlyFinancials.scorePersonal,
      reportText: monthlyFinancials.reportText,
      requestText: monthlyFinancials.requestText,
      createdAt: monthlyFinancials.createdAt,
      updatedAt: monthlyFinancials.updatedAt,
      memberDisplayName: members.displayName,
      memberAvatarColor: members.avatarColor,
    })
    .from(monthlyFinancials)
    .leftJoin(members, eq(monthlyFinancials.memberId, members.id))
    .orderBy(desc(monthlyFinancials.month));

  return Response.json(rows);
}

export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const result = validateMonthlyFinancialsBody(raw);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const v = result.value;

  const now = new Date().toISOString();

  const record = {
    id: randomUUID(),
    memberId,
    month: v.month,
    revenue: v.revenue,
    netProfit: v.netProfit,
    capital: v.capital,
    scoreBusiness: v.scoreBusiness,
    scoreFamily: v.scoreFamily,
    scorePersonal: v.scorePersonal,
    reportText: v.reportText,
    requestText: v.requestText,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .insert(monthlyFinancials)
    .values(record)
    .onConflictDoUpdate({
      target: [monthlyFinancials.memberId, monthlyFinancials.month],
      set: {
        revenue: v.revenue,
        netProfit: v.netProfit,
        capital: v.capital,
        scoreBusiness: v.scoreBusiness,
        scoreFamily: v.scoreFamily,
        scorePersonal: v.scorePersonal,
        reportText: v.reportText,
        requestText: v.requestText,
        updatedAt: now,
      },
    });

  const [saved] = await db
    .select()
    .from(monthlyFinancials)
    .where(and(eq(monthlyFinancials.memberId, memberId), eq(monthlyFinancials.month, v.month)))
    .limit(1);

  return Response.json(saved, { status: 200 });
}

import { type NextRequest } from "next/server";
import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get("memberId");

  if (memberId) {
    const financials = await db
      .select()
      .from(monthlyFinancials)
      .where(eq(monthlyFinancials.memberId, memberId))
      .orderBy(desc(monthlyFinancials.month));
    return Response.json(financials);
  }

  const financials = await db
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
      memberDisplayName: members.displayName,
      memberAvatarColor: members.avatarColor,
    })
    .from(monthlyFinancials)
    .leftJoin(members, eq(monthlyFinancials.memberId, members.id))
    .orderBy(desc(monthlyFinancials.month));

  return Response.json(financials);
}

export async function POST(request: Request) {
  const body = await request.json();

  const record = {
    id: randomUUID(),
    memberId: body.memberId,
    month: body.month,
    revenue: body.revenue ?? null,
    netProfit: body.netProfit ?? null,
    capital: body.capital ?? null,
    scoreBusiness: body.scoreBusiness ?? null,
    scoreFamily: body.scoreFamily ?? null,
    scorePersonal: body.scorePersonal ?? null,
    reportText: body.reportText ?? null,
    requestText: body.requestText ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.insert(monthlyFinancials).values(record);

  return Response.json(record, { status: 201 });
}

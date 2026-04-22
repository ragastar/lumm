// src/app/api/monthly-financials/me/route.ts
import { type NextRequest } from "next/server";
import { db } from "@/db";
import { monthlyFinancials } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMemberId } from "@/lib/session";

export async function GET(request: NextRequest) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}-01$/.test(month)) {
    return Response.json({ error: "month должен быть в формате YYYY-MM-01" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(monthlyFinancials)
    .where(and(eq(monthlyFinancials.memberId, memberId), eq(monthlyFinancials.month, month)))
    .limit(1);

  return Response.json(rows[0] ?? null);
}

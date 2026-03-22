import { type NextRequest } from "next/server";
import { db } from "@/db";
import { weeklyReports, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get("memberId");

  if (memberId) {
    const reports = await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.memberId, memberId))
      .orderBy(desc(weeklyReports.weekStart));
    return Response.json(reports);
  }

  const reports = await db
    .select({
      id: weeklyReports.id,
      memberId: weeklyReports.memberId,
      weekStart: weeklyReports.weekStart,
      businessText: weeklyReports.businessText,
      familyText: weeklyReports.familyText,
      personalText: weeklyReports.personalText,
      scoreBusiness: weeklyReports.scoreBusiness,
      scoreFamily: weeklyReports.scoreFamily,
      scorePersonal: weeklyReports.scorePersonal,
      planText: weeklyReports.planText,
      source: weeklyReports.source,
      createdAt: weeklyReports.createdAt,
      memberDisplayName: members.displayName,
      memberAvatarColor: members.avatarColor,
    })
    .from(weeklyReports)
    .leftJoin(members, eq(weeklyReports.memberId, members.id))
    .orderBy(desc(weeklyReports.weekStart));

  return Response.json(reports);
}

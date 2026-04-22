import { db } from "@/db";
import { members, weeklyReports, reportAnalyses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await params;

  const found = await db
    .select({ memberId: weeklyReports.memberId, groupId: members.groupId })
    .from(weeklyReports)
    .innerJoin(members, eq(members.id, weeklyReports.memberId))
    .where(and(eq(weeklyReports.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (found.length === 0) {
    return Response.json({ error: "Отчёт не найден" }, { status: 404 });
  }

  await db.delete(reportAnalyses).where(eq(reportAnalyses.reportId, id));
  await db.delete(weeklyReports).where(eq(weeklyReports.id, id));

  return Response.json({ ok: true });
}

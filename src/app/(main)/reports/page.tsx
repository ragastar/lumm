import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members, weeklyReports, reportAnalyses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const LIGHT_BADGE: Record<string, { label: string; color: string }> = {
  green: { label: "🟢", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  yellow: { label: "🟡", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  red: { label: "🔴", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

function truncate(s: string | null, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      reportId: weeklyReports.id,
      createdAt: weeklyReports.createdAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      trafficLight: reportAnalyses.trafficLight,
      coach: reportAnalyses.coach,
    })
    .from(weeklyReports)
    .innerJoin(members, eq(members.id, weeklyReports.memberId))
    .leftJoin(reportAnalyses, eq(reportAnalyses.reportId, weeklyReports.id))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(weeklyReports.createdAt));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Отчёты</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          {rows.length} {rows.length === 1 ? "отчёт" : "отчётов"} в группе
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center text-lumm-text-secondary">
          Пока отчётов нет. Напиши в групп-чат: <code className="text-lumm-gold">@lummbrain_bot Еженедельный отчёт ...</code>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const badge = r.trafficLight ? LIGHT_BADGE[r.trafficLight] : null;
            return (
              <Link
                key={r.reportId}
                href={`/reports/${r.reportId}`}
                className="block bg-lumm-black border border-lumm-gray-light rounded-xl p-4 hover:border-lumm-gold transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    displayName={r.displayName}
                    avatarColor={r.avatarColor}
                    avatarUrl={r.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-lumm-text-primary">{r.displayName}</span>
                      <span className="text-xs text-lumm-text-secondary">{formatDate(r.createdAt)}</span>
                      {badge ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${badge.color}`}>{badge.label}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs border bg-lumm-gray-light/10 text-lumm-text-secondary border-lumm-gray-light">
                          без анализа
                        </span>
                      )}
                    </div>
                    {r.coach && (
                      <p className="text-sm text-lumm-text-secondary mt-1 truncate">{truncate(r.coach, 120)}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

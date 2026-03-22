import { db } from "@/db";
import { weeklyReports, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await db
    .select({
      report: weeklyReports,
      memberName: members.displayName,
      memberColor: members.avatarColor,
    })
    .from(weeklyReports)
    .innerJoin(members, eq(weeklyReports.memberId, members.id))
    .orderBy(desc(weeklyReports.weekStart));

  // Group by week
  const byWeek = reports.reduce<
    Record<string, typeof reports>
  >((acc, r) => {
    const week = r.report.weekStart;
    if (!acc[week]) acc[week] = [];
    acc[week].push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Еженедельные отчёты</h1>
        <p className="text-lumm-text-secondary mt-1">Групповой обзор по неделям</p>
      </div>

      {Object.entries(byWeek).map(([week, weekReports]) => (
        <div key={week} className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
          <div className="px-6 py-3 border-b border-lumm-gray-light bg-lumm-gray/30">
            <h2 className="text-sm font-medium text-lumm-gold">
              Неделя с{" "}
              {new Date(week + "T00:00:00").toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
          </div>
          <div className="divide-y divide-lumm-gray-light">
            {weekReports.map((r) => (
              <div key={r.report.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-lumm-dark"
                    style={{ backgroundColor: r.memberColor }}
                  >
                    {r.memberName[0]}
                  </div>
                  <span className="font-medium">{r.memberName}</span>
                  <div className="flex gap-2 ml-auto text-sm">
                    <span className="px-2 py-0.5 rounded bg-lumm-gold/10 text-lumm-gold">
                      Б:{r.report.scoreBusiness}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      С:{r.report.scoreFamily}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                      Л:{r.report.scorePersonal}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-lumm-text-secondary mb-1">Бизнес</p>
                    <p className="text-lumm-text-primary">{r.report.businessText}</p>
                  </div>
                  <div>
                    <p className="text-xs text-lumm-text-secondary mb-1">Семья</p>
                    <p className="text-lumm-text-primary">{r.report.familyText}</p>
                  </div>
                  <div>
                    <p className="text-xs text-lumm-text-secondary mb-1">Личное</p>
                    <p className="text-lumm-text-primary">{r.report.personalText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

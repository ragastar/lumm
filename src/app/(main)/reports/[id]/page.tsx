import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members, weeklyReports, reportAnalyses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const LIGHT_BADGE: Record<string, { label: string; color: string }> = {
  green: { label: "🟢 Движется", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  yellow: { label: "🟡 Частично", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  red: { label: "🔴 Застрял", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const rows = await db
    .select({
      reportId: weeklyReports.id,
      rawText: weeklyReports.rawText,
      createdAt: weeklyReports.createdAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      groupId: members.groupId,
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
      trafficLight: reportAnalyses.trafficLight,
      did: reportAnalyses.did,
      missed: reportAnalyses.missed,
      nextQuestion: reportAnalyses.nextQuestion,
      coach: reportAnalyses.coach,
    })
    .from(weeklyReports)
    .innerJoin(members, eq(members.id, weeklyReports.memberId))
    .leftJoin(reportAnalyses, eq(reportAnalyses.reportId, weeklyReports.id))
    .where(and(eq(weeklyReports.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0) notFound();
  const r = rows[0];

  const badge = r.trafficLight ? LIGHT_BADGE[r.trafficLight] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/reports"
        className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
      >
        ← К ленте отчётов
      </Link>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 flex items-center gap-4">
        <Link href={`/members/${r.memberId}`}>
          <Avatar
            displayName={r.displayName}
            avatarColor={r.avatarColor}
            avatarUrl={r.avatarUrl}
            size="lg"
          />
        </Link>
        <div className="flex-1">
          <Link href={`/members/${r.memberId}`} className="text-lg font-semibold text-lumm-text-primary hover:underline">
            {r.displayName}
          </Link>
          <p className="text-sm text-lumm-text-secondary">{formatDate(r.createdAt)}</p>
        </div>
        {badge ? (
          <span className={`px-3 py-1 rounded-full text-sm border ${badge.color}`}>{badge.label}</span>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm border bg-lumm-gray-light/10 text-lumm-text-secondary border-lumm-gray-light">
            Без анализа
          </span>
        )}
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Текст отчёта</h2>
        <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
          {r.rawText ?? "—"}
        </pre>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Цели участника</h2>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Бизнес</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.businessGoal ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Спорт</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.sportGoal ?? "—"}</p>
        </div>
      </div>

      {r.trafficLight ? (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Анализ</h2>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Что сделал к цели</p>
            <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.did}</p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Что упустил</p>
            <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.missed}</p>
          </div>
          <div className="border-l-4 border-lumm-gold pl-4">
            <p className="text-xs text-lumm-gold uppercase tracking-wide mb-1">Вопрос на следующую неделю</p>
            <p className="text-base text-lumm-text-primary whitespace-pre-wrap">{r.nextQuestion}</p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Коуч</p>
            <p className="text-sm text-lumm-text-primary whitespace-pre-wrap leading-relaxed">{r.coach}</p>
          </div>
        </div>
      ) : (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
          <p className="text-sm text-lumm-text-secondary">Анализ не удался — попробуем ещё раз позже.</p>
        </div>
      )}
    </div>
  );
}

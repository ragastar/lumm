"use client";

import { StatCard } from "@/components/StatCard";
import { MiniRadar } from "@/components/MiniRadar";
import { Sparkline } from "@/components/Sparkline";

type Member = {
  id: string;
  displayName: string;
  realName: string | null;
  role: string;
  avatarColor: string;
};

type WeeklyReport = {
  id: string;
  weekStart: string;
  businessText: string | null;
  familyText: string | null;
  personalText: string | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
  source: string;
  createdAt: string;
};

type MonthlyFinancial = {
  id: string;
  month: string;
  revenue: number | null;
  netProfit: number | null;
  capital: number | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
};

type NextMeeting = {
  id: string;
  date: string;
  location: string | null;
  organizerName: string | null;
} | null;

type Props = {
  member: Member;
  reports: WeeklyReport[];
  financials: MonthlyFinancial[];
  nextMeeting: NextMeeting;
};

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

export function DashboardClient({ member, reports, financials, nextMeeting }: Props) {
  const latestReport = reports[0] ?? null;
  const latestFinancial = financials[0] ?? null;

  // Reports submitted count (out of last 8 weeks)
  const reportsSubmitted = reports.length;

  // Revenue and profit sparkline data (reverse to chronological order)
  const revenueData = [...financials]
    .reverse()
    .map((f) => f.revenue ?? 0);
  const profitData = [...financials]
    .reverse()
    .map((f) => f.netProfit ?? 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <h1 className="text-3xl font-bold text-lumm-gold">
        Привет, {member.displayName}
      </h1>

      {/* Next Meeting Card */}
      {nextMeeting && (
        <div className="relative overflow-hidden rounded-xl border border-lumm-gold/30 bg-gradient-to-r from-lumm-gold/10 to-lumm-gold/5 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-lumm-text-secondary mb-1">Следующая встреча</p>
              <p className="text-lg sm:text-xl font-semibold text-lumm-text-primary capitalize">
                {formatDateRu(nextMeeting.date)}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-sm text-lumm-text-secondary">
                {nextMeeting.location && (
                  <span>📍 {nextMeeting.location}</span>
                )}
                {nextMeeting.organizerName && (
                  <span>Организатор: {nextMeeting.organizerName}</span>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-4xl sm:text-5xl font-bold text-lumm-gold">
                {daysUntil(nextMeeting.date)}
              </p>
              <p className="text-sm text-lumm-text-secondary">
                {daysUntil(nextMeeting.date) === 1 ? "день" : "дней"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Еженедельный отчёт"
          value={latestReport ? "Сдан" : "Не сдан"}
          subtitle={latestReport ? `Неделя ${latestReport.weekStart}` : undefined}
        />
        <StatCard
          label="Выручка"
          value={latestFinancial?.revenue != null ? `${formatMoney(latestFinancial.revenue)} ₽` : "—"}
          subtitle={latestFinancial ? latestFinancial.month : undefined}
        />
        <StatCard
          label="Чистая прибыль"
          value={latestFinancial?.netProfit != null ? `${formatMoney(latestFinancial.netProfit)} ₽` : "—"}
          subtitle={latestFinancial ? latestFinancial.month : undefined}
          accent
        />
        <StatCard
          label="Отчётов сдано"
          value={`${reportsSubmitted}/8`}
          subtitle="за последние 8 недель"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
          <p className="text-sm text-lumm-text-secondary mb-4">Баланс (последний отчёт)</p>
          <div className="flex items-center justify-center">
            {latestReport && latestReport.scoreBusiness != null ? (
              <MiniRadar
                business={latestReport.scoreBusiness ?? 0}
                family={latestReport.scoreFamily ?? 0}
                personal={latestReport.scorePersonal ?? 0}
                size={200}
              />
            ) : (
              <p className="text-lumm-text-secondary text-sm py-8">Нет данных</p>
            )}
          </div>
        </div>

        {/* Sparklines */}
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-6">
          <div>
            <p className="text-sm text-lumm-text-secondary mb-3">Выручка (6 мес.)</p>
            {revenueData.length >= 2 ? (
              <div className="w-full overflow-hidden">
                <Sparkline data={revenueData} width={400} height={60} color="#c9a84c" />
              </div>
            ) : (
              <p className="text-lumm-text-secondary text-sm">Нет данных</p>
            )}
          </div>
          <div>
            <p className="text-sm text-lumm-text-secondary mb-3">Чистая прибыль (6 мес.)</p>
            {profitData.length >= 2 ? (
              <div className="w-full overflow-hidden">
                <Sparkline data={profitData} width={400} height={60} color="#51cf66" />
              </div>
            ) : (
              <p className="text-lumm-text-secondary text-sm">Нет данных</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="text-lg font-semibold text-lumm-text-primary mb-4">Последние отчёты</h2>
        {reports.length === 0 ? (
          <p className="text-lumm-text-secondary text-sm">Нет отчётов</p>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="bg-lumm-black border border-lumm-gray-light rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-lumm-text-secondary">
                      Неделя {r.weekStart}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-400">
                        Б:{r.scoreBusiness ?? "–"}
                      </span>
                      <span className="text-pink-400">
                        С:{r.scoreFamily ?? "–"}
                      </span>
                      <span className="text-green-400">
                        Л:{r.scorePersonal ?? "–"}
                      </span>
                    </div>
                  </div>
                  {r.businessText && (
                    <p className="text-sm text-lumm-text-primary truncate">
                      {truncate(r.businessText, 120)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs px-2 py-1 rounded bg-lumm-gray text-lumm-text-secondary">
                  {r.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Sparkline } from "@/components/Sparkline";

type MemberStat = {
  id: string;
  name: string;
  color: string;
  revenue: number;
  profit: number;
  revenueHistory: number[];
};

type MonthlyTotal = {
  month: string;
  revenue: number;
  profit: number;
  members: number;
};

type Props = {
  memberStats: MemberStat[];
  monthlyTotals: MonthlyTotal[];
  totalRevenue: number;
  totalProfit: number;
  latestMonth: string;
};

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function AnalyticsClient({
  memberStats,
  monthlyTotals,
  totalRevenue,
  totalProfit,
  latestMonth,
}: Props) {
  const groupRevenueData = monthlyTotals.map((m) => m.revenue);
  const groupProfitData = monthlyTotals.map((m) => m.profit);
  const sorted = [...memberStats].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...sorted.map((m) => m.revenue), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Аналитика группы</h1>
        <p className="text-lumm-text-secondary mt-1">
          Финансовые показатели участников Level Up Mastermind
        </p>
      </div>

      {/* Group totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Совокупная выручка
          </p>
          <p className="text-2xl font-bold text-lumm-gold">
            {formatRub(totalRevenue)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">
            {new Date(latestMonth + "T00:00:00").toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Совокупная прибыль
          </p>
          <p className="text-2xl font-bold text-green-400">
            {formatRub(totalProfit)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">
            маржа{" "}
            {totalRevenue > 0
              ? ((totalProfit / totalRevenue) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Средняя выручка
          </p>
          <p className="text-2xl font-bold text-lumm-text-primary">
            {formatRub(
              memberStats.length > 0
                ? totalRevenue / memberStats.length
                : 0
            )}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">на участника</p>
        </div>
      </div>

      {/* Group sparklines */}
      {groupRevenueData.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <p className="text-sm text-lumm-text-secondary mb-3">
              Групповая выручка (динамика)
            </p>
            <div className="w-full overflow-hidden">
              <Sparkline
                data={groupRevenueData}
                width={450}
                height={60}
                color="#c9a84c"
              />
            </div>
          </div>
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <p className="text-sm text-lumm-text-secondary mb-3">
              Групповая прибыль (динамика)
            </p>
            <div className="w-full overflow-hidden">
              <Sparkline
                data={groupProfitData}
                width={450}
                height={60}
                color="#51cf66"
              />
            </div>
          </div>
        </div>
      )}

      {/* Revenue bar chart */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5 sm:p-6">
        <h3 className="text-sm font-medium text-lumm-text-secondary mb-5">
          Выручка участников (последний месяц)
        </h3>
        <div className="space-y-4">
          {sorted.map((m) => {
            const pct = (m.revenue / maxRevenue) * 100;
            return (
              <div key={m.id} className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-28 shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-lumm-dark shrink-0"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name[0]}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {m.name}
                  </span>
                </div>
                <div className="flex-1 h-7 bg-lumm-gray/30 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center px-3"
                    style={{
                      width: `${Math.max(pct, 8)}%`,
                      backgroundColor: m.color + "33",
                      borderLeft: `3px solid ${m.color}`,
                    }}
                  >
                    <span className="text-xs font-medium text-lumm-text-primary whitespace-nowrap">
                      {formatShort(m.revenue)} ₽
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed table */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">
            Детализация по участникам
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                <th className="text-left px-6 py-3">Участник</th>
                <th className="text-right px-6 py-3">Выручка</th>
                <th className="text-right px-6 py-3">Прибыль</th>
                <th className="text-right px-6 py-3">Маржа</th>
                <th className="text-right px-6 py-3">Доля</th>
                <th className="text-center px-6 py-3">Тренд</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const margin =
                  m.revenue > 0
                    ? ((m.profit / m.revenue) * 100).toFixed(1)
                    : "0";
                const share =
                  totalRevenue > 0
                    ? ((m.revenue / totalRevenue) * 100).toFixed(1)
                    : "0";
                return (
                  <tr
                    key={m.id}
                    className="border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-lumm-dark"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name[0]}
                        </div>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {formatRub(m.revenue)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                      {formatRub(m.profit)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-text-secondary">
                      {margin}%
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-text-secondary">
                      {share}%
                    </td>
                    <td className="px-6 py-3 flex justify-center">
                      {m.revenueHistory.length >= 2 ? (
                        <Sparkline
                          data={m.revenueHistory}
                          width={80}
                          height={24}
                          color={m.color}
                        />
                      ) : (
                        <span className="text-xs text-lumm-text-secondary">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly history */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">
            Динамика по месяцам (группа)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                <th className="text-left px-6 py-3">Месяц</th>
                <th className="text-right px-6 py-3">Выручка</th>
                <th className="text-right px-6 py-3">Прибыль</th>
                <th className="text-right px-6 py-3">Маржа</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyTotals].reverse().map((m) => (
                <tr
                  key={m.month}
                  className="border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20"
                >
                  <td className="px-6 py-3 text-sm">
                    {new Date(m.month + "T00:00:00").toLocaleDateString(
                      "ru-RU",
                      { month: "long", year: "numeric" }
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    {formatRub(m.revenue)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                    {formatRub(m.profit)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-lumm-text-secondary">
                    {m.revenue > 0
                      ? ((m.profit / m.revenue) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function BudgetPage() {
  const allMembers = await db.select().from(members);

  // Get latest month financials for each member
  const allFinancials = await db
    .select()
    .from(monthlyFinancials)
    .orderBy(desc(monthlyFinancials.month));

  // Group by member, take latest
  const latestByMember = new Map<
    string,
    (typeof allFinancials)[0]
  >();
  for (const f of allFinancials) {
    if (!latestByMember.has(f.memberId)) {
      latestByMember.set(f.memberId, f);
    }
  }

  // Total revenue and profit across group
  const totalRevenue = [...latestByMember.values()].reduce(
    (sum, f) => sum + (f.revenue ?? 0),
    0
  );
  const totalProfit = [...latestByMember.values()].reduce(
    (sum, f) => sum + (f.netProfit ?? 0),
    0
  );

  // Monthly fee (from seed settings: fineAmount = 5000)
  const monthlyFee = 5000;
  const groupBudget = monthlyFee * allMembers.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Бюджет группы</h1>
        <p className="text-lumm-text-secondary mt-1">
          Финансовый обзор Level Up Mastermind
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Ежемесячный взнос
          </p>
          <p className="text-2xl font-bold text-lumm-gold">
            {formatRub(monthlyFee)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">с участника</p>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">Бюджет группы</p>
          <p className="text-2xl font-bold text-lumm-text-primary">
            {formatRub(groupBudget)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">
            {allMembers.length} участников x {formatRub(monthlyFee)}
          </p>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">Участников</p>
          <p className="text-2xl font-bold text-lumm-text-primary">
            {allMembers.length}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">
            активных в группе
          </p>
        </div>
      </div>

      {/* Group Revenue Summary */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
        <h3 className="text-sm font-medium text-lumm-text-secondary mb-1">
          Совокупная выручка группы (последний месяц)
        </h3>
        <p className="text-3xl font-bold text-lumm-gold">
          {formatRub(totalRevenue)}
        </p>
        <p className="text-sm text-lumm-text-secondary mt-2">
          Совокупная прибыль:{" "}
          <span className="text-green-400">{formatRub(totalProfit)}</span>
        </p>
      </div>

      {/* Per-Member Table */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">
            Вклад участников (последний месяц)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                <th className="text-left px-6 py-3">Участник</th>
                <th className="text-right px-6 py-3">Выручка</th>
                <th className="text-right px-6 py-3">Прибыль</th>
                <th className="text-right px-6 py-3">Доля</th>
              </tr>
            </thead>
            <tbody>
              {allMembers.map((m) => {
                const fin = latestByMember.get(m.id);
                const revenue = fin?.revenue ?? 0;
                const share =
                  totalRevenue > 0
                    ? ((revenue / totalRevenue) * 100).toFixed(1)
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
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {m.displayName[0]}
                        </div>
                        <span className="text-sm font-medium">
                          {m.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {fin ? formatRub(revenue) : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                      {fin?.netProfit != null
                        ? formatRub(fin.netProfit)
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-text-secondary">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

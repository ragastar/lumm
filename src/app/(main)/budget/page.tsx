import { db } from "@/db";
import { members } from "@/db/schema";

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

  const monthlyFee = 5000;
  const monthlyTotal = monthlyFee * allMembers.length;
  const yearlyTotal = monthlyTotal * 12;

  // Mock: accumulated budget (6 months of contributions + some fines)
  const monthsActive = 6;
  const mockFinesCollected = 32500;
  const totalCollected = monthlyTotal * monthsActive + mockFinesCollected;
  const mockSpent = 87000; // на аренды, выезды
  const balance = totalCollected - mockSpent;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Бюджет группы</h1>
        <p className="text-lumm-text-secondary mt-1">
          Касса взносов Level Up Mastermind
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-lumm-gold/10 to-lumm-gold/5 border border-lumm-gold/20 rounded-xl p-6">
        <p className="text-sm text-lumm-gold font-medium mb-1">
          Баланс кассы
        </p>
        <p className="text-4xl sm:text-5xl font-bold text-lumm-gold">
          {formatRub(balance)}
        </p>
        <p className="text-sm text-lumm-text-secondary mt-2">
          Собрано {formatRub(totalCollected)} · Потрачено{" "}
          {formatRub(mockSpent)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Взнос / мес
          </p>
          <p className="text-2xl font-bold text-lumm-text-primary">
            {formatRub(monthlyFee)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">с участника</p>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Сбор / мес
          </p>
          <p className="text-2xl font-bold text-lumm-text-primary">
            {formatRub(monthlyTotal)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">
            {allMembers.length} x {formatRub(monthlyFee)}
          </p>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
          <p className="text-sm text-lumm-text-secondary mb-1">
            Сбор / год
          </p>
          <p className="text-2xl font-bold text-lumm-text-primary">
            {formatRub(yearlyTotal)}
          </p>
          <p className="text-xs text-lumm-text-secondary mt-1">12 месяцев</p>
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

      {/* Contributions Table */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">
            Взносы участников
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                <th className="text-left px-6 py-3">Участник</th>
                <th className="text-center px-6 py-3">Статус</th>
                <th className="text-right px-6 py-3">Взнос / мес</th>
                <th className="text-right px-6 py-3">Оплачено</th>
              </tr>
            </thead>
            <tbody>
              {allMembers.map((m) => {
                // Mock: all paid for current month
                const paid = monthlyFee * monthsActive;
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
                        <div>
                          <span className="text-sm font-medium">
                            {m.displayName}
                          </span>
                          <p className="text-xs text-lumm-text-secondary">
                            {m.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">
                        оплачено
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {formatRub(monthlyFee)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                      {formatRub(paid)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">
            Расходы из кассы
          </h3>
        </div>
        <div className="divide-y divide-lumm-gray-light/50">
          {[
            {
              date: "2026-03-20",
              desc: "Аренда коворкинга «Рабочая станция»",
              amount: 15000,
            },
            {
              date: "2026-02-20",
              desc: "Аренда лофта «Флакон»",
              amount: 18000,
            },
            {
              date: "2026-01-16",
              desc: "Аренда кофейни «Кофемания»",
              amount: 12000,
            },
            {
              date: "2025-12-18",
              desc: "Аренда коворкинга «Рабочая станция»",
              amount: 15000,
            },
            {
              date: "2025-11-20",
              desc: "Аренда переговорки «Красный Октябрь»",
              amount: 14000,
            },
            {
              date: "2025-10-16",
              desc: "Полугодовой выезд — организация",
              amount: 13000,
            },
          ].map((exp) => (
            <div
              key={exp.date}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-6 py-3"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs text-lumm-text-secondary w-20 shrink-0">
                  {new Date(exp.date + "T00:00:00").toLocaleDateString(
                    "ru-RU",
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )}
                </span>
                <span className="text-sm text-lumm-text-primary">
                  {exp.desc}
                </span>
              </div>
              <span className="text-sm font-medium text-red-400 whitespace-nowrap">
                -{formatRub(exp.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fines collected */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-lumm-text-secondary">
              Собрано штрафов
            </h3>
            <p className="text-2xl font-bold text-lumm-gold mt-1">
              {formatRub(mockFinesCollected)}
            </p>
          </div>
          <p className="text-xs text-lumm-text-secondary max-w-xs">
            Штрафы поступают в общую кассу и расходуются на аренду площадок и
            организацию выездов
          </p>
        </div>
      </div>
    </div>
  );
}

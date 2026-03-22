"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkline } from "@/components/Sparkline";

type Financial = {
  id: string;
  month: string;
  revenue: number | null;
  netProfit: number | null;
  capital: number | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
  reportText: string | null;
  requestText: string | null;
};

type Props = {
  member: { id: string; displayName: string };
  financials: Financial[];
};

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FinancialsClient({ member, financials }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    await fetch("/api/monthly-financials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: member.id,
        month: fd.get("month") + "-01",
        revenue: Number(fd.get("revenue")),
        netProfit: Number(fd.get("netProfit")),
        capital: fd.get("capital") ? Number(fd.get("capital")) : null,
        scoreBusiness: Number(fd.get("scoreBusiness")),
        scoreFamily: Number(fd.get("scoreFamily")),
        scorePersonal: Number(fd.get("scorePersonal")),
        reportText: fd.get("reportText"),
        requestText: fd.get("requestText") || null,
      }),
    });

    setSubmitting(false);
    setShowForm(false);
    router.refresh();
  };

  const revenueData = [...financials].reverse().map((f) => f.revenue ?? 0);
  const profitData = [...financials].reverse().map((f) => f.netProfit ?? 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-lumm-text-secondary mt-1">
            Ежемесячные отчёты — {member.displayName}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
        >
          {showForm ? "Отмена" : "Новый отчёт"}
        </button>
      </div>

      {/* New Report Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-lg font-medium text-lumm-gold">Месячный отчёт</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Месяц
              </label>
              <input
                name="month"
                type="month"
                required
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Выручка (вал), ₽ *
              </label>
              <input
                name="revenue"
                type="number"
                required
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Чистая прибыль, ₽ *
              </label>
              <input
                name="netProfit"
                type="number"
                required
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Капитал, ₽ (квартал)
              </label>
              <input
                name="capital"
                type="number"
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Бизнес (1-10) *
              </label>
              <input
                name="scoreBusiness"
                type="number"
                min="1"
                max="10"
                required
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Семья (1-10) *
              </label>
              <input
                name="scoreFamily"
                type="number"
                min="1"
                max="10"
                required
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Личное (1-10) *
              </label>
              <input
                name="scorePersonal"
                type="number"
                min="1"
                max="10"
                required
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">
              Отчёт по сферам *
            </label>
            <textarea
              name="reportText"
              rows={3}
              required
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">
              Запрос на разбор (опционально)
            </label>
            <textarea
              name="requestText"
              rows={2}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Сохранение..." : "Сохранить отчёт"}
          </button>
        </form>
      )}

      {/* Sparklines */}
      {revenueData.length >= 2 && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <p className="text-sm text-lumm-text-secondary mb-3">Выручка (6 мес)</p>
            <Sparkline data={revenueData} width={450} height={60} color="#c9a84c" />
          </div>
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <p className="text-sm text-lumm-text-secondary mb-3">
              Чистая прибыль (6 мес)
            </p>
            <Sparkline data={profitData} width={450} height={60} color="#51cf66" />
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">
            История отчётов
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
              <th className="text-left px-6 py-3">Месяц</th>
              <th className="text-right px-6 py-3">Выручка</th>
              <th className="text-right px-6 py-3">Прибыль</th>
              <th className="text-right px-6 py-3">Капитал</th>
              <th className="text-center px-6 py-3">Б/С/Л</th>
            </tr>
          </thead>
          <tbody>
            {financials.map((f) => (
              <tr
                key={f.id}
                className="border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20"
              >
                <td className="px-6 py-3 text-sm">
                  {new Date(f.month + "T00:00:00").toLocaleDateString("ru-RU", {
                    month: "long",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-3 text-sm text-right">
                  {f.revenue != null ? formatRub(f.revenue) : "—"}
                </td>
                <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                  {f.netProfit != null ? formatRub(f.netProfit) : "—"}
                </td>
                <td className="px-6 py-3 text-sm text-right">
                  {f.capital != null ? formatRub(f.capital) : "—"}
                </td>
                <td className="px-6 py-3 text-sm text-center">
                  <span className="text-lumm-gold">{f.scoreBusiness}</span>/
                  <span className="text-blue-400">{f.scoreFamily}</span>/
                  <span className="text-purple-400">{f.scorePersonal}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

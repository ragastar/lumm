"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { isQuarterEnd } from "@/lib/quarter";

type FeedRow = {
  id: string;
  month: string;
  revenue: number | null;
  netProfit: number | null;
  capital: number | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
  createdAt: string;
  memberId: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
};

type MyRecord = {
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
  currentMember: { id: string; displayName: string };
  feed: FeedRow[];
};

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function currentMonthIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function toMonthInput(iso: string): string {
  return iso.slice(0, 7);
}

function fromMonthInput(val: string): string {
  return `${val}-01`;
}

type FormState = {
  revenue: string;
  netProfit: string;
  capital: string;
  scoreBusiness: string;
  scoreFamily: string;
  scorePersonal: string;
  reportText: string;
  requestText: string;
};

const EMPTY_FORM: FormState = {
  revenue: "",
  netProfit: "",
  capital: "",
  scoreBusiness: "",
  scoreFamily: "",
  scorePersonal: "",
  reportText: "",
  requestText: "",
};

function fromRecord(r: MyRecord): FormState {
  return {
    revenue: r.revenue?.toString() ?? "",
    netProfit: r.netProfit?.toString() ?? "",
    capital: r.capital?.toString() ?? "",
    scoreBusiness: r.scoreBusiness?.toString() ?? "",
    scoreFamily: r.scoreFamily?.toString() ?? "",
    scorePersonal: r.scorePersonal?.toString() ?? "",
    reportText: r.reportText ?? "",
    requestText: r.requestText ?? "",
  };
}

export function FinancialsClient({ currentMember, feed }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [month, setMonth] = useState<string>(currentMonthIso());
  const [existing, setExisting] = useState<MyRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const quarter = isQuarterEnd(month);

  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    fetch(`/api/monthly-financials/me?month=${encodeURIComponent(month)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as MyRecord | null;
      })
      .catch(() => null)
      .then((record) => {
        if (cancelled) return;
        setError(null);
        setExisting(record);
        setForm(record ? fromRecord(record) : EMPTY_FORM);
      });
    return () => {
      cancelled = true;
    };
  }, [month, showForm]);

  const handleToggleForm = () => {
    if (showForm) {
      setMonth(currentMonthIso());
      setForm(EMPTY_FORM);
      setExisting(null);
      setError(null);
    }
    setShowForm(!showForm);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      month,
      revenue: Number(form.revenue),
      netProfit: Number(form.netProfit),
      capital: quarter && form.capital !== "" ? Number(form.capital) : null,
      scoreBusiness: Number(form.scoreBusiness),
      scoreFamily: Number(form.scoreFamily),
      scorePersonal: Number(form.scorePersonal),
      reportText: form.reportText,
      requestText: form.requestText || null,
    };

    try {
      const res = await fetch("/api/monthly-financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        setError(data.error ?? "Ошибка сервера");
        return;
      }

      handleToggleForm();
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const monthLabel = new Date(month + "T00:00:00").toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  const title = existing ? `Редактировать отчёт за ${monthLabel}` : "Месячный отчёт";
  const submitLabel = existing ? "Сохранить изменения" : "Сохранить отчёт";

  const updateField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ежемесячные отчёты</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">
            {feed.length} {feed.length === 1 ? "отчёт" : "отчётов"} в группе
          </p>
        </div>
        <button
          onClick={handleToggleForm}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
        >
          {showForm ? "Отмена" : "Новый отчёт"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-lg font-medium text-lumm-gold">{title}</h3>
          <p className="text-xs text-lumm-text-secondary">От: {currentMember.displayName}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Месяц</label>
              <input
                type="month"
                required
                value={toMonthInput(month)}
                onChange={(e) => setMonth(fromMonthInput(e.target.value))}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${quarter ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Выручка (вал), ₽ *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.revenue}
                onChange={updateField("revenue")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Чистая прибыль, ₽ *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.netProfit}
                onChange={updateField("netProfit")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            {quarter && (
              <div>
                <label className="block text-sm text-lumm-text-secondary mb-1">
                  Капитал на конец квартала, ₽ *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.capital}
                  onChange={updateField("capital")}
                  className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Бизнес (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                required
                value={form.scoreBusiness}
                onChange={updateField("scoreBusiness")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Семья (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                required
                value={form.scoreFamily}
                onChange={updateField("scoreFamily")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Личное (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                required
                value={form.scorePersonal}
                onChange={updateField("scorePersonal")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Отчёт по сферам *</label>
            <textarea
              rows={3}
              required
              value={form.reportText}
              onChange={updateField("reportText")}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">
              Запрос на разбор (опционально)
            </label>
            <textarea
              rows={2}
              value={form.requestText}
              onChange={updateField("requestText")}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Сохранение..." : submitLabel}
          </button>
        </form>
      )}

      {feed.length === 0 ? (
        <p className="text-sm text-lumm-text-secondary">Отчётов пока нет.</p>
      ) : (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                  <th className="text-left px-6 py-3">Участник</th>
                  <th className="text-left px-6 py-3">Месяц</th>
                  <th className="text-right px-6 py-3">Выручка</th>
                  <th className="text-right px-6 py-3">Прибыль</th>
                  <th className="text-right px-6 py-3">Капитал</th>
                  <th className="text-center px-6 py-3">Б/С/Л</th>
                </tr>
              </thead>
              <tbody>
                {feed.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/financials/${r.id}`)}
                    className={`border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20 cursor-pointer ${
                      r.memberId === currentMember.id ? "bg-lumm-gold/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          displayName={r.displayName}
                          avatarColor={r.avatarColor}
                          avatarUrl={r.avatarUrl}
                          size="sm"
                        />
                        <span className="text-sm">{r.displayName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {new Date(r.month + "T00:00:00").toLocaleDateString("ru-RU", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {r.revenue != null ? formatRub(r.revenue) : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                      {r.netProfit != null ? formatRub(r.netProfit) : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {r.capital != null ? formatRub(r.capital) : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-center">
                      <span className="text-lumm-gold">{r.scoreBusiness}</span>/
                      <span className="text-blue-400">{r.scoreFamily}</span>/
                      <span className="text-purple-400">{r.scorePersonal}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

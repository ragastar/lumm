// src/app/(main)/calendar/CalendarClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Meeting = {
  id: string;
  date: string;
  organizerId: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  kind: "standard" | "ad_hoc";
  organizerDisplayName: string | null;
  organizerAvatarColor: string | null;
};

type PoolMember = { id: string; displayName: string };

type Props = {
  meetings: Meeting[];
  pool: PoolMember[];
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type FormState = {
  id: string | null; // null = создание
  date: string;
  kind: "standard" | "ad_hoc";
  organizerId: string;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
};

const EMPTY_FORM: FormState = {
  id: null,
  date: today(),
  kind: "ad_hoc",
  organizerId: "",
  location: "",
  status: "scheduled",
};

export function CalendarClient({ meetings, pool }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcoming = meetings.filter((m) => m.status === "scheduled");
  const past = meetings.filter((m) => m.status !== "scheduled");

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  function openEdit(m: Meeting) {
    setForm({
      id: m.id,
      date: m.date,
      kind: m.kind,
      organizerId: m.organizerId ?? "",
      location: m.location ?? "",
      status: m.status,
    });
    setError(null);
  }

  function close() {
    setForm(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      date: form.date,
      kind: form.kind,
      organizerId: form.organizerId || null,
      location: form.location || null,
    };
    if (form.id) payload.status = form.status;

    const url = form.id ? `/api/meetings/${form.id}` : "/api/meetings";
    const method = form.id ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        setError(data.error ?? "Ошибка сервера");
        return;
      }
      close();
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMeeting(m: Meeting) {
    if (!confirm(`Отменить встречу ${formatDate(m.date)}?`)) return;
    try {
      const res = await fetch(`/api/meetings/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        alert("Не удалось отменить встречу");
        return;
      }
      router.refresh();
    } catch {
      alert("Ошибка соединения");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Календарь встреч</h1>
          <p className="text-lumm-text-secondary mt-1">Третий четверг каждого месяца</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
        >
          Создать встречу
        </button>
      </div>

      <section>
        <h2 className="text-sm font-medium text-lumm-gold mb-4">Предстоящие</h2>
        <div className="space-y-4">
          {upcoming.length === 0 && (
            <p className="text-lumm-text-secondary text-sm">Нет запланированных встреч</p>
          )}
          {upcoming.map((m) => {
            const days = daysUntil(m.date);
            return (
              <div
                key={m.id}
                className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">
                      {m.kind === "standard" ? "Стандартная" : "Ad-hoc"}
                    </p>
                    <p className="text-lg text-lumm-text-primary">{formatDate(m.date)}</p>
                    <p className="text-sm text-lumm-text-secondary mt-1">
                      {days === 0 && "Сегодня"}
                      {days === 1 && "Завтра"}
                      {days > 1 && `Через ${days} ${days === 1 ? "день" : "дней"}`}
                    </p>
                    <p className="text-sm text-lumm-text-secondary mt-2">
                      Организатор: {m.organizerDisplayName ?? "не назначен"}
                    </p>
                    {m.location && (
                      <p className="text-sm text-lumm-text-secondary">Место: {m.location}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="px-3 py-1 text-sm text-lumm-text-secondary border border-lumm-gray-light rounded hover:text-lumm-text-primary"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => cancelMeeting(m)}
                      className="px-3 py-1 text-sm text-red-400 border border-red-500/30 rounded hover:bg-red-500/10"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-lumm-text-secondary mb-4">Прошедшие и отменённые</h2>
          <div className="space-y-2">
            {past.map((m) => (
              <div
                key={m.id}
                className={`bg-lumm-black border border-lumm-gray-light/50 rounded-lg p-4 ${
                  m.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-lumm-text-secondary mr-2">
                      {m.kind === "standard" ? "ст." : "ad-hoc"}
                    </span>
                    <span className="text-sm text-lumm-text-primary">{formatDate(m.date)}</span>
                    {m.organizerDisplayName && (
                      <span className="text-sm text-lumm-text-secondary ml-2">
                        · {m.organizerDisplayName}
                      </span>
                    )}
                    <span className="text-xs text-lumm-text-secondary ml-2">
                      ({m.status === "cancelled" ? "отменена" : "проведена"})
                    </span>
                  </div>
                  <button
                    onClick={() => openEdit(m)}
                    className="text-xs text-lumm-text-secondary hover:text-lumm-text-primary"
                  >
                    Редактировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {form && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={close}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="bg-lumm-black border border-lumm-gold/30 rounded-xl p-6 space-y-4 w-full max-w-md"
          >
            <h3 className="text-lg font-medium text-lumm-gold">
              {form.id ? "Редактировать встречу" : "Новая встреча"}
            </h3>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Дата</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Тип</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    checked={form.kind === "standard"}
                    onChange={() => setForm({ ...form, kind: "standard" })}
                  />
                  Стандартная (в ротации)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    checked={form.kind === "ad_hoc"}
                    onChange={() => setForm({ ...form, kind: "ad_hoc" })}
                  />
                  Ad-hoc (вне ротации)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Организатор</label>
              <select
                value={form.organizerId}
                onChange={(e) => setForm({ ...form, organizerId: e.target.value })}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              >
                <option value="">— не назначен —</option>
                {pool.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Место (опционально)
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>

            {form.id && (
              <div>
                <label className="block text-sm text-lumm-text-secondary mb-1">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as FormState["status"] })
                  }
                  className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
                >
                  <option value="scheduled">Запланирована</option>
                  <option value="completed">Проведена</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm text-lumm-text-secondary border border-lumm-gray-light rounded hover:text-lumm-text-primary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm bg-lumm-gold text-lumm-dark font-medium rounded hover:bg-lumm-gold-light disabled:opacity-50"
              >
                {submitting ? "Сохранение..." : form.id ? "Сохранить" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

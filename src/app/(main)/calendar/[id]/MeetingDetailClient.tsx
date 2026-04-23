// src/app/(main)/calendar/[id]/MeetingDetailClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type Meeting = {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  organizerId: string | null;
  location: string | null;
  price: number | null;
  status: "scheduled" | "completed" | "cancelled";
  kind: "standard" | "ad_hoc";
};

type Organizer = {
  id: string;
  displayName: string | null;
  avatarColor: string | null;
  avatarUrl: string | null;
  telegramUsername: string | null;
};

type Attendee = {
  memberId: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
};

type ActiveMember = {
  id: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
};

type Props = {
  meeting: Meeting;
  organizer: Organizer | null;
  attendees: Attendee[];
  activeMembers: ActiveMember[];
  currentUserId: string;
};

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function pluralDays(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "день";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "дня";
  return "дней";
}

function formatCountdown(days: number): string {
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  if (days > 1) return `Через ${days} ${pluralDays(days)}`;
  return `Было ${-days} ${pluralDays(-days)} назад`;
}

function statusLabel(status: Meeting["status"]): string {
  if (status === "scheduled") return "Запланирована";
  if (status === "completed") return "Проведена";
  return "Отменена";
}

export function MeetingDetailClient({
  meeting,
  organizer,
  attendees: initialAttendees,
  activeMembers,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [attendees, setAttendees] = useState(initialAttendees);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amAttending = attendees.some((a) => a.memberId === currentUserId);
  const canRsvp = meeting.kind === "ad_hoc" && meeting.status === "scheduled";
  const days = daysUntil(meeting.date);

  async function toggleRsvp() {
    setBusy(true);
    setError(null);
    try {
      const method = amAttending ? "DELETE" : "POST";
      const res = await fetch(`/api/meetings/${meeting.id}/attend`, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        setError(data.error ?? "Ошибка сервера");
        return;
      }
      router.refresh();
      // Оптимистичное обновление локального стейта — полная правда придёт после refresh.
      if (amAttending) {
        setAttendees((prev) => prev.filter((a) => a.memberId !== currentUserId));
      } else {
        const me = activeMembers.find((x) => x.id === currentUserId);
        if (me) {
          setAttendees((prev) => [
            ...prev,
            {
              memberId: me.id,
              displayName: me.displayName,
              avatarColor: me.avatarColor,
              avatarUrl: me.avatarUrl,
              telegramUsername: me.telegramUsername,
            },
          ]);
        }
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
      >
        ← К календарю
      </Link>

      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded-full text-xs border bg-lumm-gold/10 text-lumm-gold border-lumm-gold/30">
          {meeting.kind === "standard" ? "Мастермайнд" : "Доп. встреча"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs border ${
            meeting.status === "scheduled"
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : meeting.status === "cancelled"
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-lumm-gray-light/10 text-lumm-text-secondary border-lumm-gray-light"
          }`}
        >
          {statusLabel(meeting.status)}
        </span>
      </div>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Когда</h2>
        <p className="text-lumm-text-primary">
          {formatDate(meeting.date)} · {meeting.timeStart}–{meeting.timeEnd}
        </p>
        <p className="text-sm text-lumm-text-secondary">{formatCountdown(days)}</p>
      </section>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Где</h2>
        <p className="text-lumm-text-primary">{meeting.location ?? "не указан"}</p>
      </section>

      {meeting.price !== null && meeting.price > 0 && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Сколько</h2>
          <p className="text-lumm-text-primary">
            {formatRub(meeting.price)}
            {activeMembers.length > 0 && (
              <span className="text-lumm-gold">
                {" "}
                ({formatRub(meeting.price / activeMembers.length)} / чел, делится на {activeMembers.length})
              </span>
            )}
          </p>
        </section>
      )}

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Организатор</h2>
        {organizer ? (
          <div className="flex items-center gap-3">
            <Avatar
              displayName={organizer.displayName ?? "?"}
              avatarColor={organizer.avatarColor ?? "#c9a84c"}
              avatarUrl={organizer.avatarUrl}
              size="md"
            />
            <div>
              <p className="text-lumm-text-primary">{organizer.displayName}</p>
              {organizer.telegramUsername && (
                <p className="text-sm text-lumm-text-secondary">@{organizer.telegramUsername}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-lumm-text-secondary">Ещё не назначен</p>
        )}
      </section>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-lumm-text-primary">
            {meeting.kind === "ad_hoc"
              ? `Идут: ${attendees.length}${activeMembers.length > 0 ? ` / ${activeMembers.length}` : ""}`
              : "Участники"}
          </h2>
          {canRsvp && (
            <button
              onClick={toggleRsvp}
              disabled={busy}
              className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${
                amAttending
                  ? "border border-lumm-gray-light text-lumm-text-secondary hover:text-lumm-text-primary"
                  : "bg-lumm-gold text-lumm-dark hover:bg-lumm-gold-light"
              }`}
            >
              {busy ? "..." : amAttending ? "Отменить запись" : "Записаться"}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {meeting.kind === "ad_hoc" ? (
          attendees.length === 0 ? (
            <p className="text-sm text-lumm-text-secondary">Пока никто не записался.</p>
          ) : (
            <ul className="space-y-2">
              {attendees.map((a) => (
                <li key={a.memberId} className="flex items-center gap-3">
                  <Avatar
                    displayName={a.displayName}
                    avatarColor={a.avatarColor}
                    avatarUrl={a.avatarUrl}
                    size="sm"
                  />
                  <span className="text-sm text-lumm-text-primary">{a.displayName}</span>
                  {a.telegramUsername && (
                    <span className="text-xs text-lumm-text-secondary">@{a.telegramUsername}</span>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="space-y-2">
            {activeMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar
                  displayName={m.displayName}
                  avatarColor={m.avatarColor}
                  avatarUrl={m.avatarUrl}
                  size="sm"
                />
                <span className="text-sm text-lumm-text-primary">{m.displayName}</span>
                {m.id === meeting.organizerId && (
                  <span className="text-xs text-lumm-gold border border-lumm-gold/30 rounded px-1.5 py-0.5">
                    ведёт
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type Status = "new" | "in_progress" | "done" | "rejected";

type Item = {
  id: string;
  text: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  memberId: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
};

type Props = {
  items: Item[];
  isAdmin: boolean;
};

const STATUS_LABEL: Record<Status, string> = {
  new: "Новый",
  in_progress: "В работе",
  done: "Готово",
  rejected: "Отклонено",
};

const STATUS_CLASS: Record<Status, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  done: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackClient({ items: initialItems, isAdmin }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);

  const counts = items.reduce(
    (acc, it) => {
      acc[it.status] += 1;
      return acc;
    },
    { new: 0, in_progress: 0, done: 0, rejected: 0 } as Record<Status, number>,
  );

  async function changeStatus(id: string, next: Status) {
    setBusy(id);
    const res = await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(null);
    if (res.ok) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: next } : it)));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Ошибка" }));
      alert(data.error ?? "Ошибка");
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Удалить штурвал?")) return;
    setBusy(id);
    const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Ошибка" }));
      alert(data.error ?? "Ошибка");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Штурвал</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          Идеи, правки, баги. Пиши боту в группе:{" "}
          <code className="text-lumm-gold">@lummbrain_bot штурвал &lt;текст&gt;</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.new}`}>
          Новых: {counts.new}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.in_progress}`}>
          В работе: {counts.in_progress}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.done}`}>
          Готово: {counts.done}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.rejected}`}>
          Отклонено: {counts.rejected}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center text-lumm-text-secondary">
          Пока пусто. Напиши боту в группе:{" "}
          <code className="text-lumm-gold">@lummbrain_bot штурвал &lt;текст&gt;</code>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="bg-lumm-black border border-lumm-gray-light rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  displayName={it.displayName}
                  avatarColor={it.avatarColor}
                  avatarUrl={it.avatarUrl}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-lumm-text-primary">{it.displayName}</span>
                    <span className="text-xs text-lumm-text-secondary">{formatDate(it.createdAt)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS[it.status]}`}>
                      {STATUS_LABEL[it.status]}
                    </span>
                  </div>
                  <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans mt-2">
                    {it.text}
                  </pre>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-2 border-t border-lumm-gray-light/50">
                  <select
                    value={it.status}
                    onChange={(e) => changeStatus(it.id, e.target.value as Status)}
                    disabled={busy === it.id}
                    className="bg-lumm-gray border border-lumm-gray-light rounded px-2 py-1 text-sm text-lumm-text-primary disabled:opacity-50"
                  >
                    <option value="new">Новый</option>
                    <option value="in_progress">В работе</option>
                    <option value="done">Готово</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                  <button
                    onClick={() => removeItem(it.id)}
                    disabled={busy === it.id}
                    className="text-xs text-red-400 border border-red-500/30 rounded px-2 py-1 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

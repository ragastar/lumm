"use client";

import { useState } from "react";

type Member = {
  id: string;
  username: string | null;
  displayName: string;
  role: string;
  status: string;
  avatarColor: string;
  createdAt: string;
  telegramId: string | null;
  telegramUsername: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function MembersClient({
  initialMembers,
  currentUserId,
}: {
  initialMembers: Member[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [resetMember, setResetMember] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [tgDrafts, setTgDrafts] = useState<Record<string, string>>({});
  const [tgBusy, setTgBusy] = useState<string | null>(null);
  const [tgUserDrafts, setTgUserDrafts] = useState<Record<string, string>>({});
  const [tgUserBusy, setTgUserBusy] = useState<string | null>(null);

  const resetPassword = async (member: Member) => {
    setBusyId(member.id);
    const res = await fetch(`/api/admin/members/${member.id}/reset-password`, {
      method: "POST",
    });
    setBusyId(null);
    if (res.ok) {
      const data = await res.json();
      setResetMember(member);
      setNewPassword(data.password);
      setCopied(false);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Не удалось сбросить пароль");
    }
  };

  const toggleStatus = async (member: Member) => {
    const nextStatus = member.status === "active" ? "inactive" : "active";
    setBusyId(member.id);
    const res = await fetch(`/api/admin/members/${member.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusyId(null);
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)),
      );
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Не удалось изменить статус");
    }
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    setCopied(true);
  };

  const closeModal = () => {
    setResetMember(null);
    setNewPassword(null);
    setCopied(false);
  };

  const activateGoals = async () => {
    const preview = `Друзья, команда Level Up!\n\nВремя зафиксировать цели на этот сезон — бизнес и спорт.\n\nЗайди в https://lumm.space/profile → «Мои цели».\n\nКак заполнимся — двинем дальше по программе.`;
    if (!confirm(`Отправить в групповой чат:\n\n${preview}`)) return;
    setActivating(true);
    const res = await fetch("/api/admin/activate-goals", { method: "POST" });
    setActivating(false);
    if (res.ok) {
      alert("Сообщение отправлено в группу");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Ошибка: ${data.error || res.statusText}`);
    }
  };

  const saveTelegramId = async (memberId: string) => {
    const draft = tgDrafts[memberId] ?? "";
    setTgBusy(memberId);
    const res = await fetch(`/api/admin/members/${memberId}/telegram-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: draft.trim() || null }),
    });
    setTgBusy(null);
    if (res.ok) {
      alert("Telegram ID сохранён");
      location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Ошибка: ${data.error || res.statusText}`);
    }
  };

  const saveTelegramUsername = async (memberId: string) => {
    const draft = tgUserDrafts[memberId] ?? "";
    setTgUserBusy(memberId);
    const res = await fetch(`/api/admin/members/${memberId}/telegram-username`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramUsername: draft.trim() || null }),
    });
    setTgUserBusy(null);
    if (res.ok) {
      alert("@username сохранён");
      location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Ошибка: ${data.error || res.statusText}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-lumm-text-primary">Участники</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">
            Управление участниками группы: сброс паролей, деактивация
          </p>
        </div>
        <button
          onClick={activateGoals}
          disabled={activating}
          className="bg-lumm-gold text-lumm-black font-medium px-4 py-2 rounded-lg disabled:opacity-50 text-sm whitespace-nowrap"
        >
          {activating ? "Пингую..." : "Пингануть команду"}
        </button>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                <th className="text-left px-4 py-3 font-normal">Участник</th>
                <th className="text-left px-4 py-3 font-normal">Логин</th>
                <th className="text-left px-4 py-3 font-normal">Роль</th>
                <th className="text-left px-4 py-3 font-normal">Статус</th>
                <th className="text-left px-4 py-3 font-normal">Создан</th>
                <th className="text-left p-3 text-sm text-lumm-text-secondary">Telegram ID</th>
                <th className="text-left p-3 text-sm text-lumm-text-secondary">@username</th>
                <th className="text-right px-4 py-3 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isCurrent = m.id === currentUserId;
                const isBusy = busyId === m.id;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-lumm-dark shrink-0"
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {m.displayName[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-lumm-text-primary">{m.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-lumm-text-primary">
                      {m.username || <span className="text-lumm-text-secondary">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-lumm-text-primary">{m.role}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          m.status === "active" ? "text-green-400" : "text-lumm-text-secondary"
                        }
                      >
                        {m.status === "active" ? "Активен" : "Неактивен"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-lumm-text-primary">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={m.telegramId ?? ""}
                          onChange={(e) => setTgDrafts({ ...tgDrafts, [m.id]: e.target.value })}
                          placeholder="напр. 123456789"
                          className="bg-lumm-gray-dark border border-lumm-gray-light rounded px-2 py-1 text-sm w-36"
                        />
                        <button
                          onClick={() => saveTelegramId(m.id)}
                          disabled={tgBusy === m.id}
                          className="text-xs bg-lumm-gray-light px-2 py-1 rounded disabled:opacity-50"
                        >
                          {tgBusy === m.id ? "..." : "✓"}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={m.telegramUsername ?? ""}
                          onChange={(e) =>
                            setTgUserDrafts({ ...tgUserDrafts, [m.id]: e.target.value })
                          }
                          placeholder="напр. s_lipin"
                          className="bg-lumm-gray-dark border border-lumm-gray-light rounded px-2 py-1 text-sm w-32"
                        />
                        <button
                          onClick={() => saveTelegramUsername(m.id)}
                          disabled={tgUserBusy === m.id}
                          className="text-xs bg-lumm-gray-light px-2 py-1 rounded disabled:opacity-50"
                        >
                          {tgUserBusy === m.id ? "..." : "✓"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        {m.username && (
                          <button
                            onClick={() => resetPassword(m)}
                            disabled={isBusy}
                            className="text-sm text-lumm-gold hover:text-lumm-gold-light disabled:opacity-50"
                          >
                            Сбросить пароль
                          </button>
                        )}
                        {!isCurrent && (
                          <button
                            onClick={() => toggleStatus(m)}
                            disabled={isBusy}
                            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {m.status === "active" ? "Деактивировать" : "Активировать"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-lumm-text-secondary">
        Чтобы узнать свой Telegram ID — напиши в Telegram боту <code className="text-lumm-gold">@userinfobot</code>, он ответит числом.
      </p>

      {resetMember && newPassword && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-lumm-text-primary mb-2">
              Новый пароль для {resetMember.displayName}
            </h2>
            <p className="text-sm text-lumm-text-secondary mb-4">
              Скопируйте пароль сейчас — после закрытия окна его нельзя будет посмотреть снова.
            </p>
            <div className="bg-lumm-gray border border-lumm-gray-light rounded-lg px-4 py-3 mb-4 font-mono text-lumm-gold text-lg break-all">
              {newPassword}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyPassword}
                className="flex-1 px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
              >
                {copied ? "Скопировано!" : "Скопировать"}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-lumm-gray border border-lumm-gray-light text-lumm-text-primary rounded-lg hover:bg-lumm-gray-light transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

const AVATAR_COLORS = [
  "#c9a84c", "#e06c75", "#61afef", "#98c379",
  "#c678dd", "#e5c07b", "#56b6c2", "#be5046",
];

type MyFeedback = {
  id: string;
  text: string;
  status: "new" | "in_progress" | "done" | "rejected";
  createdAt: string;
};

const STATUS_LABEL = { new: "Новый", in_progress: "В работе", done: "Готово", rejected: "Отклонено" } as const;
const STATUS_CLASS = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  done: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
} as const;

type Props = {
  initial: {
    displayName: string;
    avatarColor: string;
    avatarUrl: string | null;
    role: string;
    hasPassword: boolean;
    businessGoal: string | null;
    sportGoal: string | null;
  };
  mySteering: MyFeedback[];
  myGoalSummary: { id: string; wish: string } | null;
};

export function ProfileClient({ initial, mySteering, myGoalSummary }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [avatarMsg, setAvatarMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [businessGoal, setBusinessGoal] = useState(initial.businessGoal ?? "");
  const [sportGoal, setSportGoal] = useState(initial.sportGoal ?? "");
  const [goalsMsg, setGoalsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  const uploadAvatar = async (file: File) => {
    setAvatarMsg(null);
    setAvatarLoading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/auth/avatar", { method: "POST", body: fd });
    setAvatarLoading(false);

    if (res.ok) {
      const data = await res.json();
      setAvatarUrl(data.avatarUrl);
      setAvatarMsg({ type: "ok", text: "Аватар обновлён" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setAvatarMsg({ type: "err", text: data.error || "Ошибка загрузки" });
    }
  };

  const removeAvatar = async () => {
    setAvatarMsg(null);
    setAvatarLoading(true);
    const res = await fetch("/api/auth/avatar", { method: "DELETE" });
    setAvatarLoading(false);
    if (res.ok) {
      setAvatarUrl(null);
      setAvatarMsg({ type: "ok", text: "Аватар удалён" });
      router.refresh();
    } else {
      setAvatarMsg({ type: "err", text: "Не удалось удалить" });
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim(), avatarColor }),
    });
    setProfileLoading(false);
    if (res.ok) {
      setProfileMsg({ type: "ok", text: "Сохранено" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setProfileMsg({ type: "err", text: data.error || "Ошибка" });
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 6) {
      setPwMsg({ type: "err", text: "Новый пароль — минимум 6 символов" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "Новые пароли не совпадают" });
      return;
    }

    setPwLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPwLoading(false);
    if (res.ok) {
      setPwMsg({ type: "ok", text: "Пароль изменён" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json().catch(() => ({}));
      setPwMsg({ type: "err", text: data.error || "Ошибка" });
    }
  };

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalsMsg(null);
    setGoalsLoading(true);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessGoal: businessGoal.trim() || null,
        sportGoal: sportGoal.trim() || null,
      }),
    });
    setGoalsLoading(false);
    if (res.ok) {
      setGoalsMsg({ type: "ok", text: "Цели сохранены" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setGoalsMsg({ type: "err", text: data.error || "Ошибка сохранения" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Мой профиль</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          Ваши публичные данные видны другим участникам группы
        </p>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5">
        <h2 className="text-xl font-bold text-lumm-text-primary">Аватар</h2>

        <div className="flex items-center gap-6">
          <Avatar
            displayName={displayName}
            avatarColor={avatarColor}
            avatarUrl={avatarUrl}
            size="lg"
          />

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors text-sm"
            >
              {avatarLoading ? "Загрузка..." : avatarUrl ? "Заменить картинку" : "Загрузить картинку"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={avatarLoading}
                className="px-4 py-2 bg-lumm-gray border border-lumm-gray-light text-red-400 rounded-lg hover:bg-lumm-gray-light disabled:opacity-50 transition-colors text-sm"
              >
                Удалить картинку
              </button>
            )}
          </div>
        </div>

        {avatarMsg && (
          <p className={`text-sm ${avatarMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
            {avatarMsg.text}
          </p>
        )}

        <p className="text-xs text-lumm-text-secondary">
          До 5MB. JPG, PNG или WebP. Картинка автоматически обрезается до квадрата 256×256.
          Если картинки нет — показывается цветной кружок с первой буквой ника.
        </p>
      </div>

      <form
        onSubmit={saveProfile}
        className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5"
      >
        <h2 className="text-xl font-bold text-lumm-text-primary">Публичные данные</h2>

        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Никнейм</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="block text-sm text-lumm-text-secondary mb-2">
            Цвет аватара (используется, если нет картинки)
          </label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`w-8 h-8 rounded-full transition-all ${
                  avatarColor === color
                    ? "ring-2 ring-lumm-text-primary ring-offset-2 ring-offset-lumm-black scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {profileMsg && (
          <p className={`text-sm ${profileMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
            {profileMsg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={profileLoading}
          className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
        >
          {profileLoading ? "Сохранение..." : "Сохранить"}
        </button>
      </form>

      <form
        onSubmit={saveGoals}
        className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-lumm-text-primary">Мои цели</h2>
        <p className="text-sm text-lumm-text-secondary">
          Эти цели видны другим участникам группы. Бот сверяет с ними твои еженедельные отчёты.
        </p>
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Бизнес-цель</label>
          <textarea
            value={businessGoal}
            onChange={(e) => setBusinessGoal(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-3 text-lumm-text-primary"
            placeholder="Например: запустить новый продукт, выйти на выручку X"
          />
          <p className="text-xs text-lumm-text-secondary mt-1">{businessGoal.length}/500</p>
        </div>
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Спортивная цель</label>
          <textarea
            value={sportGoal}
            onChange={(e) => setSportGoal(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-3 text-lumm-text-primary"
            placeholder="Например: полумарафон за 1:45, подтягивания 15 раз"
          />
          <p className="text-xs text-lumm-text-secondary mt-1">{sportGoal.length}/500</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={goalsLoading}
            className="bg-lumm-gold text-lumm-black font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {goalsLoading ? "Сохраняю..." : "Сохранить цели"}
          </button>
          {goalsMsg && (
            <span className={`text-sm ${goalsMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
              {goalsMsg.text}
            </span>
          )}
        </div>
      </form>

      <section className="bg-lumm-black border border-lumm-gold/30 rounded-xl p-6 space-y-3 relative overflow-hidden">
        <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] uppercase tracking-wider bg-lumm-gold text-lumm-dark rounded font-bold">
          NEW
        </div>
        <h2 className="text-lg font-semibold text-lumm-text-primary">
          LUMM Goal System <span className="text-lumm-text-secondary font-normal">· Wombo Combo</span>
        </h2>
        {myGoalSummary ? (
          <>
            <p className="text-sm text-lumm-text-secondary leading-relaxed">Твоя структурная цель:</p>
            <p className="text-base text-lumm-text-primary leading-snug">{myGoalSummary.wish}</p>
            <a
              href="/goal/my"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lumm-gold text-lumm-dark font-medium hover:bg-lumm-gold-light transition-colors text-sm"
            >
              Открыть мою цель
            </a>
          </>
        ) : (
          <>
            <p className="text-sm text-lumm-text-secondary leading-relaxed">
              Серьёзная постановка цели на 12 недель — WOOP, HARD, 12 Week Year и две психометрические шкалы качества в одном шаблоне.
            </p>
            <a
              href="/goal"
              className="btn-shimmer inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm"
            >
              Узнать и попробовать
            </a>
          </>
        )}
      </section>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Мой штурвал</h2>
        <p className="text-xs text-lumm-text-secondary">
          Идеи / баги / правки через бот:{" "}
          <code className="text-lumm-gold">@lummbrain_bot штурвал &lt;текст&gt;</code>
        </p>
        {mySteering.length === 0 ? (
          <p className="text-sm text-lumm-text-secondary">Пока пусто.</p>
        ) : (
          <ul className="space-y-2">
            {mySteering.map((it) => (
              <li key={it.id} className="text-sm text-lumm-text-primary">
                <span className={`px-2 py-0.5 rounded-full text-xs border mr-2 ${STATUS_CLASS[it.status]}`}>
                  {STATUS_LABEL[it.status]}
                </span>
                <span className="text-xs text-lumm-text-secondary mr-2">
                  {new Date(it.createdAt).toLocaleDateString("ru-RU")}
                </span>
                <span className="whitespace-pre-wrap">{it.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {initial.hasPassword && (
        <form
          onSubmit={changePassword}
          className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5"
        >
          <h2 className="text-xl font-bold text-lumm-text-primary">Смена пароля</h2>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Текущий пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Подтвердите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
              minLength={6}
            />
          </div>

          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
              {pwMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
          >
            {pwLoading ? "Изменение..." : "Изменить пароль"}
          </button>
        </form>
      )}
    </div>
  );
}

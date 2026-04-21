"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = [
  "#c9a84c", "#e06c75", "#61afef", "#98c379",
  "#c678dd", "#e5c07b", "#56b6c2", "#be5046",
];

type Props = {
  initial: {
    displayName: string;
    avatarColor: string;
    role: string;
    hasPassword: boolean;
  };
};

export function ProfileClient({ initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

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

  const initial0 = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Мой профиль</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          Ваши публичные данные видны другим участникам группы
        </p>
      </div>

      <form
        onSubmit={saveProfile}
        className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5"
      >
        <h2 className="text-xl font-bold text-lumm-text-primary">Публичные данные</h2>

        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-lumm-dark transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {initial0}
          </div>
        </div>

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
          <label className="block text-sm text-lumm-text-secondary mb-2">Цвет аватара</label>
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

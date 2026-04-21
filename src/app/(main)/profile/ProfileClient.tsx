"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

const AVATAR_COLORS = [
  "#c9a84c", "#e06c75", "#61afef", "#98c379",
  "#c678dd", "#e5c07b", "#56b6c2", "#be5046",
];

type Props = {
  initial: {
    displayName: string;
    avatarColor: string;
    avatarUrl: string | null;
    role: string;
    hasPassword: boolean;
  };
};

export function ProfileClient({ initial }: Props) {
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

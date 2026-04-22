"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = [
  "#c9a84c", "#e06c75", "#61afef", "#98c379",
  "#c678dd", "#e5c07b", "#56b6c2", "#be5046",
];

export default function OnboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) router.replace("/login");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (displayName.trim().length < 2) {
      setError("Никнейм должен быть минимум 2 символа");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim(), avatarColor }),
    });
    const data = await res.json();

    if (res.ok) {
      router.push("/");
    } else {
      setError(data.error || "Ошибка сохранения");
      setLoading(false);
    }
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="w-full max-w-sm">
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-lumm-gold">Добро пожаловать в LUMM</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">Выберите никнейм и цвет аватара</p>
        </div>

        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-lumm-dark transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Никнейм</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как вас называть в группе"
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Сохранение..." : "Начать"}
          </button>
        </form>
      </div>
    </div>
  );
}

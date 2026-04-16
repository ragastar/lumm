"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername) return;

    (window as unknown as Record<string, unknown>).onTelegramAuth = async (user: Record<string, unknown>) => {
      setError("");
      setLoading(true);
      const res = await fetch(`/api/invites/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "telegram", telegramData: user }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/onboard");
      } else {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
      }
    };

    const container = document.getElementById("telegram-login");
    if (container && !container.hasChildNodes()) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "8");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      container.appendChild(script);
    }
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/invites/${token}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "password", username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      router.push("/onboard");
    } else {
      setError(data.error || "Ошибка регистрации");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">Присоединиться к Level Up</p>
        </div>

        <div id="telegram-login" className="flex justify-center mb-6" />

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-lumm-gray-light" />
          <span className="text-xs text-lumm-text-secondary">или</span>
          <div className="flex-1 h-px bg-lumm-gray-light" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Подтвердите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Регистрация..." : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}

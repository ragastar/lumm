"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TelegramBotLogin } from "@/components/TelegramBotLogin";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (r.ok) router.replace("/");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push("/");
    } else {
      setError(data.error || "Ошибка входа");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">Level Up Mastermind</p>
        </div>

        <TelegramBotLogin
          purpose="login"
          onSuccess={(needsOnboarding) =>
            router.push(needsOnboarding ? "/onboard" : "/")
          }
          onError={(e) => setError(e)}
        />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-lumm-gray-light" />
          <span className="text-xs text-lumm-text-secondary">или логин и пароль</span>
          <div className="flex-1 h-px bg-lumm-gray-light" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
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
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

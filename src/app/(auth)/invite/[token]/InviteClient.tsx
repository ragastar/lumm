"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Подтвердите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
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
            {loading ? "Регистрация..." : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}

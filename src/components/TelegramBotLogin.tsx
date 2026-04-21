"use client";

import { useEffect, useRef, useState } from "react";

type Purpose = "login" | "invite";

type Props = {
  purpose: Purpose;
  inviteToken?: string;
  onSuccess: (needsOnboarding: boolean) => void;
  onError?: (error: string) => void;
};

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 5 * 60 * 1000;

export function TelegramBotLogin({ purpose, inviteToken, onSuccess, onError }: Props) {
  const [state, setState] = useState<"idle" | "opening" | "waiting" | "finalizing">("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  const handleError = (message: string) => {
    stopPolling();
    setState("idle");
    setError(message);
    onError?.(message);
  };

  const start = async () => {
    setError(null);
    setState("opening");

    const initRes = await fetch("/api/auth/telegram-login/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, inviteToken }),
    });

    if (!initRes.ok) {
      const data = await initRes.json().catch(() => ({}));
      handleError(data.error || "Не удалось начать вход");
      return;
    }

    const { nonce, url } = await initRes.json();

    window.open(url, "_blank");
    setState("waiting");

    timeoutRef.current = setTimeout(() => {
      handleError("Таймаут, попробуйте снова");
    }, TIMEOUT_MS);

    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(
        `/api/auth/telegram-login/status?nonce=${encodeURIComponent(nonce)}`,
      );

      if (!statusRes.ok) return;

      const data = await statusRes.json();

      if (data.status === "confirmed") {
        stopPolling();
        setState("finalizing");

        const finalRes = await fetch("/api/auth/telegram-login/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce }),
        });

        if (finalRes.ok) {
          const finalData = await finalRes.json();
          onSuccess(finalData.needsOnboarding);
        } else {
          const finalData = await finalRes.json().catch(() => ({}));
          handleError(finalData.error || "Ошибка завершения входа");
        }
      } else if (data.status === "expired" || data.status === "not_found") {
        handleError("Таймаут, попробуйте снова");
      }
    }, POLL_INTERVAL_MS);
  };

  const label = purpose === "invite" ? "Зарегистрироваться через Telegram" : "Войти через Telegram";
  const waitingLabel =
    state === "finalizing" ? "Вход..." : "Откройте Telegram и подтвердите...";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={state !== "idle"}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#54a9eb] text-white font-medium rounded-lg hover:bg-[#4a98d8] disabled:opacity-60 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 3L2 11l7 3 2 7 3-4 6 4 3-18z" />
        </svg>
        {state === "idle" ? label : waitingLabel}
      </button>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}

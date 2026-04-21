"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  displayName: string;
  role: string;
  avatarColor: string;
  telegramId: string | null;
};

export function UserMenu() {
  const [current, setCurrent] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrent(data));
  }, []);

  useEffect(() => {
    if (!linkMode) return;
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !widgetRef.current) return;

    (window as unknown as Record<string, unknown>).onTelegramLink = async (
      user: Record<string, unknown>,
    ) => {
      setLinkStatus("Привязываю...");
      const res = await fetch("/api/auth/link-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (res.ok) {
        setLinkStatus("Telegram привязан");
        setCurrent((prev) => (prev ? { ...prev, telegramId: String(user.id) } : prev));
        setTimeout(() => {
          setLinkMode(false);
          setLinkStatus(null);
          setOpen(false);
        }, 1500);
      } else {
        setLinkStatus(data.error || "Ошибка привязки");
      }
    };

    if (!widgetRef.current.hasChildNodes()) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "medium");
      script.setAttribute("data-radius", "8");
      script.setAttribute("data-onauth", "onTelegramLink(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      widgetRef.current.appendChild(script);
    }
  }, [linkMode]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!current) return null;

  const isAdmin = current.role === "admin";
  const hasTelegram = !!current.telegramId;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-lumm-gray/50 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-lumm-dark"
          style={{ backgroundColor: current.avatarColor }}
        >
          {current.displayName[0]?.toUpperCase()}
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-medium text-lumm-text-primary">{current.displayName}</p>
          <p className="text-xs text-lumm-text-secondary">{current.role}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-lumm-gray border border-lumm-gray-light rounded-lg shadow-xl overflow-hidden z-50">
          {isAdmin && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/admin/invites");
              }}
              className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
            >
              Приглашения
            </button>
          )}
          {!hasTelegram && !linkMode && (
            <button
              onClick={() => setLinkMode(true)}
              className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
            >
              Привязать Telegram
            </button>
          )}
          {linkMode && (
            <div className="px-3 py-3 flex flex-col items-center gap-2">
              <div ref={widgetRef} />
              {linkStatus && (
                <p className="text-xs text-lumm-text-secondary">{linkStatus}</p>
              )}
            </div>
          )}
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-lumm-gray-light transition-colors"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

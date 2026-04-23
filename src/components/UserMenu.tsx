"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

type Member = {
  id: string;
  displayName: string;
  role: string;
  avatarColor: string;
  avatarUrl: string | null;
};

export function UserMenu() {
  const [current, setCurrent] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrent(data));
  }, []);

  useEffect(() => {
    // Синхронизируем state с тем, что уже выставлено inline-скриптом в layout.
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("lumm-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("lumm-theme", "dark");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!current) return null;

  const isAdmin = current.role === "admin";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-lumm-gray/50 transition-colors"
      >
        <Avatar
          displayName={current.displayName}
          avatarColor={current.avatarColor}
          avatarUrl={current.avatarUrl}
          size="md"
        />
        <div className="text-left flex-1">
          <p className="text-sm font-medium text-lumm-text-primary">{current.displayName}</p>
          <p className="text-xs text-lumm-text-secondary">{current.role}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-lumm-gray border border-lumm-gray-light rounded-lg shadow-xl overflow-hidden z-50">
          <button
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
            className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
          >
            Мой профиль
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/invites");
                }}
                className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
              >
                Приглашения
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/members");
                }}
                className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
              >
                Управление участниками
              </button>
            </>
          )}
          <button
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors border-t border-lumm-gray-light/50"
          >
            {theme === "light" ? "🌙 Тёмная тема" : "☀️ Светлая тема"}
          </button>
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

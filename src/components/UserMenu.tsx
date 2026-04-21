"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  displayName: string;
  role: string;
  avatarColor: string;
};

export function UserMenu() {
  const [current, setCurrent] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrent(data));
  }, []);

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
                Участники
              </button>
            </>
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

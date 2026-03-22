"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  displayName: string;
  role: string;
  avatarColor: string;
};

export function UserSwitcher() {
  const [members, setMembers] = useState<Member[]>([]);
  const [current, setCurrent] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
    fetch("/api/auth/me").then((r) => r.json()).then(setCurrent);
  }, []);

  const switchUser = async (member: Member) => {
    await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id }),
    });
    setCurrent(member);
    setOpen(false);
    router.refresh();
  };

  if (!current) return null;

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
          {current.displayName[0]}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-lumm-text-primary">{current.displayName}</p>
          <p className="text-xs text-lumm-text-secondary">{current.role}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-lumm-gray border border-lumm-gray-light rounded-lg shadow-xl overflow-hidden z-50">
          <p className="px-3 py-2 text-xs text-lumm-text-secondary border-b border-lumm-gray-light">
            Переключить участника (демо)
          </p>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => switchUser(m)}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-lumm-gray-light transition-colors ${
                m.id === current.id ? "bg-lumm-gold/10" : ""
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-lumm-dark"
                style={{ backgroundColor: m.avatarColor }}
              >
                {m.displayName[0]}
              </div>
              <span className="text-sm">{m.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/reports", label: "Отчёты", icon: "◇" },
  { href: "/financials", label: "Финансы", icon: "◈" },
  { href: "/calendar", label: "Календарь", icon: "◎" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-lumm-black border-r border-lumm-gray-light flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-lumm-gray-light">
        <h1 className="text-2xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
        <p className="text-xs text-lumm-text-secondary mt-1">Level Up Mastermind</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/20"
                  : "text-lumm-text-secondary hover:text-lumm-text-primary hover:bg-lumm-gray/50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

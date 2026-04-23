"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserMenu } from "./UserMenu";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
};

const activeNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/reports", label: "Еженедельные", icon: "◇" },
  { href: "/financials", label: "Ежемесячные", icon: "◈" },
  { href: "/analytics", label: "Аналитика", icon: "◈" },
  { href: "/calendar", label: "Календарь", icon: "◎" },
  { href: "/goal", label: "Цель на 12 недель", icon: "🎯", badge: "NEW" },
  { href: "/feedback", label: "Штурвал", icon: "⚓" },
  { href: "/members", label: "Участники", icon: "◐", badge: "NEW" },
  { href: "/constitution", label: "Конституция", icon: "◩" },
  { href: "/help", label: "Как это работает", icon: "?" },
];

const inDevelopmentNav: NavItem[] = [
  { href: "/budget", label: "Бюджет", icon: "◉", disabled: true },
  { href: "/fines", label: "Штрафы", icon: "◫", disabled: true },
];

function renderNavItem(item: NavItem, active: boolean, onClick: () => void) {
  const inner = (
    <>
      <span className="text-lg">{item.icon}</span>
      <span className="font-medium">{item.label}</span>
      {item.badge && (
        <span className="ml-auto px-2 py-0.5 text-xs bg-lumm-gold text-lumm-dark rounded font-bold">
          {item.badge}
        </span>
      )}
    </>
  );

  if (item.disabled) {
    return (
      <div
        key={item.href}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-lumm-text-secondary/40 cursor-not-allowed select-none"
        title="В разработке"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active
          ? "bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/20"
          : "text-lumm-text-secondary hover:text-lumm-text-primary hover:bg-lumm-gray/50"
      }`}
    >
      {inner}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  const navContent = (
    <>
      <div className="p-6 border-b border-lumm-gray-light">
        <h1 className="text-2xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
        <p className="text-xs text-lumm-text-secondary mt-1">Level Up Mastermind</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {activeNav.map((item) => renderNavItem(item, pathname === item.href, close))}

        <div className="pt-4 pb-2 px-4">
          <div className="flex items-center gap-2">
            <div className="h-px bg-lumm-gray-light flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-lumm-text-secondary/60">
              в разработке
            </span>
            <div className="h-px bg-lumm-gray-light flex-1" />
          </div>
        </div>

        {inDevelopmentNav.map((item) => renderNavItem(item, pathname === item.href, close))}
      </nav>
      <div className="p-4 border-t border-lumm-gray-light">
        <UserMenu />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-lumm-black border-b border-lumm-gray-light flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-lumm-text-primary p-2"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-40 w-64 bg-lumm-black h-screen flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-lumm-black border-r border-lumm-gray-light flex-col h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>
    </>
  );
}

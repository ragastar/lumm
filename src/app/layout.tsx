import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { UserSwitcher } from "@/components/UserSwitcher";

export const metadata: Metadata = {
  title: "LUMM — Level Up Mastermind",
  description: "Mastermind group management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-lumm-dark flex">
        <div className="flex min-h-screen w-full">
          <aside className="w-64 bg-lumm-black border-r border-lumm-gray-light flex flex-col h-screen sticky top-0">
            <Sidebar />
            <div className="p-4 border-t border-lumm-gray-light">
              <UserSwitcher />
            </div>
          </aside>
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

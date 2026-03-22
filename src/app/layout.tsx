import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "LUMM — Level Up Mastermind",
  description: "Mastermind group management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-lumm-dark">
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 overflow-y-auto pt-16 md:pt-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

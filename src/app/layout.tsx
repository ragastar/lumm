import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUMM — Level Up Mastermind",
  description: "Mastermind group management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-lumm-dark">
        {children}
      </body>
    </html>
  );
}

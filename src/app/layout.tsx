import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lumm.space"),
  title: "LUMM — Level Up Mastermind",
  description: "Mastermind group management platform",
};

// Inline-скрипт: читаем localStorage и выставляем data-theme до первой отрисовки,
// чтобы избежать flash нежелательной темы при загрузке.
const themeInitScript = `(function(){try{var t=localStorage.getItem('lumm-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-lumm-dark">
        {children}
      </body>
    </html>
  );
}

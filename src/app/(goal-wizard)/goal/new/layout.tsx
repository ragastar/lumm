import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export default function GoalNewLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${manrope.variable} min-h-screen`}
      style={{ background: "#F5EFE6", color: "#1F1A16" }}
    >
      {children}
    </div>
  );
}

import type { Metadata } from "next";
import { HeroBlock } from "@/components/landing/HeroBlock";

export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
};

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pb-24 space-y-24">
      <HeroBlock />
    </div>
  );
}

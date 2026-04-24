import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
};

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 space-y-24">
      <p className="text-lumm-text-secondary">Лендинг в разработке.</p>
    </div>
  );
}

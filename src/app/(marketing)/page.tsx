import type { Metadata } from "next";
import { HeroBlock } from "@/components/landing/HeroBlock";
import { MirrorBlock } from "@/components/landing/MirrorBlock";
import { CouncilQuoteBlock } from "@/components/landing/CouncilQuoteBlock";
import { YearRhythmBlock } from "@/components/landing/YearRhythmBlock";
import { DayInClubBlock } from "@/components/landing/DayInClubBlock";
import { BuddyBlock } from "@/components/landing/BuddyBlock";
import { ConfidentialityBlock } from "@/components/landing/ConfidentialityBlock";
import { EngineBridgeBlock } from "@/components/landing/EngineBridgeBlock";
import { GoalSystemBlock } from "@/components/landing/GoalSystemBlock";
import { WeeklyReportBlock } from "@/components/landing/WeeklyReportBlock";
import { FinancialsBlock } from "@/components/landing/FinancialsBlock";
import { SteeringBlock } from "@/components/landing/SteeringBlock";
import { SmartCalendarBlock } from "@/components/landing/SmartCalendarBlock";
import { FinesBlock } from "@/components/landing/FinesBlock";

export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
};

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pb-24 space-y-24">
      <HeroBlock />
      <MirrorBlock />
      <CouncilQuoteBlock />
      <YearRhythmBlock />
      <DayInClubBlock />
      <BuddyBlock />
      <ConfidentialityBlock />
      <EngineBridgeBlock />
      <GoalSystemBlock />
      <WeeklyReportBlock />
      <FinancialsBlock />
      <SteeringBlock />
      <SmartCalendarBlock />
      <FinesBlock />
    </div>
  );
}

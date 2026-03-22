import { db } from "@/db";
import { members, weeklyReports, monthlyFinancials, meetings } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { getCurrentMemberId } from "@/lib/session";
import { DashboardClient } from "./DashboardClient";

export default async function Home() {
  // Get current member (from cookie or default to first)
  const memberId = await getCurrentMemberId();
  const allMembers = await db.select().from(members);

  if (allMembers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lumm-text-secondary text-lg">Нет участников. Запустите seed.</p>
      </div>
    );
  }

  const currentMember = memberId
    ? allMembers.find((m) => m.id === memberId) ?? allMembers[0]
    : allMembers[0];

  // Fetch last 8 weekly reports
  const reports = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.memberId, currentMember.id))
    .orderBy(desc(weeklyReports.weekStart))
    .limit(8);

  // Fetch last 6 monthly financials
  const financials = await db
    .select()
    .from(monthlyFinancials)
    .where(eq(monthlyFinancials.memberId, currentMember.id))
    .orderBy(desc(monthlyFinancials.month))
    .limit(6);

  // Fetch next scheduled meeting
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = await db
    .select()
    .from(meetings)
    .where(gte(meetings.date, today))
    .orderBy(meetings.date)
    .limit(1);

  let nextMeeting: {
    id: string;
    date: string;
    location: string | null;
    organizerName: string | null;
  } | null = null;

  if (upcomingMeetings.length > 0) {
    const m = upcomingMeetings[0];
    let organizerName: string | null = null;
    if (m.organizerId) {
      const organizer = allMembers.find((mb) => mb.id === m.organizerId);
      organizerName = organizer?.displayName ?? null;
    }
    nextMeeting = {
      id: m.id,
      date: m.date,
      location: m.location,
      organizerName,
    };
  }

  return (
    <DashboardClient
      member={currentMember}
      reports={reports}
      financials={financials}
      nextMeeting={nextMeeting}
    />
  );
}

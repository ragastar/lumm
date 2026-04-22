import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AnalyticsClient } from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const allMembers = await db.select().from(members);

  const allFinancials = await db
    .select()
    .from(monthlyFinancials)
    .orderBy(desc(monthlyFinancials.month));

  // Group financials by member
  const byMember = new Map<string, (typeof allFinancials)>();
  for (const f of allFinancials) {
    if (!byMember.has(f.memberId)) byMember.set(f.memberId, []);
    byMember.get(f.memberId)!.push(f);
  }

  // Get unique months (sorted chronologically)
  const months = [...new Set(allFinancials.map((f) => f.month))].sort();

  // Build per-month group totals
  const monthlyTotals = months.map((month) => {
    const monthData = allFinancials.filter((f) => f.month === month);
    return {
      month,
      revenue: monthData.reduce((s, f) => s + (f.revenue ?? 0), 0),
      profit: monthData.reduce((s, f) => s + (f.netProfit ?? 0), 0),
      members: monthData.length,
    };
  });

  // Latest month data per member
  const latestMonth = months[months.length - 1];
  const latestData = allFinancials.filter((f) => f.month === latestMonth);

  const memberStats = allMembers.map((m) => {
    const latest = latestData.find((f) => f.memberId === m.id);
    const history = byMember.get(m.id) ?? [];
    return {
      id: m.id,
      name: m.displayName,
      color: m.avatarColor,
      revenue: latest?.revenue ?? 0,
      profit: latest?.netProfit ?? 0,
      revenueHistory: [...history].reverse().map((f) => f.revenue ?? 0),
    };
  });

  const totalRevenue = memberStats.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = memberStats.reduce((s, m) => s + m.profit, 0);

  return (
    <AnalyticsClient
      memberStats={memberStats}
      monthlyTotals={monthlyTotals}
      totalRevenue={totalRevenue}
      totalProfit={totalProfit}
      latestMonth={latestMonth}
    />
  );
}

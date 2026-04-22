import { redirect } from "next/navigation";
import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { FinancialsClient } from "./FinancialsClient";

export const dynamic = "force-dynamic";

export default async function FinancialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const feed = await db
    .select({
      id: monthlyFinancials.id,
      month: monthlyFinancials.month,
      revenue: monthlyFinancials.revenue,
      netProfit: monthlyFinancials.netProfit,
      capital: monthlyFinancials.capital,
      scoreBusiness: monthlyFinancials.scoreBusiness,
      scoreFamily: monthlyFinancials.scoreFamily,
      scorePersonal: monthlyFinancials.scorePersonal,
      createdAt: monthlyFinancials.createdAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
    })
    .from(monthlyFinancials)
    .innerJoin(members, eq(members.id, monthlyFinancials.memberId))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(monthlyFinancials.month), desc(monthlyFinancials.createdAt));

  return (
    <FinancialsClient
      currentMember={{ id: user.id, displayName: user.displayName }}
      feed={feed}
    />
  );
}

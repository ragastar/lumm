import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentMemberId } from "@/lib/session";
import { FinancialsClient } from "./FinancialsClient";

export const dynamic = "force-dynamic";

export default async function FinancialsPage() {
  const memberId = await getCurrentMemberId();
  const allMembers = await db.select().from(members);

  const currentMember = memberId
    ? allMembers.find((m) => m.id === memberId) ?? allMembers[0]
    : allMembers[0];

  const myFinancials = await db
    .select()
    .from(monthlyFinancials)
    .where(eq(monthlyFinancials.memberId, currentMember.id))
    .orderBy(desc(monthlyFinancials.month));

  return <FinancialsClient member={currentMember} financials={myFinancials} />;
}

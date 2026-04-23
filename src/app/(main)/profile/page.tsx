import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ProfileClient } from "./ProfileClient";
import { db } from "@/db";
import { feedbackItems, goalPlans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const mySteering = await db
    .select({
      id: feedbackItems.id,
      text: feedbackItems.text,
      status: feedbackItems.status,
      createdAt: feedbackItems.createdAt,
    })
    .from(feedbackItems)
    .where(eq(feedbackItems.memberId, user.id))
    .orderBy(desc(feedbackItems.createdAt));

  const planRows = await db
    .select({ id: goalPlans.id, wish: goalPlans.wish })
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);
  const myGoalSummary = planRows.length > 0 ? { id: planRows[0].id, wish: planRows[0].wish } : null;

  return (
    <ProfileClient
      initial={{
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarUrl: user.avatarUrl,
        role: user.role,
        hasPassword: !!user.passwordHash,
        businessGoal: user.businessGoal,
        sportGoal: user.sportGoal,
      }}
      mySteering={mySteering}
      myGoalSummary={myGoalSummary}
    />
  );
}

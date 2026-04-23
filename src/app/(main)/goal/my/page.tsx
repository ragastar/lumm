import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GoalView } from "../_components/GoalView";
import { GoalViewActions } from "./GoalViewActions";

export const dynamic = "force-dynamic";

export default async function MyGoalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db.select().from(goalPlans).where(eq(goalPlans.memberId, user.id)).limit(1);
  if (rows.length === 0) {
    redirect("/goal");
  }

  const plan = {
    ...rows[0],
    data: JSON.parse(rows[0].data) as Record<string, unknown>,
  };

  return <GoalView plan={plan} actions={<GoalViewActions />} />;
}

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GoalWizard } from "./GoalWizard";

export const dynamic = "force-dynamic";

export default async function GoalNewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db.select().from(goalPlans).where(eq(goalPlans.memberId, user.id)).limit(1);

  const initial = rows.length === 0 ? null : {
    wish: rows[0].wish,
    sphere: rows[0].sphere,
    sciScore: rows[0].sciScore,
    kleinAvg: rows[0].kleinAvg,
    difficulty: rows[0].difficulty,
    metricName: rows[0].metricName,
    metricStart: rows[0].metricStart,
    metricTarget: rows[0].metricTarget,
    data: JSON.parse(rows[0].data),
  };

  return <GoalWizard memberId={user.id} memberName={user.displayName} initial={initial} />;
}

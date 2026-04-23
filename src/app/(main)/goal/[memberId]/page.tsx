import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { goalPlans, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GoalView } from "../_components/GoalView";

export const dynamic = "force-dynamic";

export default async function OtherGoalPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { memberId } = await params;

  if (memberId === user.id) {
    redirect("/goal/my");
  }

  const memberRows = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, user.groupId)))
    .limit(1);

  if (memberRows.length === 0) notFound();

  const planRows = await db.select().from(goalPlans).where(eq(goalPlans.memberId, memberId)).limit(1);
  if (planRows.length === 0) notFound();

  const plan = {
    ...planRows[0],
    data: JSON.parse(planRows[0].data) as Record<string, unknown>,
  };

  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <Link
          href={`/members/${memberId}`}
          className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
        >
          ← Назад к {memberRows[0].displayName}
        </Link>
      </div>
      <GoalView plan={plan} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { feedbackItems, members } from "@/db/schema";
import { FeedbackClient } from "./FeedbackClient";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await db
    .select({
      id: feedbackItems.id,
      text: feedbackItems.text,
      status: feedbackItems.status,
      createdAt: feedbackItems.createdAt,
      updatedAt: feedbackItems.updatedAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
    })
    .from(feedbackItems)
    .innerJoin(members, eq(members.id, feedbackItems.memberId))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(feedbackItems.createdAt));

  return <FeedbackClient items={items} isAdmin={user.role === "admin"} />;
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MembersClient } from "./MembersClient";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const rows = await db
    .select({
      id: members.id,
      username: members.username,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      createdAt: members.createdAt,
      telegramId: members.telegramId,
    })
    .from(members)
    .where(eq(members.groupId, user.groupId));

  return <MembersClient initialMembers={rows} currentUserId={user.id} />;
}

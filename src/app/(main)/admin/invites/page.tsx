import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { invites, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { InvitesClient } from "./InvitesClient";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const rows = await db
    .select({
      id: invites.id,
      token: invites.token,
      expiresAt: invites.expiresAt,
      usedBy: invites.usedBy,
      usedAt: invites.usedAt,
      createdBy: invites.createdBy,
      usedByName: members.displayName,
    })
    .from(invites)
    .leftJoin(members, eq(invites.usedBy, members.id))
    .where(eq(invites.groupId, user.groupId));

  const invitesList = rows.map((r) => ({
    id: r.id,
    token: r.token,
    expiresAt: r.expiresAt,
    usedBy: r.usedBy,
    usedAt: r.usedAt,
    usedByName: r.usedByName,
  }));

  return <InvitesClient initialInvites={invitesList} />;
}

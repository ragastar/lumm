import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { invites } from "@/db/schema";
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
      maxUses: invites.maxUses,
      usedCount: invites.usedCount,
    })
    .from(invites)
    .where(eq(invites.groupId, user.groupId));

  return <InvitesClient initialInvites={rows} />;
}

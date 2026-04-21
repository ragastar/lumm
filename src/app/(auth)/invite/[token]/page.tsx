import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { InviteClient } from "./InviteClient";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  let errorMessage: string | null = null;

  if (result.length === 0) {
    errorMessage = "Приглашение не найдено";
  } else if (result[0].usedCount >= result[0].maxUses) {
    errorMessage = "Приглашение уже использовано";
  } else if (new Date(result[0].expiresAt) < new Date()) {
    errorMessage = "Приглашение истекло";
  }

  if (errorMessage) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-lumm-gold tracking-wider mb-4">LUMM</h1>
          <p className="text-red-400">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return <InviteClient token={token} />;
}

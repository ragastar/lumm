import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      avatarColor: members.avatarColor,
    })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(asc(members.displayName));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Участники мастермайнда</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          {rows.length} {rows.length === 1 ? "активный участник" : "активных участников"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {rows.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 flex flex-col items-center gap-3 hover:border-lumm-gold transition-colors"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-lumm-dark"
              style={{ backgroundColor: m.avatarColor }}
            >
              {m.displayName[0]?.toUpperCase()}
            </div>
            <p className="text-lumm-text-primary font-medium text-center">{m.displayName}</p>
            <p className="text-xs text-lumm-text-secondary">{m.role}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

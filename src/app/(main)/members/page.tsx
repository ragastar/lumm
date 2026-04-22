import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function truncate(s: string | null, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

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
      avatarUrl: members.avatarUrl,
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
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
            <Avatar
              displayName={m.displayName}
              avatarColor={m.avatarColor}
              avatarUrl={m.avatarUrl}
              size="lg"
            />
            <p className="text-lumm-text-primary font-medium text-center">{m.displayName}</p>
            <p className="text-xs text-lumm-text-secondary">{m.role}</p>
            {(m.businessGoal || m.sportGoal) && (
              <div className="w-full text-xs text-lumm-text-secondary mt-2 space-y-1">
                {m.businessGoal && (
                  <p className="truncate"><span className="text-lumm-gold">Бизнес:</span> {truncate(m.businessGoal, 80)}</p>
                )}
                {m.sportGoal && (
                  <p className="truncate"><span className="text-lumm-gold">Спорт:</span> {truncate(m.sportGoal, 80)}</p>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

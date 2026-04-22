import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      createdAt: members.createdAt,
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
    })
    .from(members)
    .where(and(eq(members.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0 || rows[0].status !== "active") {
    notFound();
  }

  const m = rows[0];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
      >
        ← Назад к участникам
      </Link>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 flex flex-col items-center gap-4">
        <Avatar
          displayName={m.displayName}
          avatarColor={m.avatarColor}
          avatarUrl={m.avatarUrl}
          size="xl"
        />
        <h1 className="text-2xl font-bold text-lumm-text-primary">{m.displayName}</h1>
        <span className="px-3 py-1 bg-lumm-gold/10 text-lumm-gold text-sm rounded-full border border-lumm-gold/20">
          {m.role}
        </span>
        <p className="text-sm text-lumm-text-secondary">Участник с {formatDate(m.createdAt)}</p>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Цели</h2>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Бизнес</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">
            {m.businessGoal ?? <span className="text-lumm-text-secondary">—</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Спорт</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">
            {m.sportGoal ?? <span className="text-lumm-text-secondary">—</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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
      createdAt: members.createdAt,
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
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-lumm-dark"
          style={{ backgroundColor: m.avatarColor }}
        >
          {m.displayName[0]?.toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-lumm-text-primary">{m.displayName}</h1>
        <span className="px-3 py-1 bg-lumm-gold/10 text-lumm-gold text-sm rounded-full border border-lumm-gold/20">
          {m.role}
        </span>
        <p className="text-sm text-lumm-text-secondary">Участник с {formatDate(m.createdAt)}</p>
      </div>
    </div>
  );
}

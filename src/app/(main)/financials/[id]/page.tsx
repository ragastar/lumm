import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members, monthlyFinancials } from "@/db/schema";
import { Avatar } from "@/components/Avatar";
import { isQuarterEnd } from "@/lib/quarter";

export const dynamic = "force-dynamic";

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMonth(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MonthlyFinancialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const rows = await db
    .select({
      id: monthlyFinancials.id,
      month: monthlyFinancials.month,
      revenue: monthlyFinancials.revenue,
      netProfit: monthlyFinancials.netProfit,
      capital: monthlyFinancials.capital,
      scoreBusiness: monthlyFinancials.scoreBusiness,
      scoreFamily: monthlyFinancials.scoreFamily,
      scorePersonal: monthlyFinancials.scorePersonal,
      reportText: monthlyFinancials.reportText,
      requestText: monthlyFinancials.requestText,
      createdAt: monthlyFinancials.createdAt,
      updatedAt: monthlyFinancials.updatedAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
    })
    .from(monthlyFinancials)
    .innerJoin(members, eq(members.id, monthlyFinancials.memberId))
    .where(and(eq(monthlyFinancials.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0) notFound();
  const r = rows[0];
  const quarter = isQuarterEnd(r.month);
  const wasEdited = r.updatedAt !== r.createdAt;
  const isOwner = r.memberId === user.id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/financials"
          className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
        >
          ← К ленте ежемесячных
        </Link>
        {isOwner && (
          <Link
            href={`/financials?month=${r.month}`}
            className="px-4 py-2 bg-lumm-gold text-lumm-dark text-sm font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
          >
            Редактировать
          </Link>
        )}
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 flex items-center gap-4">
        <Link href={`/members/${r.memberId}`}>
          <Avatar
            displayName={r.displayName}
            avatarColor={r.avatarColor}
            avatarUrl={r.avatarUrl}
            size="lg"
          />
        </Link>
        <div className="flex-1">
          <Link
            href={`/members/${r.memberId}`}
            className="text-lg font-semibold text-lumm-text-primary hover:underline"
          >
            {r.displayName}
          </Link>
          <p className="text-sm text-lumm-text-secondary">
            {formatMonth(r.month)} · сдан {formatDateTime(r.createdAt)}
            {wasEdited && ` · редактировался ${formatDateTime(r.updatedAt)}`}
          </p>
        </div>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Цифры</h2>
        <div className={`grid grid-cols-1 gap-4 ${quarter ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Выручка</p>
            <p className="text-lg text-lumm-text-primary">
              {r.revenue != null ? formatRub(r.revenue) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">
              Чистая прибыль
            </p>
            <p className="text-lg text-lumm-gold">
              {r.netProfit != null ? formatRub(r.netProfit) : "—"}
            </p>
          </div>
          {quarter && (
            <div>
              <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">
                Капитал на конец квартала
              </p>
              <p className="text-lg text-lumm-text-primary">
                {r.capital != null ? formatRub(r.capital) : "—"}
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-lumm-gray-light/50">
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Бизнес</p>
            <p className="text-lg text-lumm-gold">{r.scoreBusiness ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Семья</p>
            <p className="text-lg text-blue-400">{r.scoreFamily ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Личное</p>
            <p className="text-lg text-purple-400">{r.scorePersonal ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Отчёт по сферам</h2>
        <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
          {r.reportText ?? "—"}
        </pre>
      </div>

      {r.requestText && (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Запрос на разбор</h2>
          <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
            {r.requestText}
          </pre>
        </div>
      )}
    </div>
  );
}

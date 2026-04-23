import { randomUUID } from "crypto";
import { startOfWeek, formatISO } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, weeklyReports, reportAnalyses } from "@/db/schema";
import { analyze } from "@/lib/analyzer";
import { matchTrigger } from "./trigger";

export type ReportInput = {
  text: string;
  fromId: string;
  reply: (message: string) => Promise<void> | void;
  baseUrl: string;
};

export async function handleReport(input: ReportInput): Promise<boolean> {
  const body = matchTrigger(input.text);
  if (!body) return false;

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
    })
    .from(members)
    .where(eq(members.telegramId, input.fromId))
    .limit(1);

  if (rows.length === 0) {
    await input.reply(
      "Привет. Ты не привязан к LUMM. Попроси админа вбить твой Telegram ID в /admin/members.",
    );
    return true;
  }

  const member = rows[0];
  if (!member.businessGoal?.trim() || !member.sportGoal?.trim()) {
    await input.reply(
      `${member.displayName}, у тебя не заполнены цели. Зайди в ${input.baseUrl}/profile → «Мои цели». Пришли отчёт снова после.`,
    );
    return true;
  }

  const reportId = randomUUID();
  const weekStart = formatISO(startOfWeek(new Date(), { weekStartsOn: 1 }), {
    representation: "date",
  });
  const now = new Date().toISOString();

  await db.insert(weeklyReports).values({
    id: reportId,
    memberId: member.id,
    weekStart,
    rawText: body,
    source: "telegram",
    createdAt: now,
  });

  try {
    const analysis = await analyze({
      goals: { business: member.businessGoal, sport: member.sportGoal },
      reportText: body,
    });

    await db.insert(reportAnalyses).values({
      id: randomUUID(),
      reportId,
      trafficLight: analysis.trafficLight,
      did: analysis.did,
      missed: analysis.missed,
      nextQuestion: analysis.nextQuestion,
      coach: analysis.coach,
      model: analysis.model,
      createdAt: now,
    });

    await input.reply(
      `✅ ${member.displayName}, отчёт принят. Анализ: ${input.baseUrl}/reports/${reportId}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[handleReport] analyze failed:", msg);
    await input.reply(
      `${member.displayName}, отчёт сохранён, но анализ не получился. Посмотрим руками. Ссылка: ${input.baseUrl}/reports/${reportId}`,
    );
  }

  return true;
}

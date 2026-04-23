import cron from "node-cron";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, members, weeklyReports, monthlyFinancials } from "@/db/schema";
import { ensureNextMeeting, findMeetingInNDays } from "@/lib/meetings";
import { sendGroupMessage } from "@/lib/telegram";
import { announceMeeting } from "@/lib/meetingAnnouncements";
import {
  findLaggardsWeekly,
  findLaggardsMonthly,
  composeWeeklyReminder,
  composeMonthlyReminder,
  currentWeekStart,
  type RemMember,
} from "./reminders";

const TZ = "Europe/Moscow";

async function getActiveMembers(groupId: string): Promise<RemMember[]> {
  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      telegramId: members.telegramId,
      telegramUsername: members.telegramUsername,
    })
    .from(members)
    .where(and(eq(members.groupId, groupId), eq(members.status, "active")));
  return rows;
}

async function sendToGroup(text: string): Promise<void> {
  const chatId = process.env.GROUP_CHAT_ID;
  if (!chatId) {
    console.error("[scheduler] GROUP_CHAT_ID не задан — пропускаю отправку");
    return;
  }
  try {
    await sendGroupMessage({ chatId, text });
  } catch (err) {
    console.error("[scheduler] sendGroupMessage failed:", err);
  }
}

async function dailyTick(): Promise<void> {
  const allGroups = await db.select({ id: groups.id, name: groups.name }).from(groups);
  for (const g of allGroups) {
    // 1) ensure-next-meeting
    try {
      const result = await ensureNextMeeting(g.id);
      if (result.created) {
        try {
          await announceMeeting(result.meetingId, "created");
        } catch (err) {
          console.error(`[scheduler] announceMeeting for ${result.meetingId} failed:`, err);
        }
      }
    } catch (err) {
      console.error(`[scheduler] ensureNextMeeting for group ${g.id} failed:`, err);
    }

    // 2) monthly-reminder
    try {
      const meeting = await findMeetingInNDays(g.id, 3);
      if (meeting) {
        const pool = await getActiveMembers(g.id);
        const month = `${meeting.date.slice(0, 7)}-01`;
        const fins = await db
          .select({ memberId: monthlyFinancials.memberId, month: monthlyFinancials.month })
          .from(monthlyFinancials)
          .innerJoin(members, eq(members.id, monthlyFinancials.memberId))
          .where(eq(members.groupId, g.id));
        const laggards = findLaggardsMonthly(pool, fins, month);
        const msg = composeMonthlyReminder(laggards, meeting.date);
        if (msg) await sendToGroup(msg);
      }
    } catch (err) {
      console.error(`[scheduler] monthlyReminder for group ${g.id} failed:`, err);
    }
  }
}

async function weeklyTick(): Promise<void> {
  const weekStart = currentWeekStart(new Date());
  const allGroups = await db.select({ id: groups.id }).from(groups);
  for (const g of allGroups) {
    try {
      const pool = await getActiveMembers(g.id);
      const reports = await db
        .select({ memberId: weeklyReports.memberId, weekStart: weeklyReports.weekStart })
        .from(weeklyReports)
        .innerJoin(members, eq(members.id, weeklyReports.memberId))
        .where(eq(members.groupId, g.id));
      const laggards = findLaggardsWeekly(pool, reports, weekStart);
      const msg = composeWeeklyReminder(laggards);
      if (msg) await sendToGroup(msg);
    } catch (err) {
      console.error(`[scheduler] weeklyReminder for group ${g.id} failed:`, err);
    }
  }
}

export function startScheduler(): void {
  // Ежедневно 09:00 MSK: создать следующую стандартную встречу если нет + monthly-reminder
  cron.schedule("0 9 * * *", () => {
    console.log("[scheduler] daily tick");
    dailyTick().catch((err) => console.error("[scheduler] dailyTick fatal:", err));
  }, { timezone: TZ });

  // Воскресенье 19:00 MSK: weekly-reminder
  cron.schedule("0 19 * * 0", () => {
    console.log("[scheduler] weekly tick");
    weeklyTick().catch((err) => console.error("[scheduler] weeklyTick fatal:", err));
  }, { timezone: TZ });

  // Дополнительно: при первом запуске подождать 10 секунд и запустить dailyTick —
  // полезно чтобы при деплое cron не ждал до завтра для создания первой встречи.
  const INITIAL_DELAY_MS = 10_000;
  setTimeout(() => {
    console.log("[scheduler] initial tick (after startup delay)");
    dailyTick().catch((err) => console.error("[scheduler] initial dailyTick fatal:", err));
  }, INITIAL_DELAY_MS);

  console.log("[scheduler] started (TZ: " + TZ + ")");
}

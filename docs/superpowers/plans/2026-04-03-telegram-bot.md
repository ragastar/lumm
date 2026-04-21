# Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Telegram bot that monitors the group chat, parses weekly reports, sends reminders, and provides quick commands — completing the missing Phase 1 functionality from the PRD.

**Architecture:** grammY bot running as a separate long-polling process, sharing the SQLite database with the Next.js web app. The bot lives in `src/bot/` and runs via `npm run bot`. It parses `#отчет` messages from the group chat, extracts scores and text by category, stores reports in the existing `weekly_reports` table, and sends scheduled reminders via `node-cron`.

**Tech Stack:** grammY (Telegram bot framework), node-cron (scheduling), existing Drizzle ORM + better-sqlite3 stack.

---

## File Structure

```
src/bot/
├── index.ts              — Bot entry point: creates bot, registers handlers, starts polling
├── parser.ts             — Report text parser: extracts categories, scores, plan
├── handlers/
│   ├── report.ts         — #отчет message handler: parse + save + confirm/ask scores
│   ├── scores.ts         — Inline keyboard callback handler for score input
│   └── commands.ts       — /report, /stats, /next_meeting commands
├── reminders.ts          — Cron-based reminders: Sunday reports, meeting alerts
└── keyboards.ts          — Inline keyboard builders for score input
```

**Modified files:**
- `package.json` — add dependencies and `bot` script
- `.env` — `TELEGRAM_BOT_TOKEN` (already exists, needs value)

---

## Task 1: Bot Scaffold & Connection

**Files:**
- Modify: `package.json`
- Create: `src/bot/index.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd /root/lumm
npm install grammy node-cron
npm install -D @types/node-cron
```

- [ ] **Step 2: Add bot script to package.json**

Add to `scripts` in `package.json`:
```json
"bot": "npx tsx src/bot/index.ts"
```

- [ ] **Step 3: Create bot entry point**

`src/bot/index.ts`:
```ts
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(token);

bot.command("start", (ctx) => ctx.reply("LUMM Bot запущен! 🏆"));

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: () => console.log("LUMM Bot started (long-polling)"),
});
```

- [ ] **Step 4: Verify bot starts (requires valid token)**

Set `TELEGRAM_BOT_TOKEN` in `.env` and run:
```bash
npm run bot
```
Expected: "LUMM Bot started (long-polling)" in console. Send `/start` to bot in Telegram — should reply "LUMM Bot запущен! 🏆". Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/bot/index.ts
git commit -m "feat: добавить scaffold Telegram-бота на grammY #N"
```

---

## Task 2: Report Parser

**Files:**
- Create: `src/bot/parser.ts`
- Create: `src/bot/__tests__/parser.test.ts`

- [ ] **Step 1: Install test runner**

```bash
npm install -D vitest
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing tests for the parser**

`src/bot/__tests__/parser.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseReport } from "../parser";

describe("parseReport", () => {
  it("parses a full report with scores", () => {
    const text = `#отчет
Бизнес: Закрыл 3 сделки, запустил рекламу
Семья: Провёл выходные с ребёнком
Личное: Начал бегать по утрам
Оценки: Б:8 С:7 Л:6
План: Финализировать КП, встреча с партнёром`;

    const result = parseReport(text);
    expect(result).not.toBeNull();
    expect(result!.businessText).toBe("Закрыл 3 сделки, запустил рекламу");
    expect(result!.familyText).toBe("Провёл выходные с ребёнком");
    expect(result!.personalText).toBe("Начал бегать по утрам");
    expect(result!.scoreBusiness).toBe(8);
    expect(result!.scoreFamily).toBe(7);
    expect(result!.scorePersonal).toBe(6);
    expect(result!.planText).toBe("Финализировать КП, встреча с партнёром");
  });

  it("parses report without scores", () => {
    const text = `#отчет
Бизнес: Провёл переговоры
Семья: Всё стабильно
Личное: Читаю книгу`;

    const result = parseReport(text);
    expect(result).not.toBeNull();
    expect(result!.businessText).toBe("Провёл переговоры");
    expect(result!.scoreBusiness).toBeNull();
    expect(result!.scoreFamily).toBeNull();
    expect(result!.scorePersonal).toBeNull();
  });

  it("returns null for non-report messages", () => {
    expect(parseReport("Привет всем!")).toBeNull();
    expect(parseReport("")).toBeNull();
  });

  it("parses #report tag (english)", () => {
    const text = `#report
Бизнес: Тест
Семья: Тест
Личное: Тест`;

    const result = parseReport(text);
    expect(result).not.toBeNull();
  });

  it("parses scores in various formats", () => {
    // Format: Б8 С7 Л6 (without colon)
    const text1 = `#отчет
Бизнес: Тест
Оценки: Б8 С7 Л6`;
    const r1 = parseReport(text1);
    expect(r1!.scoreBusiness).toBe(8);

    // Format: 8/7/6
    const text2 = `#отчет
Бизнес: Тест
Оценки: 8/7/6`;
    const r2 = parseReport(text2);
    expect(r2!.scoreBusiness).toBe(8);
    expect(r2!.scoreFamily).toBe(7);
    expect(r2!.scorePersonal).toBe(6);
  });

  it("handles multiline category text", () => {
    const text = `#отчет
Бизнес: Закрыл сделку.
Запустил рекламу.
Семья: Всё хорошо
Личное: Бегаю`;

    const result = parseReport(text);
    expect(result!.businessText).toBe("Закрыл сделку.\nЗапустил рекламу.");
  });

  it("clamps scores to 1-10 range", () => {
    const text = `#отчет
Бизнес: Тест
Оценки: Б:15 С:0 Л:5`;
    const r = parseReport(text);
    expect(r!.scoreBusiness).toBe(10);
    expect(r!.scoreFamily).toBe(1);
    expect(r!.scorePersonal).toBe(5);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```
Expected: All tests FAIL — `parseReport` not found.

- [ ] **Step 4: Implement the parser**

`src/bot/parser.ts`:
```ts
export interface ParsedReport {
  businessText: string | null;
  familyText: string | null;
  personalText: string | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
  planText: string | null;
}

const REPORT_TRIGGER = /^#(отчет|отчёт|report)\b/im;

const CATEGORY_LABELS: Record<string, keyof Pick<ParsedReport, "businessText" | "familyText" | "personalText" | "planText">> = {
  "бизнес": "businessText",
  "семья": "familyText",
  "личное": "personalText",
  "план": "planText",
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseScores(line: string): { b: number | null; s: number | null; l: number | null } {
  // Format: Б:8 С:7 Л:6 or Б8 С7 Л6
  const bslMatch = line.match(/[бБ]:?\s*(\d+)/);
  const sMatch = line.match(/[сС]:?\s*(\d+)/);
  const lMatch = line.match(/[лЛ]:?\s*(\d+)/);

  if (bslMatch || sMatch || lMatch) {
    return {
      b: bslMatch ? clamp(parseInt(bslMatch[1]), 1, 10) : null,
      s: sMatch ? clamp(parseInt(sMatch[1]), 1, 10) : null,
      l: lMatch ? clamp(parseInt(lMatch[1]), 1, 10) : null,
    };
  }

  // Format: 8/7/6
  const slashMatch = line.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
  if (slashMatch) {
    return {
      b: clamp(parseInt(slashMatch[1]), 1, 10),
      s: clamp(parseInt(slashMatch[2]), 1, 10),
      l: clamp(parseInt(slashMatch[3]), 1, 10),
    };
  }

  return { b: null, s: null, l: null };
}

export function parseReport(text: string): ParsedReport | null {
  if (!text || !REPORT_TRIGGER.test(text)) return null;

  const result: ParsedReport = {
    businessText: null,
    familyText: null,
    personalText: null,
    scoreBusiness: null,
    scoreFamily: null,
    scorePersonal: null,
    planText: null,
  };

  const lines = text.split("\n");
  let currentField: keyof Pick<ParsedReport, "businessText" | "familyText" | "personalText" | "planText"> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || REPORT_TRIGGER.test(trimmed)) continue;

    // Check for scores line
    if (/^оценк/i.test(trimmed)) {
      const scores = parseScores(trimmed);
      result.scoreBusiness = scores.b;
      result.scoreFamily = scores.s;
      result.scorePersonal = scores.l;
      currentField = null;
      continue;
    }

    // Check for category label at start of line
    let matched = false;
    for (const [label, field] of Object.entries(CATEGORY_LABELS)) {
      const regex = new RegExp(`^${label}\\s*:`, "i");
      if (regex.test(trimmed)) {
        const value = trimmed.replace(regex, "").trim();
        result[field] = value || null;
        currentField = field;
        matched = true;
        break;
      }
    }

    // Continuation of previous category (multiline)
    if (!matched && currentField) {
      const prev = result[currentField];
      result[currentField] = prev ? `${prev}\n${trimmed}` : trimmed;
    }
  }

  return result;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bot/parser.ts src/bot/__tests__/parser.test.ts package.json package-lock.json
git commit -m "feat: добавить парсер еженедельных отчётов с тестами #N"
```

---

## Task 3: Report Handler (save to DB)

**Files:**
- Create: `src/bot/handlers/report.ts`
- Create: `src/bot/keyboards.ts`
- Modify: `src/bot/index.ts`

- [ ] **Step 1: Create inline keyboard builders**

`src/bot/keyboards.ts`:
```ts
import { InlineKeyboard } from "grammy";

export function scoreKeyboard(category: "business" | "family" | "personal", reportId: string): InlineKeyboard {
  const labels: Record<string, string> = {
    business: "Бизнес",
    family: "Семья",
    personal: "Личное",
  };
  const kb = new InlineKeyboard();

  for (let i = 1; i <= 5; i++) {
    kb.text(`${i}`, `score:${reportId}:${category}:${i}`);
  }
  kb.row();
  for (let i = 6; i <= 10; i++) {
    kb.text(`${i}`, `score:${reportId}:${category}:${i}`);
  }

  return kb;
}

export function allScoresKeyboard(reportId: string): InlineKeyboard[] {
  return [
    scoreKeyboard("business", reportId),
    scoreKeyboard("family", reportId),
    scoreKeyboard("personal", reportId),
  ];
}
```

- [ ] **Step 2: Create report handler**

`src/bot/handlers/report.ts`:
```ts
import { Context } from "grammy";
import { db } from "../../db";
import { members, weeklyReports } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { parseReport } from "../parser";
import { scoreKeyboard } from "../keyboards";
import { randomUUID } from "crypto";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function handleReport(ctx: Context): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  const parsed = parseReport(text);
  if (!parsed) return;

  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  // Find member by telegram_id
  const member = db.select().from(members).where(eq(members.telegramId, telegramId)).get();
  if (!member) {
    await ctx.reply("Ты не зарегистрирован в LUMM. Попроси админа отправить инвайт.", {
      reply_parameters: { message_id: ctx.message!.message_id },
    });
    return;
  }

  const weekStart = getWeekStart();
  const reportId = randomUUID();

  // Check if report already exists for this week
  const existing = db
    .select()
    .from(weeklyReports)
    .where(and(eq(weeklyReports.memberId, member.id), eq(weeklyReports.weekStart, weekStart)))
    .get();

  if (existing) {
    // Update existing report
    db.update(weeklyReports)
      .set({
        businessText: parsed.businessText ?? existing.businessText,
        familyText: parsed.familyText ?? existing.familyText,
        personalText: parsed.personalText ?? existing.personalText,
        scoreBusiness: parsed.scoreBusiness ?? existing.scoreBusiness,
        scoreFamily: parsed.scoreFamily ?? existing.scoreFamily,
        scorePersonal: parsed.scorePersonal ?? existing.scorePersonal,
        planText: parsed.planText ?? existing.planText,
      })
      .where(eq(weeklyReports.id, existing.id))
      .run();

    await ctx.reply(`✅ Отчёт обновлён, ${member.displayName}!`, {
      reply_parameters: { message_id: ctx.message!.message_id },
    });
    return;
  }

  // Create new report
  db.insert(weeklyReports)
    .values({
      id: reportId,
      memberId: member.id,
      weekStart,
      businessText: parsed.businessText,
      familyText: parsed.familyText,
      personalText: parsed.personalText,
      scoreBusiness: parsed.scoreBusiness,
      scoreFamily: parsed.scoreFamily,
      scorePersonal: parsed.scorePersonal,
      planText: parsed.planText,
      source: "telegram",
      createdAt: new Date().toISOString(),
    })
    .run();

  const hasAllScores = parsed.scoreBusiness !== null && parsed.scoreFamily !== null && parsed.scorePersonal !== null;

  if (hasAllScores) {
    await ctx.reply(
      `✅ Отчёт принят, ${member.displayName}!\nБизнес: ${parsed.scoreBusiness} | Семья: ${parsed.scoreFamily} | Личное: ${parsed.scorePersonal}`,
      { reply_parameters: { message_id: ctx.message!.message_id } }
    );
  } else {
    // Ask for missing scores via inline keyboard
    const targetId = reportId;
    if (parsed.scoreBusiness === null) {
      await ctx.reply("Оценка за **Бизнес** (1-10):", {
        parse_mode: "Markdown",
        reply_markup: scoreKeyboard("business", targetId),
      });
    }
    if (parsed.scoreFamily === null) {
      await ctx.reply("Оценка за **Семью** (1-10):", {
        parse_mode: "Markdown",
        reply_markup: scoreKeyboard("family", targetId),
      });
    }
    if (parsed.scorePersonal === null) {
      await ctx.reply("Оценка за **Личное** (1-10):", {
        parse_mode: "Markdown",
        reply_markup: scoreKeyboard("personal", targetId),
      });
    }
  }
}
```

- [ ] **Step 3: Wire handler into bot**

Update `src/bot/index.ts`:
```ts
import { Bot } from "grammy";
import { handleReport } from "./handlers/report";
import { handleScoreCallback } from "./handlers/scores";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(token);

// Report parsing — listen for #отчет in any message
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  if (/^#(отчет|отчёт|report)\b/im.test(text)) {
    await handleReport(ctx);
  }
});

// Score inline keyboard callbacks
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("score:")) {
    await handleScoreCallback(ctx);
  }
});

bot.command("start", (ctx) => ctx.reply("LUMM Bot запущен! 🏆"));

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: () => console.log("LUMM Bot started (long-polling)"),
});
```

- [ ] **Step 4: Commit**

```bash
git add src/bot/
git commit -m "feat: добавить обработку отчётов из чата и сохранение в БД #N"
```

---

## Task 4: Score Callback Handler

**Files:**
- Create: `src/bot/handlers/scores.ts`

- [ ] **Step 1: Implement score callback handler**

`src/bot/handlers/scores.ts`:
```ts
import { Context } from "grammy";
import { db } from "../../db";
import { weeklyReports } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function handleScoreCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // Format: score:<reportId>:<category>:<value>
  const parts = data.split(":");
  if (parts.length !== 4) return;

  const [, reportId, category, valueStr] = parts;
  const value = parseInt(valueStr);
  if (isNaN(value) || value < 1 || value > 10) return;

  const report = db.select().from(weeklyReports).where(eq(weeklyReports.id, reportId)).get();
  if (!report) {
    await ctx.answerCallbackQuery({ text: "Отчёт не найден" });
    return;
  }

  const fieldMap: Record<string, "scoreBusiness" | "scoreFamily" | "scorePersonal"> = {
    business: "scoreBusiness",
    family: "scoreFamily",
    personal: "scorePersonal",
  };

  const field = fieldMap[category];
  if (!field) return;

  db.update(weeklyReports)
    .set({ [field]: value })
    .where(eq(weeklyReports.id, reportId))
    .run();

  const labelMap: Record<string, string> = {
    business: "Бизнес",
    family: "Семья",
    personal: "Личное",
  };

  await ctx.answerCallbackQuery({ text: `${labelMap[category]}: ${value} ✅` });

  // Edit the message to show selected score
  await ctx.editMessageText(`${labelMap[category]}: **${value}**/10 ✅`, { parse_mode: "Markdown" });

  // Check if all scores are now filled
  const updated = db.select().from(weeklyReports).where(eq(weeklyReports.id, reportId)).get();
  if (updated && updated.scoreBusiness !== null && updated.scoreFamily !== null && updated.scorePersonal !== null) {
    await ctx.reply(
      `🎯 Все оценки заполнены!\nБизнес: ${updated.scoreBusiness} | Семья: ${updated.scoreFamily} | Личное: ${updated.scorePersonal}`
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bot/handlers/scores.ts
git commit -m "feat: добавить обработку inline-кнопок для оценок #N"
```

---

## Task 5: Bot Commands (/stats, /next_meeting)

**Files:**
- Create: `src/bot/handlers/commands.ts`
- Modify: `src/bot/index.ts`

- [ ] **Step 1: Implement commands**

`src/bot/handlers/commands.ts`:
```ts
import { Context } from "grammy";
import { db } from "../../db";
import { members, weeklyReports, meetings } from "../../db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export async function handleStats(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const member = db.select().from(members).where(eq(members.telegramId, telegramId)).get();
  if (!member) {
    await ctx.reply("Ты не зарегистрирован в LUMM.");
    return;
  }

  const lastReports = db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.memberId, member.id))
    .orderBy(desc(weeklyReports.weekStart))
    .limit(4)
    .all();

  if (lastReports.length === 0) {
    await ctx.reply("У тебя пока нет отчётов.");
    return;
  }

  const lines = lastReports.map((r) => {
    const b = r.scoreBusiness ?? "—";
    const s = r.scoreFamily ?? "—";
    const l = r.scorePersonal ?? "—";
    return `📅 ${r.weekStart}: Б:${b} С:${s} Л:${l}`;
  });

  await ctx.reply(
    `📊 *Статистика ${member.displayName}*\nПоследние ${lastReports.length} недель:\n\n${lines.join("\n")}`,
    { parse_mode: "Markdown" }
  );
}

export async function handleNextMeeting(ctx: Context): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const meeting = db
    .select({
      date: meetings.date,
      location: meetings.location,
      organizerName: members.displayName,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(and(gte(meetings.date, today), eq(meetings.status, "scheduled")))
    .orderBy(meetings.date)
    .limit(1)
    .get();

  if (!meeting) {
    await ctx.reply("Ближайших встреч не запланировано.");
    return;
  }

  const meetingDate = new Date(meeting.date);
  const now = new Date();
  const daysLeft = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  await ctx.reply(
    `📅 *Следующая встреча*\n\n` +
      `Дата: ${meetingDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}\n` +
      `Через: ${daysLeft} дн.\n` +
      `Место: ${meeting.location ?? "Не указано"}\n` +
      `Организатор: ${meeting.organizerName ?? "Не назначен"}`,
    { parse_mode: "Markdown" }
  );
}
```

- [ ] **Step 2: Register commands in bot**

Update `src/bot/index.ts` — add after existing imports:
```ts
import { handleStats, handleNextMeeting } from "./handlers/commands";
```

Add before `bot.on("message:text")`:
```ts
bot.command("stats", handleStats);
bot.command("next_meeting", handleNextMeeting);
bot.command("help", (ctx) =>
  ctx.reply(
    "📋 *Команды LUMM Bot*\n\n" +
      "/stats — Твоя статистика за 4 недели\n" +
      "/next\\_meeting — Ближайшая встреча\n" +
      "/help — Список команд\n\n" +
      "Для отчёта напиши сообщение с тегом #отчет",
    { parse_mode: "Markdown" }
  )
);
```

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers/commands.ts src/bot/index.ts
git commit -m "feat: добавить команды /stats, /next_meeting, /help #N"
```

---

## Task 6: Reminder System

**Files:**
- Create: `src/bot/reminders.ts`
- Modify: `src/bot/index.ts`

- [ ] **Step 1: Implement reminder system**

`src/bot/reminders.ts`:
```ts
import cron from "node-cron";
import { Bot } from "grammy";
import { db } from "../db";
import { members, weeklyReports, meetings, groups } from "../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export function setupReminders(bot: Bot): void {
  // Sunday 18:00 MSK (15:00 UTC) — report reminder
  cron.schedule("0 15 * * 0", async () => {
    console.log("[reminder] Sunday report check");

    const weekStart = getWeekStart();
    const allMembers = db.select().from(members).where(eq(members.status, "active")).all();
    const group = db.select().from(groups).limit(1).get();
    if (!group?.telegramChatId) return;

    const chatId = group.telegramChatId;
    const missing: string[] = [];

    for (const member of allMembers) {
      const report = db
        .select()
        .from(weeklyReports)
        .where(and(eq(weeklyReports.memberId, member.id), eq(weeklyReports.weekStart, weekStart)))
        .get();

      if (!report) {
        missing.push(member.displayName);
      }
    }

    if (missing.length > 0) {
      await bot.api.sendMessage(
        chatId,
        `⏰ *Напоминание*\n\nДедлайн отчёта: сегодня 23:59\n\nЕщё не сдали: ${missing.join(", ")}\n\nФормат: #отчет + текст по категориям`,
        { parse_mode: "Markdown" }
      );
    }
  });

  // Meeting reminders — check daily at 10:00 MSK (07:00 UTC)
  cron.schedule("0 7 * * *", async () => {
    console.log("[reminder] Meeting check");

    const group = db.select().from(groups).limit(1).get();
    if (!group?.telegramChatId) return;

    const chatId = group.telegramChatId;
    const today = new Date();

    // Check meetings 7, 3, 1 days ahead and today
    for (const daysAhead of [7, 3, 1, 0]) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysAhead);
      const dateStr = targetDate.toISOString().split("T")[0];

      const meeting = db
        .select({
          date: meetings.date,
          location: meetings.location,
          organizerName: members.displayName,
        })
        .from(meetings)
        .leftJoin(members, eq(meetings.organizerId, members.id))
        .where(and(eq(meetings.date, dateStr), eq(meetings.status, "scheduled")))
        .get();

      if (!meeting) continue;

      let message: string;
      if (daysAhead === 0) {
        message = `🔔 *Встреча сегодня!*\n\nМесто: ${meeting.location ?? "Не указано"}\nОрганизатор: ${meeting.organizerName ?? "—"}`;
      } else if (daysAhead === 1) {
        message = `📅 *Встреча завтра!*\n\nМесто: ${meeting.location ?? "Не указано"}\nОрганизатор: ${meeting.organizerName ?? "—"}`;
      } else if (daysAhead === 3) {
        message = `📅 Встреча через 3 дня (${meeting.date})\nОрганизатор: ${meeting.organizerName ?? "—"}, не забудь подготовить место!`;
      } else {
        message = `📅 Встреча через неделю (${meeting.date})\nОрганизатор: ${meeting.organizerName ?? "—"}`;
      }

      await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
    }
  });

  console.log("Reminders scheduled (MSK timezone)");
}
```

- [ ] **Step 2: Wire reminders into bot**

Update `src/bot/index.ts` — add import:
```ts
import { setupReminders } from "./reminders";
```

Change the `bot.start()` call to:
```ts
bot.start({
  onStart: () => {
    console.log("LUMM Bot started (long-polling)");
    setupReminders(bot);
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/bot/reminders.ts src/bot/index.ts
git commit -m "feat: добавить систему напоминаний (отчёты, встречи) #N"
```

---

## Task 7: Link Telegram Users to Members

**Files:**
- Modify: `src/bot/index.ts`
- Modify: `src/app/api/auth/telegram/route.ts`

The bot needs `telegram_id` in the members table to link Telegram users to LUMM accounts. Currently the Telegram auth flow sets this on login, but we also need a `/link` command in the bot for users who registered via password.

- [ ] **Step 1: Add /link command**

Add to `src/bot/handlers/commands.ts`:
```ts
export async function handleLink(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  // Check if already linked
  const existing = db.select().from(members).where(eq(members.telegramId, telegramId)).get();
  if (existing) {
    await ctx.reply(`Ты уже привязан как ${existing.displayName} ✅`);
    return;
  }

  await ctx.reply(
    "Для привязки аккаунта войди в веб-дашборд через Telegram.\n" +
      "Или попроси админа привязать твой Telegram ID вручную.\n\n" +
      `Твой Telegram ID: \`${telegramId}\``,
    { parse_mode: "Markdown" }
  );
}
```

- [ ] **Step 2: Register /link in bot**

In `src/bot/index.ts`, add import and registration:
```ts
import { handleStats, handleNextMeeting, handleLink } from "./handlers/commands";
```

Add:
```ts
bot.command("link", handleLink);
```

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers/commands.ts src/bot/index.ts
git commit -m "feat: добавить команду /link для привязки Telegram к LUMM #N"
```

---

## Task 8: Final Bot Integration & Testing

**Files:**
- Modify: `src/bot/index.ts` (final version)

- [ ] **Step 1: Finalize bot entry point**

Verify the final `src/bot/index.ts` looks like this:
```ts
import { Bot } from "grammy";
import { handleReport } from "./handlers/report";
import { handleScoreCallback } from "./handlers/scores";
import { handleStats, handleNextMeeting, handleLink } from "./handlers/commands";
import { setupReminders } from "./reminders";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(token);

// Commands
bot.command("start", (ctx) => ctx.reply("LUMM Bot запущен! 🏆"));
bot.command("stats", handleStats);
bot.command("next_meeting", handleNextMeeting);
bot.command("link", handleLink);
bot.command("help", (ctx) =>
  ctx.reply(
    "📋 *Команды LUMM Bot*\n\n" +
      "/stats — Твоя статистика за 4 недели\n" +
      "/next\\_meeting — Ближайшая встреча\n" +
      "/link — Привязать Telegram к аккаунту\n" +
      "/help — Список команд\n\n" +
      "Для отчёта напиши сообщение с тегом #отчет",
    { parse_mode: "Markdown" }
  )
);

// Report parsing from group chat
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  if (/^#(отчет|отчёт|report)\b/im.test(text)) {
    await handleReport(ctx);
  }
});

// Score inline keyboard callbacks
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("score:")) {
    await handleScoreCallback(ctx);
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: () => {
    console.log("LUMM Bot started (long-polling)");
    setupReminders(bot);
  },
});
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```
Expected: All parser tests PASS.

- [ ] **Step 3: Manual integration test**

1. Set `TELEGRAM_BOT_TOKEN` in `.env`
2. Run `npm run bot`
3. In Telegram, send to bot:
   - `/start` → "LUMM Bot запущен! 🏆"
   - `/help` → command list
   - `/stats` → "Ты не зарегистрирован" (expected — no member linked yet)
   - `/next_meeting` → next meeting info or "Ближайших встреч не запланировано"

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: финализировать Telegram-бота (отчёты, команды, напоминания) #N"
```

---

## Summary

| Task | Component | Commits |
|------|-----------|---------|
| 1 | Bot scaffold + grammY | 1 |
| 2 | Report parser + tests | 1 |
| 3 | Report handler (save to DB) | 1 |
| 4 | Score inline callbacks | 1 |
| 5 | Commands (/stats, /next_meeting, /help) | 1 |
| 6 | Reminder system (cron) | 1 |
| 7 | /link command for Telegram binding | 1 |
| 8 | Final integration & testing | 1 |

**Total: 8 tasks, ~8 commits**

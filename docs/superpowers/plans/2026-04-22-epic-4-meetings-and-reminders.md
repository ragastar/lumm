# Эпик 4 — Календарь встреч + бот-напоминания: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автокалендарь встреч (3-й чт месяца, ротация по очереди) + бот-напоминания (ежедневный cron для создания встречи и monthly-пинга, воскресный cron для weekly-пинга) + UI `/calendar` для ручной правки.

**Architecture:** Чистые функции (`rotation`, `reminders`) → unit-тесты. Domain helper (`meetings.ts`) → запросы к БД. `scheduler.ts` wire'ит `node-cron` в процессе `lumm-bot.service` (3 cron-job'a), зовётся из `src/bot/index.ts` при старте. Fresh API endpoints `POST/PATCH /api/meetings` + groupId-фильтр на `GET`. `/calendar` ru-written client component c модалкой формы.

**Tech Stack:** Next.js 16, TypeScript, SQLite + Drizzle, vitest, node-cron (уже в deps), grammy (бот), jose (JWT), TailwindCSS.

**Spec:** [docs/superpowers/specs/2026-04-22-epic-4-meetings-and-reminders-design.md](../specs/2026-04-22-epic-4-meetings-and-reminders-design.md)

---

## Pre-setup

- [ ] **Создать GitHub issue** на `ragastar/lumm` с названием «Эпик 4: календарь встреч + бот-напоминания», тело со ссылкой на спеку. Записать номер `#N`.

```bash
gh issue create \
  --repo ragastar/lumm \
  --title "Эпик 4: календарь встреч + бот-напоминания" \
  --body "Cron в lumm-bot.service: ensureNextMeeting + monthlyReminder + weeklyReminder. kind (standard/ad_hoc) в meetings. UI /calendar открыт всем участникам группы.

Спека: docs/superpowers/specs/2026-04-22-epic-4-meetings-and-reminders-design.md
План:  docs/superpowers/plans/2026-04-22-epic-4-meetings-and-reminders.md"
```

- [ ] **Создать ветку:**

```bash
cd /root/lumm && git checkout -b epic-4-meetings
```

---

## Файловая структура

**Создать:**
- `scripts/migrations/2026-04-22-meetings-kind.sql`
- `src/lib/rotation.ts` — `nextOrganizer`, `nextThirdThursday`, `formatDateIso`
- `src/lib/__tests__/rotation.test.ts`
- `src/lib/meetings.ts` — `ensureNextMeeting(groupId)`, `findMeetingInNDays(groupId, n)`
- `src/bot/reminders.ts` — `findLaggardsWeekly`, `findLaggardsMonthly`, `formatMentions`, `composeWeeklyReminder`, `composeMonthlyReminder`, `currentWeekStart`, `monthIso`
- `src/bot/__tests__/reminders.test.ts`
- `src/bot/scheduler.ts` — `startScheduler()`: 3 cron-job'a
- `src/app/api/meetings/[id]/route.ts` — `PATCH`
- `src/app/(main)/calendar/CalendarClient.tsx` — клиент с модалкой

**Модифицировать:**
- `src/db/schema.ts` — добавить `kind` в `meetings`
- `src/db/seed.ts` — добавить `kind` в DDL
- `src/bot/index.ts` — вызвать `startScheduler()` после `bot.start()`
- `src/app/api/meetings/route.ts` — `GET` с auth+groupId, новый `POST`
- `src/app/(main)/calendar/page.tsx` — тянуть активных участников группы + передать в `CalendarClient`

---

### Task 1: Миграция БД + схема + seed

**Files:**
- Create: `scripts/migrations/2026-04-22-meetings-kind.sql`
- Modify: `src/db/schema.ts` (блок `meetings` ~71-79)
- Modify: `src/db/seed.ts` (блок `CREATE TABLE IF NOT EXISTS meetings`)

- [ ] **Step 1: Написать миграцию**

```sql
-- scripts/migrations/2026-04-22-meetings-kind.sql
-- Эпик 4: kind на meetings (standard | ad_hoc)

ALTER TABLE meetings
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'standard';
```

Никаких бэкфиллов — существующие строки станут 'standard' автоматически благодаря DEFAULT. В dev БД сейчас 0 meetings, в prod — тоже.

- [ ] **Step 2: Применить на dev**

```bash
sqlite3 /root/lumm/data/lumm.db < /root/lumm/scripts/migrations/2026-04-22-meetings-kind.sql
sqlite3 /root/lumm/data/lumm.db ".schema meetings"
```

Expected: в выводе `.schema` должен появиться столбец `kind TEXT NOT NULL DEFAULT 'standard'`.

- [ ] **Step 3: Обновить `src/db/schema.ts`**

Найти блок `meetings` и заменить на:

```ts
export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  date: text("date").notNull(),
  organizerId: text("organizer_id").references(() => members.id),
  location: text("location"),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  kind: text("kind", { enum: ["standard", "ad_hoc"] }).notNull().default("standard"),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 4: Обновить `src/db/seed.ts`**

Найти `CREATE TABLE IF NOT EXISTS meetings (...)` и заменить на:

```sql
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id),
    date TEXT NOT NULL,
    organizer_id TEXT REFERENCES members(id),
    location TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    kind TEXT NOT NULL DEFAULT 'standard',
    created_at TEXT NOT NULL
  );
```

- [ ] **Step 5: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 6: Коммит**

```bash
git add scripts/migrations/2026-04-22-meetings-kind.sql src/db/schema.ts src/db/seed.ts
git commit -m "feat(db): +kind (standard|ad_hoc) на meetings (#N)"
```

---

### Task 2: `src/lib/rotation.ts` + тесты

**Files:**
- Create: `src/lib/rotation.ts`
- Test: `src/lib/__tests__/rotation.test.ts`

- [ ] **Step 1: Написать падающие тесты**

```ts
// src/lib/__tests__/rotation.test.ts
import { describe, it, expect } from "vitest";
import { nextOrganizer, nextThirdThursday, formatDateIso } from "../rotation";

const A = { id: "a", displayName: "Alice" };
const B = { id: "b", displayName: "Bob" };
const C = { id: "c", displayName: "Carol" };
const pool = [A, B, C];

describe("nextOrganizer", () => {
  it("возвращает null для пустого пула", () => {
    expect(nextOrganizer([], null)).toBe(null);
    expect(nextOrganizer([], "a")).toBe(null);
  });

  it("возвращает первого, если lastOrganizerId = null", () => {
    expect(nextOrganizer(pool, null)).toBe("a");
  });

  it("возвращает следующего по кругу", () => {
    expect(nextOrganizer(pool, "a")).toBe("b");
    expect(nextOrganizer(pool, "b")).toBe("c");
    expect(nextOrganizer(pool, "c")).toBe("a");
  });

  it("возвращает первого, если прошлый организатор вне пула", () => {
    expect(nextOrganizer(pool, "zzz")).toBe("a");
  });
});

describe("nextThirdThursday", () => {
  it("апрель 2026: 3-й четверг — 16 апреля", () => {
    // 2026-04-01 — среда. Первый чт — 2 апреля. Второй — 9. Третий — 16.
    const result = nextThirdThursday(new Date(2026, 3, 1));
    expect(formatDateIso(result)).toBe("2026-04-16");
  });

  it("если from = 3-й чт текущего месяца — вернуть его", () => {
    const result = nextThirdThursday(new Date(2026, 3, 16));
    expect(formatDateIso(result)).toBe("2026-04-16");
  });

  it("если from позже 3-го чт месяца — вернуть 3-й чт следующего", () => {
    // 17 апреля — пятница, уже позже 16-го.
    // 3-й чт мая 2026: 1 мая — пт. Первый чт — 7. Второй — 14. Третий — 21.
    const result = nextThirdThursday(new Date(2026, 3, 17));
    expect(formatDateIso(result)).toBe("2026-05-21");
  });

  it("переход через декабрь в январь", () => {
    // 3-й чт дек 2026: 1 дек — вт. Первый чт — 3. Второй — 10. Третий — 17.
    // 18 декабря 2026 — пт. next = 3-й чт января 2027.
    // 2027-01-01 — пт. Первый чт — 7. Третий — 21.
    const result = nextThirdThursday(new Date(2026, 11, 18));
    expect(formatDateIso(result)).toBe("2027-01-21");
  });

  it("високосный год февраль не ломает", () => {
    // 3-й чт февраля 2024: 1 фев — чт. Первый чт — 1. Второй — 8. Третий — 15.
    const result = nextThirdThursday(new Date(2024, 1, 1));
    expect(formatDateIso(result)).toBe("2024-02-15");
  });
});

describe("formatDateIso", () => {
  it("форматирует Date в YYYY-MM-DD (local-time)", () => {
    expect(formatDateIso(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(formatDateIso(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
```

- [ ] **Step 2: Прогнать — должен упасть**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/rotation.test.ts`
Expected: FAIL, module `../rotation` не найден.

- [ ] **Step 3: Реализация**

```ts
// src/lib/rotation.ts

export type PoolMember = { id: string; displayName: string };

export function nextOrganizer(
  pool: PoolMember[],
  lastOrganizerId: string | null,
): string | null {
  if (pool.length === 0) return null;
  if (!lastOrganizerId) return pool[0].id;
  const idx = pool.findIndex((m) => m.id === lastOrganizerId);
  if (idx === -1) return pool[0].id;
  return pool[(idx + 1) % pool.length].id;
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): Date {
  // monthIndex: 0..11 как в JS Date. weekday: 0=Sun..6=Sat. n: 1..5.
  const first = new Date(year, monthIndex, 1);
  const offsetToFirstWeekday = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offsetToFirstWeekday + (n - 1) * 7);
}

export function nextThirdThursday(from: Date): Date {
  const THURSDAY = 4;
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();
  const thisMonthThird = nthWeekdayOfMonth(y, m, THURSDAY, 3);
  const fromDateOnly = new Date(y, m, d);
  if (thisMonthThird.getTime() >= fromDateOnly.getTime()) {
    return thisMonthThird;
  }
  const nextMonth = m === 11 ? 0 : m + 1;
  const nextYear = m === 11 ? y + 1 : y;
  return nthWeekdayOfMonth(nextYear, nextMonth, THURSDAY, 3);
}

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 4: Прогнать — должен пройти**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/rotation.test.ts`
Expected: PASS (все кейсы).

- [ ] **Step 5: Коммит**

```bash
git add src/lib/rotation.ts src/lib/__tests__/rotation.test.ts
git commit -m "feat(rotation): nextOrganizer + nextThirdThursday + formatDateIso (#N)"
```

---

### Task 3: `src/lib/meetings.ts` (ensureNextMeeting)

**Files:**
- Create: `src/lib/meetings.ts`

Domain helper, использует БД. Unit-тестов не пишем (было бы интеграционное).

- [ ] **Step 1: Реализация**

```ts
// src/lib/meetings.ts
import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { nextOrganizer, nextThirdThursday, formatDateIso, type PoolMember } from "./rotation";

export type EnsureResult =
  | { created: false }
  | { created: true; meetingId: string; organizerId: string | null; date: string };

export async function ensureNextMeeting(groupId: string): Promise<EnsureResult> {
  const today = formatDateIso(new Date());

  const upcoming = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.groupId, groupId),
        eq(meetings.kind, "standard"),
        eq(meetings.status, "scheduled"),
        gte(meetings.date, today),
      ),
    )
    .limit(1);

  if (upcoming.length > 0) return { created: false };

  const poolRows = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.groupId, groupId), eq(members.status, "active")))
    .orderBy(members.createdAt);

  const pool: PoolMember[] = poolRows;

  const lastStandard = await db
    .select({ organizerId: meetings.organizerId })
    .from(meetings)
    .where(and(eq(meetings.groupId, groupId), eq(meetings.kind, "standard")))
    .orderBy(desc(meetings.date))
    .limit(1);

  const lastOrganizerId = lastStandard[0]?.organizerId ?? null;
  const organizerId = nextOrganizer(pool, lastOrganizerId);

  const date = formatDateIso(nextThirdThursday(new Date()));
  const meetingId = randomUUID();
  const now = new Date().toISOString();

  await db.insert(meetings).values({
    id: meetingId,
    groupId,
    date,
    organizerId,
    location: null,
    status: "scheduled",
    kind: "standard",
    createdAt: now,
  });

  return { created: true, meetingId, organizerId, date };
}

export async function findMeetingInNDays(
  groupId: string,
  days: number,
): Promise<{ id: string; date: string; organizerId: string | null } | null> {
  const target = new Date();
  target.setDate(target.getDate() + days);
  const targetIso = formatDateIso(target);

  const rows = await db
    .select({ id: meetings.id, date: meetings.date, organizerId: meetings.organizerId })
    .from(meetings)
    .where(
      and(
        eq(meetings.groupId, groupId),
        eq(meetings.kind, "standard"),
        eq(meetings.status, "scheduled"),
        eq(meetings.date, targetIso),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
```

- [ ] **Step 2: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 3: Коммит**

```bash
git add src/lib/meetings.ts
git commit -m "feat(meetings): ensureNextMeeting + findMeetingInNDays (#N)"
```

---

### Task 4: `src/bot/reminders.ts` + тесты

**Files:**
- Create: `src/bot/reminders.ts`
- Test: `src/bot/__tests__/reminders.test.ts`

- [ ] **Step 1: Написать падающие тесты**

```ts
// src/bot/__tests__/reminders.test.ts
import { describe, it, expect } from "vitest";
import {
  findLaggardsWeekly,
  findLaggardsMonthly,
  formatMentions,
  composeWeeklyReminder,
  composeMonthlyReminder,
  currentWeekStart,
  monthIso,
} from "../reminders";

type TestMember = { id: string; displayName: string; telegramId: string | null };

const alice: TestMember = { id: "a", displayName: "Alice", telegramId: "111" };
const bob: TestMember = { id: "b", displayName: "Bob", telegramId: null };
const carol: TestMember = { id: "c", displayName: "Carol", telegramId: "333" };

describe("findLaggardsWeekly", () => {
  it("все сдали → пусто", () => {
    const reports = [
      { memberId: "a", weekStart: "2026-04-20" },
      { memberId: "b", weekStart: "2026-04-20" },
      { memberId: "c", weekStart: "2026-04-20" },
    ];
    expect(findLaggardsWeekly([alice, bob, carol], reports, "2026-04-20")).toEqual([]);
  });

  it("один не сдал → он в списке", () => {
    const reports = [
      { memberId: "a", weekStart: "2026-04-20" },
      { memberId: "c", weekStart: "2026-04-20" },
    ];
    expect(findLaggardsWeekly([alice, bob, carol], reports, "2026-04-20")).toEqual([bob]);
  });

  it("отчёты за другую неделю не считаются", () => {
    const reports = [{ memberId: "a", weekStart: "2026-04-13" }];
    const result = findLaggardsWeekly([alice], reports, "2026-04-20");
    expect(result).toEqual([alice]);
  });
});

describe("findLaggardsMonthly", () => {
  it("все сдали → пусто", () => {
    const financials = [
      { memberId: "a", month: "2026-04-01" },
      { memberId: "b", month: "2026-04-01" },
    ];
    expect(findLaggardsMonthly([alice, bob], financials, "2026-04-01")).toEqual([]);
  });

  it("один не сдал → он в списке", () => {
    const financials = [{ memberId: "a", month: "2026-04-01" }];
    expect(findLaggardsMonthly([alice, bob], financials, "2026-04-01")).toEqual([bob]);
  });

  it("финансы за другой месяц не считаются", () => {
    const financials = [{ memberId: "a", month: "2026-03-01" }];
    expect(findLaggardsMonthly([alice], financials, "2026-04-01")).toEqual([alice]);
  });
});

describe("formatMentions", () => {
  it("с telegramId → @displayName", () => {
    expect(formatMentions([alice])).toBe("@Alice");
  });

  it("без telegramId → без @", () => {
    expect(formatMentions([bob])).toBe("Bob");
  });

  it("смесь: запятая через пробел", () => {
    expect(formatMentions([alice, bob, carol])).toBe("@Alice, Bob, @Carol");
  });

  it("пустой массив → пустая строка", () => {
    expect(formatMentions([])).toBe("");
  });
});

describe("composeWeeklyReminder", () => {
  it("пусто → null", () => {
    expect(composeWeeklyReminder([])).toBe(null);
  });

  it("один laggard", () => {
    const msg = composeWeeklyReminder([bob]);
    expect(msg).toContain("Bob");
    expect(msg).toContain("еженедельн");
  });
});

describe("composeMonthlyReminder", () => {
  it("пусто → null", () => {
    expect(composeMonthlyReminder([], "2026-04-16")).toBe(null);
  });

  it("включает дату встречи и список", () => {
    const msg = composeMonthlyReminder([alice, bob], "2026-04-16");
    expect(msg).toContain("16.04");
    expect(msg).toContain("@Alice");
    expect(msg).toContain("Bob");
    expect(msg).toContain("ежемесячн");
  });
});

describe("currentWeekStart", () => {
  it("понедельник → та же дата", () => {
    // 2026-04-20 — понедельник
    expect(currentWeekStart(new Date(2026, 3, 20))).toBe("2026-04-20");
  });

  it("воскресенье → предыдущий понедельник", () => {
    // 2026-04-26 — воскресенье. Понедельник той же ISO-недели — 20 апреля.
    expect(currentWeekStart(new Date(2026, 3, 26))).toBe("2026-04-20");
  });

  it("четверг → понедельник той же недели", () => {
    expect(currentWeekStart(new Date(2026, 3, 23))).toBe("2026-04-20");
  });
});

describe("monthIso", () => {
  it("возвращает первый день месяца", () => {
    expect(monthIso(new Date(2026, 3, 15))).toBe("2026-04-01");
    expect(monthIso(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(monthIso(new Date(2026, 11, 31))).toBe("2026-12-01");
  });
});
```

- [ ] **Step 2: Прогнать — должен упасть**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/reminders.test.ts`
Expected: FAIL, модуль `../reminders` не найден.

- [ ] **Step 3: Реализация**

```ts
// src/bot/reminders.ts
import { formatDateIso } from "@/lib/rotation";

export type RemMember = { id: string; displayName: string; telegramId: string | null };
export type RemWeeklyReport = { memberId: string; weekStart: string };
export type RemMonthlyFinancial = { memberId: string; month: string };

export function findLaggardsWeekly(
  members: RemMember[],
  reports: RemWeeklyReport[],
  currentWeekStartIso: string,
): RemMember[] {
  const submitted = new Set(
    reports.filter((r) => r.weekStart === currentWeekStartIso).map((r) => r.memberId),
  );
  return members.filter((m) => !submitted.has(m.id));
}

export function findLaggardsMonthly(
  members: RemMember[],
  financials: RemMonthlyFinancial[],
  currentMonthIso: string,
): RemMember[] {
  const submitted = new Set(
    financials.filter((f) => f.month === currentMonthIso).map((f) => f.memberId),
  );
  return members.filter((m) => !submitted.has(m.id));
}

export function formatMentions(laggards: RemMember[]): string {
  return laggards
    .map((m) => (m.telegramId ? `@${m.displayName}` : m.displayName))
    .join(", ");
}

export function composeWeeklyReminder(laggards: RemMember[]): string | null {
  if (laggards.length === 0) return null;
  const mentions = formatMentions(laggards);
  return `Воскресенье, ждём еженедельный отчёт от: ${mentions}. В групповом чате: @lummbrain_bot Еженедельный отчёт ...`;
}

export function composeMonthlyReminder(
  laggards: RemMember[],
  meetingDateIso: string,
): string | null {
  if (laggards.length === 0) return null;
  const mentions = formatMentions(laggards);
  const [y, m, d] = meetingDateIso.split("-");
  const humanDate = `${d}.${m}.${y}`;
  return `Через 3 дня встреча (${humanDate}). Ждём ежемесячный отчёт от: ${mentions}. Сдать: https://lumm.space/financials`;
}

export function currentWeekStart(from: Date): string {
  const day = from.getDay(); // 0=вс..6=сб
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(from.getFullYear(), from.getMonth(), from.getDate() + diffToMonday);
  return formatDateIso(monday);
}

export function monthIso(from: Date): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
```

- [ ] **Step 4: Прогнать — должен пройти**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/reminders.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/bot/reminders.ts src/bot/__tests__/reminders.test.ts
git commit -m "feat(reminders): findLaggards/formatMentions/compose + тесты (#N)"
```

---

### Task 5: `src/bot/scheduler.ts` + wire в `src/bot/index.ts`

**Files:**
- Create: `src/bot/scheduler.ts`
- Modify: `src/bot/index.ts`

- [ ] **Step 1: Реализация scheduler.ts**

```ts
// src/bot/scheduler.ts
import cron from "node-cron";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, members, weeklyReports, monthlyFinancials } from "@/db/schema";
import { ensureNextMeeting, findMeetingInNDays } from "@/lib/meetings";
import { sendGroupMessage } from "@/lib/telegram";
import {
  findLaggardsWeekly,
  findLaggardsMonthly,
  composeWeeklyReminder,
  composeMonthlyReminder,
  currentWeekStart,
  monthIso,
  type RemMember,
} from "./reminders";

const TZ = "Europe/Moscow";

async function getActiveMembers(groupId: string): Promise<RemMember[]> {
  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      telegramId: members.telegramId,
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
        const pool = await getActiveMembers(g.id);
        const organizer = pool.find((m) => m.id === result.organizerId);
        const organizerPart = organizer
          ? organizer.telegramId
            ? `@${organizer.displayName}`
            : organizer.displayName
          : "ещё не назначен";
        const [y, m, d] = result.date.split("-");
        await sendToGroup(
          `Следующий мастермайнд: ${d}.${m}.${y} (четверг), ведёт ${organizerPart}.`,
        );
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
```

**Обрати внимание:**
- `INITIAL_DELAY_MS` запуск `dailyTick` сразу после старта — это то самое «не ждать до завтра при деплое». Проверка «нет будущей standard» гарантирует идемпотентность.
- `monthly-reminder` внутри `dailyTick` — не отдельный cron-job, т.к. всё равно бежит ежедневно 09:00 вместе с ensure-next-meeting.

- [ ] **Step 2: Wire в bot/index.ts**

Найти в `src/bot/index.ts` строку `bot.start({...` и заменить последний блок на:

```ts
import { startScheduler } from "./scheduler";

// ... остальное как есть ...

bot.start({
  onStart: () => {
    console.log("LUMM Bot started (long-polling)");
    startScheduler();
  },
});
```

(Если импорт `startScheduler` уже добавлен в начало файла — оставь один.)

- [ ] **Step 3: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 4: Коммит**

```bash
git add src/bot/scheduler.ts src/bot/index.ts
git commit -m "feat(bot): scheduler — daily/weekly cron для meetings и напоминаний (#N)"
```

---

### Task 6: `GET /api/meetings` — auth + groupId-фильтр

**Files:**
- Modify: `src/app/api/meetings/route.ts`

- [ ] **Step 1: Переписать файл целиком**

```ts
// src/app/api/meetings/route.ts
import { randomUUID } from "crypto";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_KIND = new Set(["standard", "ad_hoc"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      organizerId: meetings.organizerId,
      location: meetings.location,
      status: meetings.status,
      kind: meetings.kind,
      createdAt: meetings.createdAt,
      organizerDisplayName: members.displayName,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.groupId, user.groupId))
    .orderBy(desc(meetings.date));

  return Response.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  if (typeof body.date !== "string" || !ISO_DATE.test(body.date)) {
    return Response.json({ error: "date должен быть в формате YYYY-MM-DD" }, { status: 400 });
  }

  const kind = body.kind ?? "standard";
  if (typeof kind !== "string" || !ALLOWED_KIND.has(kind)) {
    return Response.json({ error: "kind должен быть standard или ad_hoc" }, { status: 400 });
  }

  let organizerId: string | null = null;
  if (body.organizerId !== null && body.organizerId !== undefined) {
    if (typeof body.organizerId !== "string") {
      return Response.json({ error: "organizerId должен быть строкой или null" }, { status: 400 });
    }
    const member = await db
      .select({ id: members.id, groupId: members.groupId })
      .from(members)
      .where(eq(members.id, body.organizerId))
      .limit(1);
    if (member.length === 0 || member[0].groupId !== user.groupId) {
      return Response.json({ error: "Организатор не найден в вашей группе" }, { status: 400 });
    }
    organizerId = body.organizerId;
  }

  const location =
    body.location === null || body.location === undefined || body.location === ""
      ? null
      : typeof body.location === "string"
        ? body.location
        : null;

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(meetings).values({
    id,
    groupId: user.groupId,
    date: body.date,
    organizerId,
    location,
    status: "scheduled",
    kind: kind as "standard" | "ad_hoc",
    createdAt: now,
  });

  return Response.json(
    {
      id,
      groupId: user.groupId,
      date: body.date,
      organizerId,
      location,
      status: "scheduled",
      kind,
      createdAt: now,
    },
    { status: 201 },
  );
}
```


- [ ] **Step 2: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 3: Коммит**

```bash
git add src/app/api/meetings/route.ts
git commit -m "feat(api): GET/POST /api/meetings — auth + groupId (#N)"
```

---

### Task 7: `PATCH /api/meetings/[id]`

**Files:**
- Create: `src/app/api/meetings/[id]/route.ts`

- [ ] **Step 1: Реализация**

```ts
// src/app/api/meetings/[id]/route.ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_KIND = new Set(["standard", "ad_hoc"]);
const ALLOWED_STATUS = new Set(["scheduled", "completed", "cancelled"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db
    .select({ id: meetings.id, groupId: meetings.groupId })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  if (existing.length === 0 || existing[0].groupId !== user.groupId) {
    return Response.json({ error: "Встреча не найдена" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.date !== undefined) {
    if (typeof body.date !== "string" || !ISO_DATE.test(body.date)) {
      return Response.json({ error: "date должен быть в формате YYYY-MM-DD" }, { status: 400 });
    }
    update.date = body.date;
  }

  if (body.kind !== undefined) {
    if (typeof body.kind !== "string" || !ALLOWED_KIND.has(body.kind)) {
      return Response.json({ error: "kind должен быть standard или ad_hoc" }, { status: 400 });
    }
    update.kind = body.kind;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUS.has(body.status)) {
      return Response.json(
        { error: "status должен быть scheduled, completed или cancelled" },
        { status: 400 },
      );
    }
    update.status = body.status;
  }

  if (body.location !== undefined) {
    if (body.location === null || body.location === "") {
      update.location = null;
    } else if (typeof body.location === "string") {
      update.location = body.location;
    } else {
      return Response.json({ error: "location должен быть строкой или null" }, { status: 400 });
    }
  }

  if (body.organizerId !== undefined) {
    if (body.organizerId === null) {
      update.organizerId = null;
    } else if (typeof body.organizerId === "string") {
      const member = await db
        .select({ id: members.id, groupId: members.groupId })
        .from(members)
        .where(eq(members.id, body.organizerId))
        .limit(1);
      if (member.length === 0 || member[0].groupId !== user.groupId) {
        return Response.json({ error: "Организатор не найден в вашей группе" }, { status: 400 });
      }
      update.organizerId = body.organizerId;
    } else {
      return Response.json({ error: "organizerId должен быть строкой или null" }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  await db.update(meetings).set(update).where(eq(meetings.id, id));

  const [saved] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  return Response.json(saved, { status: 200 });
}
```

- [ ] **Step 2: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 3: Коммит**

```bash
git add src/app/api/meetings/[id]/route.ts
git commit -m "feat(api): PATCH /api/meetings/[id] (#N)"
```

---

### Task 8: UI `/calendar` — форма создания/редактирования + groupId фильтр

**Files:**
- Modify: `src/app/(main)/calendar/page.tsx`
- Create: `src/app/(main)/calendar/CalendarClient.tsx`

- [ ] **Step 1: Переписать page.tsx**

```tsx
// src/app/(main)/calendar/page.tsx
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const all = await db
    .select({
      id: meetings.id,
      date: meetings.date,
      organizerId: meetings.organizerId,
      location: meetings.location,
      status: meetings.status,
      kind: meetings.kind,
      organizerDisplayName: members.displayName,
      organizerAvatarColor: members.avatarColor,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.groupId, user.groupId))
    .orderBy(desc(meetings.date));

  const pool = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(members.createdAt);

  return <CalendarClient meetings={all} pool={pool} />;
}
```

- [ ] **Step 2: Создать CalendarClient.tsx**

```tsx
// src/app/(main)/calendar/CalendarClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Meeting = {
  id: string;
  date: string;
  organizerId: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  kind: "standard" | "ad_hoc";
  organizerDisplayName: string | null;
  organizerAvatarColor: string | null;
};

type PoolMember = { id: string; displayName: string };

type Props = {
  meetings: Meeting[];
  pool: PoolMember[];
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type FormState = {
  id: string | null; // null = создание
  date: string;
  kind: "standard" | "ad_hoc";
  organizerId: string;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
};

const EMPTY_FORM: FormState = {
  id: null,
  date: today(),
  kind: "ad_hoc",
  organizerId: "",
  location: "",
  status: "scheduled",
};

export function CalendarClient({ meetings, pool }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcoming = meetings.filter((m) => m.status === "scheduled");
  const past = meetings.filter((m) => m.status !== "scheduled");

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  function openEdit(m: Meeting) {
    setForm({
      id: m.id,
      date: m.date,
      kind: m.kind,
      organizerId: m.organizerId ?? "",
      location: m.location ?? "",
      status: m.status,
    });
    setError(null);
  }

  function close() {
    setForm(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      date: form.date,
      kind: form.kind,
      organizerId: form.organizerId || null,
      location: form.location || null,
    };
    if (form.id) payload.status = form.status;

    const url = form.id ? `/api/meetings/${form.id}` : "/api/meetings";
    const method = form.id ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        setError(data.error ?? "Ошибка сервера");
        return;
      }
      close();
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMeeting(m: Meeting) {
    if (!confirm(`Отменить встречу ${formatDate(m.date)}?`)) return;
    try {
      const res = await fetch(`/api/meetings/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        alert("Не удалось отменить встречу");
        return;
      }
      router.refresh();
    } catch {
      alert("Ошибка соединения");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Календарь встреч</h1>
          <p className="text-lumm-text-secondary mt-1">Третий четверг каждого месяца</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
        >
          Создать встречу
        </button>
      </div>

      <section>
        <h2 className="text-sm font-medium text-lumm-gold mb-4">Предстоящие</h2>
        <div className="space-y-4">
          {upcoming.length === 0 && (
            <p className="text-lumm-text-secondary text-sm">Нет запланированных встреч</p>
          )}
          {upcoming.map((m) => {
            const days = daysUntil(m.date);
            return (
              <div
                key={m.id}
                className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">
                      {m.kind === "standard" ? "Стандартная" : "Ad-hoc"}
                    </p>
                    <p className="text-lg text-lumm-text-primary">{formatDate(m.date)}</p>
                    <p className="text-sm text-lumm-text-secondary mt-1">
                      {days === 0 && "Сегодня"}
                      {days === 1 && "Завтра"}
                      {days > 1 && `Через ${days} ${days === 1 ? "день" : "дней"}`}
                    </p>
                    <p className="text-sm text-lumm-text-secondary mt-2">
                      Организатор: {m.organizerDisplayName ?? "не назначен"}
                    </p>
                    {m.location && (
                      <p className="text-sm text-lumm-text-secondary">Место: {m.location}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="px-3 py-1 text-sm text-lumm-text-secondary border border-lumm-gray-light rounded hover:text-lumm-text-primary"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => cancelMeeting(m)}
                      className="px-3 py-1 text-sm text-red-400 border border-red-500/30 rounded hover:bg-red-500/10"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-lumm-text-secondary mb-4">Прошедшие и отменённые</h2>
          <div className="space-y-2">
            {past.map((m) => (
              <div
                key={m.id}
                className={`bg-lumm-black border border-lumm-gray-light/50 rounded-lg p-4 ${
                  m.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-lumm-text-secondary mr-2">
                      {m.kind === "standard" ? "ст." : "ad-hoc"}
                    </span>
                    <span className="text-sm text-lumm-text-primary">{formatDate(m.date)}</span>
                    {m.organizerDisplayName && (
                      <span className="text-sm text-lumm-text-secondary ml-2">
                        · {m.organizerDisplayName}
                      </span>
                    )}
                    <span className="text-xs text-lumm-text-secondary ml-2">
                      ({m.status === "cancelled" ? "отменена" : "проведена"})
                    </span>
                  </div>
                  <button
                    onClick={() => openEdit(m)}
                    className="text-xs text-lumm-text-secondary hover:text-lumm-text-primary"
                  >
                    Редактировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {form && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={close}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="bg-lumm-black border border-lumm-gold/30 rounded-xl p-6 space-y-4 w-full max-w-md"
          >
            <h3 className="text-lg font-medium text-lumm-gold">
              {form.id ? "Редактировать встречу" : "Новая встреча"}
            </h3>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Дата</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Тип</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    checked={form.kind === "standard"}
                    onChange={() => setForm({ ...form, kind: "standard" })}
                  />
                  Стандартная (в ротации)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    checked={form.kind === "ad_hoc"}
                    onChange={() => setForm({ ...form, kind: "ad_hoc" })}
                  />
                  Ad-hoc (вне ротации)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Организатор</label>
              <select
                value={form.organizerId}
                onChange={(e) => setForm({ ...form, organizerId: e.target.value })}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              >
                <option value="">— не назначен —</option>
                {pool.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">
                Место (опционально)
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>

            {form.id && (
              <div>
                <label className="block text-sm text-lumm-text-secondary mb-1">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as FormState["status"] })
                  }
                  className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
                >
                  <option value="scheduled">Запланирована</option>
                  <option value="completed">Проведена</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm text-lumm-text-secondary border border-lumm-gray-light rounded hover:text-lumm-text-primary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm bg-lumm-gold text-lumm-dark font-medium rounded hover:bg-lumm-gold-light disabled:opacity-50"
              >
                {submitting ? "Сохранение..." : form.id ? "Сохранить" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Проверить типы + lint**

Run: `cd /root/lumm && npx tsc --noEmit && npm run lint 2>&1 | tail -10`
Expected: tsc чисто; линт — только pre-existing.

- [ ] **Step 4: Коммит**

```bash
git add "src/app/(main)/calendar/page.tsx" "src/app/(main)/calendar/CalendarClient.tsx"
git commit -m "feat(calendar): UI создания/редактирования + groupId фильтр (#N)"
```

---

### Task 9: Сборка + ручная проверка + деплой

- [ ] **Step 1: Финальный прогон тестов**

Run: `cd /root/lumm && npx vitest run`
Expected: тесты Эпика 4 (rotation, reminders) зелёные; 5 pre-existing fail в `src/bot/__tests__/parser.test.ts` — ожидаемо.

- [ ] **Step 2: Сборка**

Run: `cd /root/lumm && npm run build 2>&1 | tail -5`
Expected: сборка прошла.

- [ ] **Step 3: Push ветки + PR**

```bash
cd /root/lumm
git push -u origin epic-4-meetings
gh pr create --title "Эпик 4: календарь встреч + бот-напоминания" --body "$(cat <<'EOF'
## Summary
- Cron в lumm-bot.service: daily 09:00 MSK (ensureNextMeeting + monthly-reminder за 3 дня), sunday 19:00 MSK (weekly-reminder). Smart: пингуем только отстающих.
- Поле kind (standard/ad_hoc) в meetings; ротация смотрит только на standard.
- POST/PATCH /api/meetings — любой участник группы, auth + groupId-фильтр.
- /calendar: модалка создания/редактирования, кнопка «Отменить».
- /api/meetings GET теперь с auth + groupId.
- Initial tick при старте бота (через 10 сек) — на случай деплоя, чтобы создать первую встречу сразу.

Closes #N

## Test plan
- [x] `npm test` — Эпик-4 тесты зелёные
- [x] `npx tsc --noEmit` — без ошибок
- [x] `npm run build` — зелёный
- [ ] Prod: применить миграцию, пересобрать, рестартовать оба сервиса:
  ```bash
  cp data/lumm.db "data/lumm.db.bak.$(date +%Y%m%d-%H%M%S)"
  sqlite3 data/lumm.db < scripts/migrations/2026-04-22-meetings-kind.sql
  npm run build
  sudo systemctl restart lumm.service lumm-bot.service
  ```
- [ ] Через 10 сек после рестарта бота — проверить что первая standard встреча создалась в /calendar
- [ ] Ручной тест на /calendar: создать ad-hoc, отредактировать, отменить
EOF
)"
```

- [ ] **Step 4: После мержа PR — деплой на prod**

```bash
cd /root/lumm
git checkout master && git pull
cp data/lumm.db "data/lumm.db.bak.$(date +%Y%m%d-%H%M%S)"
sqlite3 data/lumm.db "SELECT kind FROM meetings LIMIT 1;" 2>&1 | head -3   # если 'no such column' — нужна миграция
sqlite3 data/lumm.db < scripts/migrations/2026-04-22-meetings-kind.sql
npm run build
sudo systemctl restart lumm.service lumm-bot.service
sudo systemctl is-active lumm.service lumm-bot.service
```

- [ ] **Step 5: Smoke тест prod**

- Проверить `journalctl -u lumm-bot.service -n 50 --no-pager | grep scheduler` — должны быть строки `[scheduler] started`, затем через ~10 сек `[scheduler] initial tick (after startup delay)`.
- Через минуту проверить `sqlite3 data/lumm.db "SELECT date, kind, status, organizer_id FROM meetings ORDER BY created_at DESC LIMIT 3;"` — должна появиться первая standard встреча на ближайший 3-й чт.
- Проверить групп-чат Telegram — должно прилететь «Следующий мастермайнд: DD.MM.YYYY (четверг), ведёт …».
- Открыть `/calendar` на сайте — встреча в «Предстоящие» с бейджем «Стандартная» и организатором.

- [ ] **Step 6: Закрыть issue + обновить доску**

```bash
gh issue close N --comment "Готово и в проде. Merge: <sha>. Cron активен в lumm-bot.service. Миграция применена, бекап data/lumm.db.bak.*."
```

Также обновить auto-memory в `/root/.claude/projects/-root/memory/project_lumm.md`: отметить Эпик 4 готовым, оставить следующим в очереди LLM-анализ ежемесячных и дашборды.

---

## Финальный чек-лист

- [ ] Все 9 задач выполнены, коммиты с `#N`
- [ ] `npx vitest run` — все тесты Эпика 4 зелёные
- [ ] `npx tsc --noEmit` — без ошибок
- [ ] `npm run build` — зелёный
- [ ] Миграция применена на prod, бекап создан
- [ ] Оба сервиса (`lumm.service`, `lumm-bot.service`) перезапущены, `active`
- [ ] Первая standard встреча появилась в БД после рестарта
- [ ] Сообщение о следующей встрече улетело в групп-чат
- [ ] `/calendar` рендерит встречу, форма создания/редактирования работает
- [ ] PR смержен, issue закрыт
- [ ] `project_lumm.md` обновлён

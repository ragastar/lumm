# RSVP + unified announces + UI termonology: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать RSVP (opt-in «Записаться») для доп. встреч + унифицированные bot-анонсы при создании/отмене + переименовать типы встреч в UI («Мастермайнд» / «Доп. встреча»).

**Architecture:** Новая таблица `meeting_attendees` (UNIQUE по паре meeting+member). Чистая функция `composeAnnouncement` в `src/lib/meetingAnnouncements.ts` под юнит-тесты; thin adapter `announceMeeting` для IO. API-роуты attend/detach/detail как тонкие обёртки. Детальная страница `/calendar/[id]` (server + client components) показывает детали встречи, организатора и список «Идут» с кнопкой RSVP для ad-hoc. `src/bot/scheduler.ts` переиспользует `announceMeeting`.

**Tech Stack:** Next.js 16 App Router, TypeScript, SQLite + Drizzle, vitest, node-cron (уже wired), grammy (бот), TailwindCSS.

**Spec:** [docs/superpowers/specs/2026-04-23-rsvp-and-unified-announces-design.md](../specs/2026-04-23-rsvp-and-unified-announces-design.md)

---

## Pre-setup

- [ ] **Создать GitHub issue** на `ragastar/lumm` с названием «RSVP на доп. встречи + унифицированные bot-анонсы + термины UI», записать номер `#N`.

```bash
gh issue create \
  --repo ragastar/lumm \
  --title "RSVP на доп. встречи + унифицированные bot-анонсы + термины UI" \
  --body "Переименование типов встреч в UI (Мастермайнд/Доп. встреча), таблица meeting_attendees, RSVP API и страница /calendar/[id], унификация bot-анонсов (at-создание + at-отмена), /help обновить.

Спека: docs/superpowers/specs/2026-04-23-rsvp-and-unified-announces-design.md
План:  docs/superpowers/plans/2026-04-23-rsvp-and-unified-announces.md"
```

- [ ] **Создать ветку:**

```bash
cd /root/lumm && git checkout -b rsvp-and-announces
```

---

## Файловая структура

**Создать:**
- `scripts/migrations/2026-04-23-meeting-attendees.sql`
- `src/lib/meetingAnnouncements.ts` — `composeAnnouncement` (чистая) + `announceMeeting` (IO adapter)
- `src/lib/__tests__/meetingAnnouncements.test.ts`
- `src/app/api/meetings/[id]/attend/route.ts` — POST (записать) + DELETE (отменить)
- `src/app/(main)/calendar/[id]/page.tsx` — server component
- `src/app/(main)/calendar/[id]/MeetingDetailClient.tsx` — client component

**Модифицировать:**
- `src/db/schema.ts` — добавить `meetingAttendees`
- `src/db/seed.ts` — добавить DDL
- `src/app/api/meetings/route.ts` — POST: RSVP организатора в ad_hoc + announce; GET: добавить `attendeesCount`
- `src/app/api/meetings/[id]/route.ts` — PATCH: announce при cancel; новый GET для детальной
- `src/app/(main)/calendar/page.tsx` — вытянуть attendeesCount, прокинуть в CalendarClient
- `src/app/(main)/calendar/CalendarClient.tsx` — термины, счётчик «Идут», клик по карточке → детальная
- `src/bot/scheduler.ts` — заменить inline-формирование на `announceMeeting`
- `src/app/(main)/help/page.tsx` — термины + абзац про RSVP

---

### Task 1: Миграция БД + schema.ts + seed.ts

**Files:**
- Create: `scripts/migrations/2026-04-23-meeting-attendees.sql`
- Modify: `src/db/schema.ts` (добавить таблицу в конец)
- Modify: `src/db/seed.ts` (добавить DDL-блок для таблицы)

- [ ] **Step 1: Написать миграцию**

```sql
-- scripts/migrations/2026-04-23-meeting-attendees.sql
-- RSVP на встречи: таблица meeting_attendees

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_meeting_member
  ON meeting_attendees(meeting_id, member_id);
```

- [ ] **Step 2: Применить на dev**

```bash
sqlite3 /root/lumm/data/lumm.db < /root/lumm/scripts/migrations/2026-04-23-meeting-attendees.sql
sqlite3 /root/lumm/data/lumm.db ".schema meeting_attendees"
```

Expected: `CREATE TABLE meeting_attendees (...)` и `CREATE UNIQUE INDEX uniq_meeting_member`.

- [ ] **Step 3: Обновить `src/db/schema.ts`**

Добавить импорт `uniqueIndex` в первую строку если не добавлен:

```ts
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
```

В конец файла (после `meetings`, `reportAnalyses`):

```ts
export const meetingAttendees = sqliteTable(
  "meeting_attendees",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id").notNull().references(() => meetings.id),
    memberId: text("member_id").notNull().references(() => members.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqMeetingMember: uniqueIndex("uniq_meeting_member").on(table.meetingId, table.memberId),
  }),
);
```

- [ ] **Step 4: Обновить `src/db/seed.ts`**

Найти блок `sqlite.exec` с `CREATE TABLE IF NOT EXISTS meetings (...)` и добавить сразу ПОСЛЕ него (перед закрывающим `);`):

```sql
  CREATE TABLE IF NOT EXISTS meeting_attendees (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id),
    member_id TEXT NOT NULL REFERENCES members(id),
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_meeting_member
    ON meeting_attendees(meeting_id, member_id);
```

- [ ] **Step 5: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 6: Коммит**

```bash
cd /root/lumm
git add scripts/migrations/2026-04-23-meeting-attendees.sql src/db/schema.ts src/db/seed.ts
git commit -m "feat(db): таблица meeting_attendees + UNIQUE(meeting,member) (#N)"
```

---

### Task 2: `src/lib/meetingAnnouncements.ts` — `composeAnnouncement` + тесты

**Files:**
- Create: `src/lib/meetingAnnouncements.ts`
- Test: `src/lib/__tests__/meetingAnnouncements.test.ts`

Чистая функция + тонкий адаптер в одном файле. В этой задаче пишем только чистую часть + тесты.

- [ ] **Step 1: Написать падающие тесты**

```ts
// src/lib/__tests__/meetingAnnouncements.test.ts
import { describe, it, expect } from "vitest";
import { composeAnnouncement } from "../meetingAnnouncements";

type TestMeeting = {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  kind: "standard" | "ad_hoc";
  location: string | null;
  price: number | null;
};

type TestOrganizer = { displayName: string; telegramUsername: string | null } | null;
type TestMember = { displayName: string; telegramUsername: string | null };

const meetingBase: TestMeeting = {
  id: "m-1",
  date: "2026-05-21",
  timeStart: "19:00",
  timeEnd: "21:00",
  kind: "standard",
  location: "кафе Место",
  price: null,
};

const orgWithHandle: TestOrganizer = { displayName: "Theragastar", telegramUsername: "Theragastar" };
const orgNoHandle: TestOrganizer = { displayName: "Vasya", telegramUsername: null };
const baseUrl = "https://lumm.space";

describe("composeAnnouncement — standard created", () => {
  it("без цены — строка про цену отсутствует", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard", price: null },
      organizer: orgWithHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Следующий мастермайнд");
    expect(msg).toContain("21.05.2026");
    expect(msg).toContain("19:00–21:00");
    expect(msg).toContain("@Theragastar");
    expect(msg).toContain("Адрес: кафе Место");
    expect(msg).not.toContain("Цена");
    expect(msg).toContain(`${baseUrl}/calendar/m-1`);
  });

  it("с ценой — показывает total и per-person", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard", price: 5000 },
      organizer: orgWithHandle,
      members: [
        { displayName: "a", telegramUsername: null },
        { displayName: "b", telegramUsername: null },
        { displayName: "c", telegramUsername: null },
        { displayName: "d", telegramUsername: null },
        { displayName: "e", telegramUsername: null },
      ],
      baseUrl,
    });
    expect(msg).toContain("5000 ₽");
    expect(msg).toContain("1000 ₽/чел");
  });

  it("адрес null — «не указан»", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard", location: null },
      organizer: orgWithHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Адрес: не указан");
  });

  it("organizer без @handle — просто имя", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard" },
      organizer: orgNoHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Ведёт: Vasya");
    expect(msg).not.toContain("@Vasya");
  });

  it("organizer null — «ещё не назначен»", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard" },
      organizer: null,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Ведёт: ещё не назначен");
  });
});

describe("composeAnnouncement — ad_hoc created", () => {
  it("пингует всех с @ + имена без @, включает организатора и ссылку", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "ad_hoc", price: null },
      organizer: orgWithHandle,
      members: [
        { displayName: "Alice", telegramUsername: "alice_tg" },
        { displayName: "Bob", telegramUsername: null },
        { displayName: "Carol", telegramUsername: "carol_tg" },
      ],
      baseUrl,
    });
    expect(msg).toContain("@alice_tg");
    expect(msg).toContain("Bob");
    expect(msg).not.toMatch(/@Bob\b/);
    expect(msg).toContain("@carol_tg");
    expect(msg).toContain("@Theragastar");
    expect(msg).toContain("доп. встречу");
    expect(msg).toContain("21.05.2026");
    expect(msg).toContain("19:00–21:00");
    expect(msg).toContain(`${baseUrl}/calendar/m-1`);
  });

  it("с ценой — total и per-person делится на число members", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "ad_hoc", price: 3000 },
      organizer: orgWithHandle,
      members: [
        { displayName: "a", telegramUsername: "a" },
        { displayName: "b", telegramUsername: "b" },
      ],
      baseUrl,
    });
    expect(msg).toContain("3000 ₽");
    expect(msg).toContain("1500 ₽/чел");
  });

  it("без организатора — просто «зовёт на доп. встречу» без имени", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "ad_hoc" },
      organizer: null,
      members: [{ displayName: "a", telegramUsername: "a" }],
      baseUrl,
    });
    expect(msg).toContain("доп. встречу");
    expect(msg).not.toContain("зовёт на");
  });
});

describe("composeAnnouncement — cancelled", () => {
  it("формат единый для обоих kind, включает дату/время/organizer", () => {
    const msg = composeAnnouncement("cancelled", {
      meeting: { ...meetingBase, kind: "standard" },
      organizer: orgWithHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("отменена");
    expect(msg).toContain("21.05.2026");
    expect(msg).toContain("19:00–21:00");
    expect(msg).toContain("@Theragastar");
  });

  it("cancelled без организатора — без упоминания организатора", () => {
    const msg = composeAnnouncement("cancelled", {
      meeting: { ...meetingBase, kind: "ad_hoc" },
      organizer: null,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("отменена");
    expect(msg).not.toContain("Организатор");
  });
});
```

- [ ] **Step 2: Прогнать — должен упасть**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/meetingAnnouncements.test.ts`
Expected: FAIL — модуль `../meetingAnnouncements` не найден.

- [ ] **Step 3: Реализация `composeAnnouncement`**

Создать файл `src/lib/meetingAnnouncements.ts` с чистой функцией:

```ts
// src/lib/meetingAnnouncements.ts

export type AnnounceEvent = "created" | "cancelled";

export type AnnMeeting = {
  id: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  kind: "standard" | "ad_hoc";
  location: string | null;
  price: number | null;
};

export type AnnOrganizer = { displayName: string; telegramUsername: string | null } | null;

export type AnnMember = { displayName: string; telegramUsername: string | null };

export type AnnouncementInput = {
  meeting: AnnMeeting;
  organizer: AnnOrganizer;
  members: AnnMember[]; // active group members (включая организатора)
  baseUrl: string; // "https://lumm.space"
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function mention(person: { displayName: string; telegramUsername: string | null }): string {
  return person.telegramUsername ? `@${person.telegramUsername}` : person.displayName;
}

function organizerLabel(org: AnnOrganizer): string {
  if (!org) return "ещё не назначен";
  return mention(org);
}

export function composeAnnouncement(event: AnnounceEvent, input: AnnouncementInput): string {
  const { meeting, organizer, members, baseUrl } = input;
  const date = formatDate(meeting.date);
  const time = `${meeting.timeStart}–${meeting.timeEnd}`;
  const url = `${baseUrl}/calendar/${meeting.id}`;

  if (event === "cancelled") {
    const lines = [`Встреча ${date} ${time} отменена.`];
    if (organizer) {
      lines[0] += ` Организатор: ${mention(organizer)}.`;
    }
    return lines.join("\n");
  }

  // event === "created"
  if (meeting.kind === "standard") {
    const lines = [
      `Следующий мастермайнд: ${date} ${time}`,
      `Ведёт: ${organizerLabel(organizer)}`,
      `Адрес: ${meeting.location ?? "не указан"}`,
    ];
    if (meeting.price !== null && meeting.price > 0 && members.length > 0) {
      const perPerson = Math.round(meeting.price / members.length);
      lines.push(`Цена: ${meeting.price} ₽ (${perPerson} ₽/чел)`);
    }
    lines.push(`Детали и правки: ${url}`);
    return lines.join("\n");
  }

  // ad_hoc created
  const allMentions = members.map(mention).join(" ");
  const intro = organizer
    ? `${allMentions} — ${mention(organizer)} зовёт на доп. встречу ${date} ${time}.`
    : `${allMentions} — доп. встреча ${date} ${time}.`;
  const lines = [
    intro,
    `Адрес: ${meeting.location ?? "не указан"}`,
  ];
  if (meeting.price !== null && meeting.price > 0 && members.length > 0) {
    const perPerson = Math.round(meeting.price / members.length);
    lines.push(`Цена: ${meeting.price} ₽ (${perPerson} ₽/чел)`);
  }
  lines.push(`Записаться: ${url}`);
  return lines.join("\n");
}
```

- [ ] **Step 4: Прогнать тесты — должны пройти**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/meetingAnnouncements.test.ts`
Expected: PASS (все 10 тестов).

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm
git add src/lib/meetingAnnouncements.ts src/lib/__tests__/meetingAnnouncements.test.ts
git commit -m "feat(announce): composeAnnouncement — чистая функция + тесты (#N)"
```

---

### Task 3: `announceMeeting` — IO-адаптер поверх `composeAnnouncement`

**Files:**
- Modify: `src/lib/meetingAnnouncements.ts` (добавить `announceMeeting` внизу файла)

- [ ] **Step 1: Добавить `announceMeeting` в существующий файл**

В конец `src/lib/meetingAnnouncements.ts` добавить:

```ts
// --- IO-адаптер ---

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members as membersTable } from "@/db/schema";
import { sendGroupMessage } from "./telegram";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lumm.space";

export async function announceMeeting(meetingId: string, event: AnnounceEvent): Promise<void> {
  const chatId = process.env.GROUP_CHAT_ID;
  if (!chatId) {
    console.error("[announceMeeting] GROUP_CHAT_ID не задан — пропускаю отправку");
    return;
  }

  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      kind: meetings.kind,
      location: meetings.location,
      price: meetings.price,
      organizerDisplayName: membersTable.displayName,
      organizerUsername: membersTable.telegramUsername,
    })
    .from(meetings)
    .leftJoin(membersTable, eq(meetings.organizerId, membersTable.id))
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (rows.length === 0) {
    console.error(`[announceMeeting] meeting ${meetingId} not found`);
    return;
  }
  const r = rows[0];

  const organizer: AnnOrganizer = r.organizerDisplayName
    ? { displayName: r.organizerDisplayName, telegramUsername: r.organizerUsername }
    : null;

  // members нужны только для ad_hoc created и для расчёта per-person.
  let activeMembers: AnnMember[] = [];
  if (event === "created") {
    const poolRows = await db
      .select({ displayName: membersTable.displayName, telegramUsername: membersTable.telegramUsername })
      .from(membersTable)
      .where(and(eq(membersTable.groupId, r.groupId), eq(membersTable.status, "active")));
    activeMembers = poolRows;
  }

  const text = composeAnnouncement(event, {
    meeting: {
      id: r.id,
      date: r.date,
      timeStart: r.timeStart,
      timeEnd: r.timeEnd,
      kind: r.kind,
      location: r.location,
      price: r.price,
    },
    organizer,
    members: activeMembers,
    baseUrl: BASE_URL,
  });

  try {
    await sendGroupMessage({ chatId, text });
  } catch (err) {
    console.error("[announceMeeting] sendGroupMessage failed:", err);
  }
}
```

- [ ] **Step 2: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 3: Прогнать тесты**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/meetingAnnouncements.test.ts`
Expected: PASS — те же тесты, новый код не ломает чистую функцию.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm
git add src/lib/meetingAnnouncements.ts
git commit -m "feat(announce): announceMeeting — IO-адаптер поверх composeAnnouncement (#N)"
```

---

### Task 4: API `POST/DELETE /api/meetings/[id]/attend`

**Files:**
- Create: `src/app/api/meetings/[id]/attend/route.ts`

- [ ] **Step 1: Создать файл**

```ts
// src/app/api/meetings/[id]/attend/route.ts
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, meetingAttendees } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

async function loadAndCheck(meetingId: string, groupId: string) {
  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      kind: meetings.kind,
      status: meetings.status,
    })
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (rows.length === 0 || rows[0].groupId !== groupId) {
    return { error: { message: "Встреча не найдена", status: 404 } as const };
  }
  if (rows[0].kind !== "ad_hoc") {
    return { error: { message: "RSVP доступен только для доп. встреч", status: 400 } as const };
  }
  if (rows[0].status !== "scheduled") {
    return { error: { message: "Встреча не активна", status: 400 } as const };
  }
  return { ok: true as const };
}

async function countAttendees(meetingId: string): Promise<number> {
  const rows = await db
    .select({ id: meetingAttendees.id })
    .from(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, meetingId));
  return rows.length;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  try {
    await db.insert(meetingAttendees).values({
      id: randomUUID(),
      meetingId: id,
      memberId: user.id,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // UNIQUE violation — юзер уже записан, идемпотентно продолжаем
    const message = err instanceof Error ? err.message : String(err);
    if (!/UNIQUE/i.test(message)) throw err;
  }

  const attendeesCount = await countAttendees(id);
  return Response.json({ ok: true, attendeesCount }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  await db
    .delete(meetingAttendees)
    .where(and(eq(meetingAttendees.meetingId, id), eq(meetingAttendees.memberId, user.id)));

  const attendeesCount = await countAttendees(id);
  return Response.json({ ok: true, attendeesCount }, { status: 200 });
}
```

- [ ] **Step 2: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 3: Коммит**

```bash
cd /root/lumm
git add "src/app/api/meetings/[id]/attend/route.ts"
git commit -m "feat(api): POST/DELETE /api/meetings/[id]/attend (RSVP) (#N)"
```

---

### Task 5: `GET /api/meetings/[id]` (детальная) + `announceMeeting` на PATCH-cancel

**Files:**
- Modify: `src/app/api/meetings/[id]/route.ts` (добавить GET + логику анонса при отмене)

- [ ] **Step 1: Прочитать текущий файл**

```bash
cd /root/lumm && sed -n '1,30p' "src/app/api/meetings/[id]/route.ts"
```

В файле уже есть `PATCH`. Мы добавляем `GET` в начало (после импортов, перед `PATCH`) и модифицируем `PATCH` — после `db.update(...)` вызываем `announceMeeting` если `status` сменился на `cancelled`.

- [ ] **Step 2: Обновить импорты и добавить `GET`**

Найти в `src/app/api/meetings/[id]/route.ts` блок импортов и заменить на:

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { announceMeeting } from "@/lib/meetingAnnouncements";
```

(`and` нужен для запросов с двумя условиями, `meetingAttendees` для attendees, `announceMeeting` для отмены.)

После блока констант (`const ISO_DATE = ...`, `const TIME_HHMM = ...`, `const ALLOWED_KIND = ...`, `const ALLOWED_STATUS = ...`) добавить функцию `GET`:

```ts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }
  const { id } = await params;

  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      organizerId: meetings.organizerId,
      location: meetings.location,
      price: meetings.price,
      status: meetings.status,
      kind: meetings.kind,
      createdAt: meetings.createdAt,
      organizerDisplayName: members.displayName,
      organizerAvatarColor: members.avatarColor,
      organizerAvatarUrl: members.avatarUrl,
      organizerTelegramUsername: members.telegramUsername,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.id, id))
    .limit(1);

  if (rows.length === 0 || rows[0].groupId !== user.groupId) {
    return Response.json({ error: "Встреча не найдена" }, { status: 404 });
  }
  const m = rows[0];

  const attendees = await db
    .select({
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      telegramUsername: members.telegramUsername,
    })
    .from(meetingAttendees)
    .innerJoin(members, eq(members.id, meetingAttendees.memberId))
    .where(eq(meetingAttendees.meetingId, id))
    .orderBy(meetingAttendees.createdAt);

  return Response.json({
    id: m.id,
    date: m.date,
    timeStart: m.timeStart,
    timeEnd: m.timeEnd,
    location: m.location,
    price: m.price,
    status: m.status,
    kind: m.kind,
    createdAt: m.createdAt,
    organizer: m.organizerId
      ? {
          id: m.organizerId,
          displayName: m.organizerDisplayName,
          avatarColor: m.organizerAvatarColor,
          avatarUrl: m.organizerAvatarUrl,
          telegramUsername: m.organizerTelegramUsername,
        }
      : null,
    attendees,
  });
}
```

- [ ] **Step 3: Обновить `PATCH` — анонс при переходе в cancelled**

В существующей функции `PATCH` найти блок:

```ts
  await db.update(meetings).set(update).where(eq(meetings.id, id));

  const [saved] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  return Response.json(saved, { status: 200 });
}
```

и заменить на:

```ts
  // Определяем был ли переход в cancelled до коммита обновления
  const wasScheduled = (await db
    .select({ status: meetings.status })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1))[0]?.status === "scheduled";

  await db.update(meetings).set(update).where(eq(meetings.id, id));

  if (wasScheduled && update.status === "cancelled") {
    try {
      await announceMeeting(id, "cancelled");
    } catch (err) {
      console.error("[PATCH meeting] announceMeeting cancelled failed:", err);
    }
  }

  const [saved] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  return Response.json(saved, { status: 200 });
}
```

- [ ] **Step 4: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm
git add "src/app/api/meetings/[id]/route.ts"
git commit -m "feat(api): GET /api/meetings/[id] + announce on cancel (#N)"
```

---

### Task 6: `POST /api/meetings` — organizer→attendee для ad_hoc + announce on create; `GET` — добавить attendeesCount

**Files:**
- Modify: `src/app/api/meetings/route.ts`

- [ ] **Step 1: Обновить импорты**

Заменить импорт-блок на:

```ts
// src/app/api/meetings/route.ts
import { randomUUID } from "crypto";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { announceMeeting } from "@/lib/meetingAnnouncements";
```

- [ ] **Step 2: В `GET` добавить `attendeesCount`**

Найти блок `select({...})` внутри `export async function GET()` и заменить на:

```ts
  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      organizerId: meetings.organizerId,
      location: meetings.location,
      price: meetings.price,
      status: meetings.status,
      kind: meetings.kind,
      createdAt: meetings.createdAt,
      organizerDisplayName: members.displayName,
      attendeesCount: sql<number>`(
        SELECT COUNT(*) FROM ${meetingAttendees}
        WHERE ${meetingAttendees.meetingId} = ${meetings.id}
      )`.as("attendeesCount"),
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.groupId, user.groupId))
    .orderBy(desc(meetings.date));
```

- [ ] **Step 3: В `POST` добавить RSVP организатора + announce**

В конце функции `POST`, после вставки встречи (`await db.insert(meetings).values({...});`) и перед `return Response.json(...)`, вставить блок:

```ts
  // Для ad_hoc — организатор автоматически записан
  if (kind === "ad_hoc" && organizerId) {
    try {
      await db.insert(meetingAttendees).values({
        id: randomUUID(),
        meetingId: id,
        memberId: organizerId,
        createdAt: now,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/UNIQUE/i.test(message)) throw err;
    }
  }

  // Анонс в групповой чат
  try {
    await announceMeeting(id, "created");
  } catch (err) {
    console.error("[POST meetings] announceMeeting failed:", err);
  }
```

- [ ] **Step 4: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm
git add src/app/api/meetings/route.ts
git commit -m "feat(api): POST meetings — organizer→attendee + анонс; GET — attendeesCount (#N)"
```

---

### Task 7: `src/bot/scheduler.ts` — использовать `announceMeeting`

**Files:**
- Modify: `src/bot/scheduler.ts`

- [ ] **Step 1: Заменить inline-формирование на `announceMeeting`**

В `src/bot/scheduler.ts` найти блок:

```ts
      const result = await ensureNextMeeting(g.id);
      if (result.created) {
        const pool = await getActiveMembers(g.id);
        const organizer = pool.find((m) => m.id === result.organizerId);
        const organizerPart = organizer
          ? organizer.telegramUsername
            ? `@${organizer.telegramUsername}`
            : organizer.displayName
          : "ещё не назначен";
        const [y, m, d] = result.date.split("-");
        const lines = [
          `Следующий мастермайнд: ${d}.${m}.${y} (четверг), ${result.timeStart}–${result.timeEnd}`,
          `Ведёт: ${organizerPart}`,
          `Адрес: ${result.location ?? "не указан"}`,
        ];
        if (result.price !== null && result.price > 0 && pool.length > 0) {
          const perPerson = Math.round(result.price / pool.length);
          lines.push(`Цена: ${result.price} ₽ (${perPerson} ₽/чел)`);
        }
        lines.push(`Детали и правки: https://lumm.space/calendar`);
        await sendToGroup(lines.join("\n"));
      }
```

и заменить на:

```ts
      const result = await ensureNextMeeting(g.id);
      if (result.created) {
        try {
          await announceMeeting(result.meetingId, "created");
        } catch (err) {
          console.error(`[scheduler] announceMeeting for ${result.meetingId} failed:`, err);
        }
      }
```

- [ ] **Step 2: Обновить импорты**

В шапке файла заменить импорт `ensureNextMeeting, findMeetingInNDays` и добавить `announceMeeting`:

```ts
import { ensureNextMeeting, findMeetingInNDays } from "@/lib/meetings";
import { announceMeeting } from "@/lib/meetingAnnouncements";
```

- [ ] **Step 3: Убрать неиспользуемые импорты (если есть)**

Проверить что `sendGroupMessage` и `getActiveMembers` всё ещё используются (мониторинг weekly/monthly reminder их зовёт). Не удалять. `pool.length` / `organizerPart` больше не нужны в этом месте — но они были inline, так что ничего удалять не надо в других местах.

- [ ] **Step 4: Проверить типы + тесты**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

Run: `cd /root/lumm && npx vitest run`
Expected: все существующие тесты зелёные (кроме pre-existing parser.test.ts 5 fails).

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm
git add src/bot/scheduler.ts
git commit -m "refactor(scheduler): использовать announceMeeting вместо inline-формирования (#N)"
```

---

### Task 8: `/calendar` — термины + счётчик «Идут» + клик на карточку

**Files:**
- Modify: `src/app/(main)/calendar/page.tsx` (добавить `attendeesCount` в select, прокинуть в CalendarClient)
- Modify: `src/app/(main)/calendar/CalendarClient.tsx` (термины, счётчик, клик по карточке)

- [ ] **Step 1: Обновить `page.tsx` — добавить `attendeesCount` в select**

Найти в `src/app/(main)/calendar/page.tsx` блок `.select({ ... })` и заменить на:

```ts
  const all = await db
    .select({
      id: meetings.id,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      organizerId: meetings.organizerId,
      location: meetings.location,
      price: meetings.price,
      status: meetings.status,
      kind: meetings.kind,
      organizerDisplayName: members.displayName,
      attendeesCount: sql<number>`(
        SELECT COUNT(*) FROM ${meetingAttendees}
        WHERE ${meetingAttendees.meetingId} = ${meetings.id}
      )`.as("attendeesCount"),
    })
```

Добавить в импорт файла (если не добавлено):
```ts
import { and, desc, eq, sql } from "drizzle-orm";
import { meetings, members, meetingAttendees } from "@/db/schema";
```

- [ ] **Step 2: Обновить тип `Meeting` в `CalendarClient.tsx`**

Найти в `src/app/(main)/calendar/CalendarClient.tsx` тип:

```ts
type Meeting = {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  organizerId: string | null;
  location: string | null;
  price: number | null;
  status: "scheduled" | "completed" | "cancelled";
  kind: "standard" | "ad_hoc";
  organizerDisplayName: string | null;
};
```

Заменить на:

```ts
type Meeting = {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  organizerId: string | null;
  location: string | null;
  price: number | null;
  status: "scheduled" | "completed" | "cancelled";
  kind: "standard" | "ad_hoc";
  organizerDisplayName: string | null;
  attendeesCount: number;
};
```

- [ ] **Step 3: Лейблы «Мастермайнд» / «Доп. встреча»**

В `CalendarClient.tsx` найти все вхождения строк:
- `"Стандартная"` → `"Мастермайнд"`
- `"Ad-hoc"` → `"Доп. встреча"`
- `"ст."` → `"мм."` (в блоке past-листа)
- `"ad-hoc"` → `"доп."` (там же)
- В радио-кнопках формы: `"Стандартная (в ротации)"` → `"Мастермайнд (в ротации)"`, `"Ad-hoc (вне ротации)"` → `"Доп. встреча (вне ротации)"`

Используй `Edit replace_all` для каждой пары если строки уникальны, или `Edit` с контекстом.

- [ ] **Step 4: Клик по карточке → детальная**

Внутри map для `upcoming` — найти `<div key={m.id} className="bg-lumm-black...">` и обернуть в `<Link>`. Но проще: добавить `onClick={() => router.push(\`/calendar/${m.id}\`)}` и `className="... cursor-pointer"`, + на внутренних кнопках (Редактировать/Отменить) добавить `onClick={(e) => { e.stopPropagation(); openEdit(m); }}`.

Шаблон для блока upcoming:

```tsx
          {upcoming.map((m) => {
            const days = daysUntil(m.date);
            return (
              <div
                key={m.id}
                onClick={() => router.push(`/calendar/${m.id}`)}
                className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 cursor-pointer hover:border-lumm-gold/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">
                      {m.kind === "standard" ? "Мастермайнд" : "Доп. встреча"}
                    </p>
                    <p className="text-lg text-lumm-text-primary">
                      {formatDate(m.date)} · {m.timeStart}–{m.timeEnd}
                    </p>
                    <p className="text-sm text-lumm-text-secondary mt-1">{formatCountdown(days)}</p>
                    <p className="text-sm text-lumm-text-secondary mt-2">
                      Организатор: {m.organizerDisplayName ?? "не назначен"}
                    </p>
                    <p className="text-sm text-lumm-text-secondary">
                      Адрес: {m.location ?? "не указан"}
                    </p>
                    {m.price != null && m.price > 0 && (
                      <p className="text-sm text-lumm-text-secondary">
                        Цена: {formatRub(m.price)}
                        {activeMembersCount > 0 && (
                          <span className="text-lumm-gold">
                            {" "}
                            ({formatRub(m.price / activeMembersCount)} / чел)
                          </span>
                        )}
                      </p>
                    )}
                    {m.kind === "ad_hoc" && (
                      <p className="text-sm text-lumm-gold mt-1">
                        Идут: {m.attendeesCount}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(m);
                      }}
                      className="px-3 py-1 text-sm text-lumm-text-secondary border border-lumm-gray-light rounded hover:text-lumm-text-primary"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelMeeting(m);
                      }}
                      className="px-3 py-1 text-sm text-red-400 border border-red-500/30 rounded hover:bg-red-500/10"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
```

- [ ] **Step 5: Past-блок тоже сделать кликабельным**

Найти блок map для `past`:

```tsx
            {past.map((m) => (
              <div
                key={m.id}
                className={`bg-lumm-black border border-lumm-gray-light/50 rounded-lg p-4 ${
                  m.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
```

Заменить на:

```tsx
            {past.map((m) => (
              <div
                key={m.id}
                onClick={() => router.push(`/calendar/${m.id}`)}
                className={`bg-lumm-black border border-lumm-gray-light/50 rounded-lg p-4 cursor-pointer hover:border-lumm-gray-light ${
                  m.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
```

И внутри past-карточки у кнопки «Редактировать» добавить `e.stopPropagation()`:

```tsx
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(m);
                    }}
                    className="text-xs text-lumm-text-secondary hover:text-lumm-text-primary"
                  >
                    Редактировать
                  </button>
```

- [ ] **Step 6: Проверить типы + lint**

Run: `cd /root/lumm && npx tsc --noEmit && npm run lint 2>&1 | tail -5`
Expected: tsc чисто; lint — только pre-existing.

- [ ] **Step 7: Коммит**

```bash
cd /root/lumm
git add "src/app/(main)/calendar/page.tsx" "src/app/(main)/calendar/CalendarClient.tsx"
git commit -m "feat(calendar): Мастермайнд/Доп. встреча + счётчик Идут + клик на карточку (#N)"
```

---

### Task 9: Детальная `/calendar/[id]`

**Files:**
- Create: `src/app/(main)/calendar/[id]/page.tsx`
- Create: `src/app/(main)/calendar/[id]/MeetingDetailClient.tsx`

- [ ] **Step 1: Создать server component**

```tsx
// src/app/(main)/calendar/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { meetings, members, meetingAttendees } from "@/db/schema";
import { MeetingDetailClient } from "./MeetingDetailClient";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      organizerId: meetings.organizerId,
      location: meetings.location,
      price: meetings.price,
      status: meetings.status,
      kind: meetings.kind,
      organizerDisplayName: members.displayName,
      organizerAvatarColor: members.avatarColor,
      organizerAvatarUrl: members.avatarUrl,
      organizerTelegramUsername: members.telegramUsername,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .where(eq(meetings.id, id))
    .limit(1);

  if (rows.length === 0 || rows[0].groupId !== user.groupId) notFound();
  const m = rows[0];

  // attendees (для ad_hoc) — те, кто нажал «Записаться»
  const attendees = await db
    .select({
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      telegramUsername: members.telegramUsername,
    })
    .from(meetingAttendees)
    .innerJoin(members, eq(members.id, meetingAttendees.memberId))
    .where(eq(meetingAttendees.meetingId, id))
    .orderBy(meetingAttendees.createdAt);

  // active members группы — для standard (все приглашены) и для расчёта per-person
  const activeMembers = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      telegramUsername: members.telegramUsername,
    })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(members.createdAt);

  return (
    <MeetingDetailClient
      meeting={{
        id: m.id,
        date: m.date,
        timeStart: m.timeStart,
        timeEnd: m.timeEnd,
        organizerId: m.organizerId,
        location: m.location,
        price: m.price,
        status: m.status,
        kind: m.kind,
      }}
      organizer={
        m.organizerId
          ? {
              id: m.organizerId,
              displayName: m.organizerDisplayName,
              avatarColor: m.organizerAvatarColor,
              avatarUrl: m.organizerAvatarUrl,
              telegramUsername: m.organizerTelegramUsername,
            }
          : null
      }
      attendees={attendees}
      activeMembers={activeMembers}
      currentUserId={user.id}
    />
  );
}
```

- [ ] **Step 2: Создать client component**

```tsx
// src/app/(main)/calendar/[id]/MeetingDetailClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type Meeting = {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  organizerId: string | null;
  location: string | null;
  price: number | null;
  status: "scheduled" | "completed" | "cancelled";
  kind: "standard" | "ad_hoc";
};

type Organizer = {
  id: string;
  displayName: string | null;
  avatarColor: string | null;
  avatarUrl: string | null;
  telegramUsername: string | null;
};

type Attendee = {
  memberId: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
};

type ActiveMember = {
  id: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
};

type Props = {
  meeting: Meeting;
  organizer: Organizer | null;
  attendees: Attendee[];
  activeMembers: ActiveMember[];
  currentUserId: string;
};

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function pluralDays(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "день";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "дня";
  return "дней";
}

function formatCountdown(days: number): string {
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  if (days > 1) return `Через ${days} ${pluralDays(days)}`;
  return `Было ${-days} ${pluralDays(-days)} назад`;
}

function statusLabel(status: Meeting["status"]): string {
  if (status === "scheduled") return "Запланирована";
  if (status === "completed") return "Проведена";
  return "Отменена";
}

export function MeetingDetailClient({
  meeting,
  organizer,
  attendees: initialAttendees,
  activeMembers,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [attendees, setAttendees] = useState(initialAttendees);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amAttending = attendees.some((a) => a.memberId === currentUserId);
  const canRsvp = meeting.kind === "ad_hoc" && meeting.status === "scheduled";
  const days = daysUntil(meeting.date);

  async function toggleRsvp() {
    setBusy(true);
    setError(null);
    try {
      const method = amAttending ? "DELETE" : "POST";
      const res = await fetch(`/api/meetings/${meeting.id}/attend`, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        setError(data.error ?? "Ошибка сервера");
        return;
      }
      router.refresh();
      // Оптимистичное обновление локального стейта — полная правда придёт после refresh.
      if (amAttending) {
        setAttendees((prev) => prev.filter((a) => a.memberId !== currentUserId));
      } else {
        const me = activeMembers.find((x) => x.id === currentUserId);
        if (me) {
          setAttendees((prev) => [
            ...prev,
            {
              memberId: me.id,
              displayName: me.displayName,
              avatarColor: me.avatarColor,
              avatarUrl: me.avatarUrl,
              telegramUsername: me.telegramUsername,
            },
          ]);
        }
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
      >
        ← К календарю
      </Link>

      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded-full text-xs border bg-lumm-gold/10 text-lumm-gold border-lumm-gold/30">
          {meeting.kind === "standard" ? "Мастермайнд" : "Доп. встреча"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs border ${
            meeting.status === "scheduled"
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : meeting.status === "cancelled"
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-lumm-gray-light/10 text-lumm-text-secondary border-lumm-gray-light"
          }`}
        >
          {statusLabel(meeting.status)}
        </span>
      </div>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Когда</h2>
        <p className="text-lumm-text-primary">
          {formatDate(meeting.date)} · {meeting.timeStart}–{meeting.timeEnd}
        </p>
        <p className="text-sm text-lumm-text-secondary">{formatCountdown(days)}</p>
      </section>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Где</h2>
        <p className="text-lumm-text-primary">{meeting.location ?? "не указан"}</p>
      </section>

      {meeting.price !== null && meeting.price > 0 && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Сколько</h2>
          <p className="text-lumm-text-primary">
            {formatRub(meeting.price)}
            {activeMembers.length > 0 && (
              <span className="text-lumm-gold">
                {" "}
                ({formatRub(meeting.price / activeMembers.length)} / чел, делится на {activeMembers.length})
              </span>
            )}
          </p>
        </section>
      )}

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Организатор</h2>
        {organizer ? (
          <div className="flex items-center gap-3">
            <Avatar
              displayName={organizer.displayName ?? "?"}
              avatarColor={organizer.avatarColor ?? "#c9a84c"}
              avatarUrl={organizer.avatarUrl}
              size="md"
            />
            <div>
              <p className="text-lumm-text-primary">{organizer.displayName}</p>
              {organizer.telegramUsername && (
                <p className="text-sm text-lumm-text-secondary">@{organizer.telegramUsername}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-lumm-text-secondary">Ещё не назначен</p>
        )}
      </section>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-lumm-text-primary">
            {meeting.kind === "ad_hoc"
              ? `Идут: ${attendees.length}${activeMembers.length > 0 ? ` / ${activeMembers.length}` : ""}`
              : "Участники"}
          </h2>
          {canRsvp && (
            <button
              onClick={toggleRsvp}
              disabled={busy}
              className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${
                amAttending
                  ? "border border-lumm-gray-light text-lumm-text-secondary hover:text-lumm-text-primary"
                  : "bg-lumm-gold text-lumm-dark hover:bg-lumm-gold-light"
              }`}
            >
              {busy ? "..." : amAttending ? "Отменить запись" : "Записаться"}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {meeting.kind === "ad_hoc" ? (
          attendees.length === 0 ? (
            <p className="text-sm text-lumm-text-secondary">Пока никто не записался.</p>
          ) : (
            <ul className="space-y-2">
              {attendees.map((a) => (
                <li key={a.memberId} className="flex items-center gap-3">
                  <Avatar
                    displayName={a.displayName}
                    avatarColor={a.avatarColor}
                    avatarUrl={a.avatarUrl}
                    size="sm"
                  />
                  <span className="text-sm text-lumm-text-primary">{a.displayName}</span>
                  {a.telegramUsername && (
                    <span className="text-xs text-lumm-text-secondary">@{a.telegramUsername}</span>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="space-y-2">
            {activeMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar
                  displayName={m.displayName}
                  avatarColor={m.avatarColor}
                  avatarUrl={m.avatarUrl}
                  size="sm"
                />
                <span className="text-sm text-lumm-text-primary">{m.displayName}</span>
                {m.id === meeting.organizerId && (
                  <span className="text-xs text-lumm-gold border border-lumm-gold/30 rounded px-1.5 py-0.5">
                    ведёт
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Проверить типы + lint**

Run: `cd /root/lumm && npx tsc --noEmit && npm run lint 2>&1 | tail -5`
Expected: tsc чисто; lint — только pre-existing.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm
git add "src/app/(main)/calendar/[id]/page.tsx" "src/app/(main)/calendar/[id]/MeetingDetailClient.tsx"
git commit -m "feat(calendar): детальная /calendar/[id] — блоки + RSVP кнопка для ad-hoc (#N)"
```

---

### Task 10: `/help` — термины + абзац про RSVP

**Files:**
- Modify: `src/app/(main)/help/page.tsx`

- [ ] **Step 1: Переименовать в секции 6**

Найти в `src/app/(main)/help/page.tsx` блок «6. Календарь встреч». Заменить текст:

- `<strong>Стандартная</strong>` → `<strong>Мастермайнд</strong>`
- `<strong>Ad-hoc</strong>` → `<strong>Доп. встреча</strong>`

(Контекст: две `<li>` в блоке «Два типа встреч».)

- [ ] **Step 2: Добавить абзац про RSVP**

В ту же секцию, перед блоком `<strong>Бот напоминает</strong>`, добавить:

```tsx
        <p className="text-sm text-lumm-text-secondary">
          <strong>Запись на доп. встречу:</strong> на странице встречи (карточка в{" "}
          <a href="/calendar" className="text-lumm-gold hover:underline">/calendar</a> — кликабельная) есть кнопка
          «Записаться». Нажал — попал в список идущих. Организатор записан автоматически. На мастермайнде записи
          нет: все активные участники по умолчанию приглашены.
        </p>
```

- [ ] **Step 3: Проверить типы**

Run: `cd /root/lumm && npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm
git add "src/app/(main)/help/page.tsx"
git commit -m "docs(help): термины Мастермайнд/Доп. встреча + абзац про RSVP (#N)"
```

---

### Task 11: Финальная прогонка + PR + деплой

- [ ] **Step 1: Финальные тесты**

Run: `cd /root/lumm && npx vitest run 2>&1 | tail -10`
Expected: Эпик-тесты зелёные (Task 2 = 10 новых); 5 pre-existing parser fails — ожидаемы.

- [ ] **Step 2: Сборка**

Run: `cd /root/lumm && npm run build 2>&1 | tail -5`
Expected: build прошёл.

- [ ] **Step 3: Push + PR**

```bash
cd /root/lumm
git push -u origin rsvp-and-announces
gh pr create --title "RSVP + унифицированные bot-анонсы + термины UI (#N)" --body "$(cat <<'EOF'
## Summary
- Таблица `meeting_attendees` (UNIQUE по meeting+member). Миграция `scripts/migrations/2026-04-23-meeting-attendees.sql`.
- Новые API: `POST/DELETE /api/meetings/[id]/attend` (RSVP), `GET /api/meetings/[id]` (детальная).
- `POST /api/meetings`: organizer → attendee для ad_hoc + анонс в чат.
- `PATCH /api/meetings/[id]`: анонс «отменена» при переходе в cancelled.
- `GET /api/meetings`: добавлен `attendeesCount`.
- `src/lib/meetingAnnouncements.ts` — чистая `composeAnnouncement` + IO-адаптер `announceMeeting`. 10 юнит-тестов.
- `src/bot/scheduler.ts` — использует `announceMeeting` (DRY).
- `/calendar` — термины «Мастермайнд»/«Доп. встреча», счётчик «Идут» для ad-hoc, карточки кликабельные.
- `/calendar/[id]` — новая детальная страница: блоки Когда/Где/Сколько/Организатор/Участники. Кнопка «Записаться»/«Отменить запись» только для ad-hoc-scheduled.
- `/help` — термины обновлены, новый абзац про RSVP.

Closes #N

## Test plan
- [x] `npm test` — новые 10 тестов зелёные, существующие не сломаны
- [x] `npx tsc --noEmit` — без ошибок
- [x] `npm run build` — зелёный
- [ ] Prod: применить миграцию, пересобрать, рестарт обоих сервисов:
  \`\`\`bash
  sqlite3 data/lumm.db < scripts/migrations/2026-04-23-meeting-attendees.sql
  npm run build
  sudo systemctl restart lumm.service lumm-bot.service
  \`\`\`
- [ ] Ручная проверка:
  - [ ] Создать доп. встречу → в чат пришёл анонс с @всеми + ссылкой на детальную
  - [ ] Зайти на /calendar/<id> ad-hoc → виден организатор в списке, кнопка «Отменить запись»
  - [ ] Нажать «Отменить запись» → исчез из списка, кнопка «Записаться»
  - [ ] Другой юзер заходит → видит «Записаться»; нажимает → попадает в список; счётчик на /calendar увеличивается
  - [ ] Отменить встречу → в чат «Встреча DD.MM отменена. Организатор: @user.»
  - [ ] /calendar/<id> мастермайнда → список всех активных с бейджем «ведёт» у организатора, без кнопок RSVP
  - [ ] /help — термины и новый абзац про RSVP видны
EOF
)"
```

- [ ] **Step 4: После мержа PR — деплой на prod**

```bash
cd /root/lumm
git checkout master && git pull
cp data/lumm.db "data/lumm.db.bak.$(date +%Y%m%d-%H%M%S)"
sqlite3 data/lumm.db < scripts/migrations/2026-04-23-meeting-attendees.sql
sqlite3 data/lumm.db ".schema meeting_attendees"  # verify
npm run build
sudo systemctl restart lumm.service lumm-bot.service
sudo systemctl is-active lumm.service lumm-bot.service
```

- [ ] **Step 5: Smoke-тест prod**

- Проверить `journalctl -u lumm-bot.service -n 30 --no-pager | grep scheduler` — `[scheduler] started` + `initial tick`.
- Зайти на https://lumm.space/calendar — термины «Мастермайнд»/«Доп. встреча». Клик по встрече 21.05 → `/calendar/<id>` открыта.
- Если хотим проверить RSVP прямо сейчас — создать ad-hoc встречу через UI → в чат прилетает анонс; на детальной у организатора уже «Отменить запись», у других юзеров — «Записаться».

- [ ] **Step 6: Закрыть issue + обновить память**

```bash
gh issue close N --comment "Готово и в проде. Merge: <sha>. RSVP на доп. встречах работает, анонсы унифицированы, термины обновлены."
```

Обновить `/root/.claude/projects/-root/memory/project_lumm.md`: отметить, что RSVP готов, термины в UI изменены, bot-анонс централизован через `src/lib/meetingAnnouncements.ts`.

---

## Финальный чек-лист

- [ ] Все 10 задач выполнены, коммиты с `#N`
- [ ] `npx vitest run` — все новые тесты (10) зелёные
- [ ] `npx tsc --noEmit` — без ошибок
- [ ] `npm run build` — зелёный
- [ ] Миграция применена на prod, бекап создан
- [ ] Оба сервиса (`lumm.service`, `lumm-bot.service`) перезапущены, `active`
- [ ] PR смержен, issue закрыт
- [ ] `project_lumm.md` обновлён

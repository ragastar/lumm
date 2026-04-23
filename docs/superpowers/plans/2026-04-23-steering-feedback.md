# «Штурвал» — фидбек-канал через бот: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить триггер `штурвал` в бот, хранить фидбек в `feedback_items`, дать три UI: лента группы `/feedback`, блок в `/profile`, пункт в сайдбаре.

**Architecture:** Чистая функция `matchSteeringTrigger` (TDD), IO `handleSteering`, dispatch в bot/index.ts. API-роуты — тонкие адаптеры. Admin смены статуса/удаления по `user.role === 'admin'`. Сайдбар + /help обновить.

**Tech Stack:** Next.js 16, TypeScript, SQLite+Drizzle, grammy (bot), vitest.

**Spec:** [docs/superpowers/specs/2026-04-23-steering-feedback-design.md](../specs/2026-04-23-steering-feedback-design.md)

---

## Pre-setup

- [ ] **Создать GitHub issue** на `ragastar/lumm`, записать номер `#N`:

```bash
gh issue create --repo ragastar/lumm \
  --title "Штурвал — фидбек-канал через бот" \
  --body "Триггер @lummbrain_bot штурвал → feedback_items. /feedback лента, блок в /profile, сайдбар.

Спека: docs/superpowers/specs/2026-04-23-steering-feedback-design.md
План:  docs/superpowers/plans/2026-04-23-steering-feedback.md"
```

- [ ] **Создать ветку:**

```bash
cd /root/lumm && git checkout -b steering-feedback
```

---

## Файловая структура

**Создать:**
- `scripts/migrations/2026-04-23-feedback-items.sql`
- `src/bot/steeringTrigger.ts` + `src/bot/__tests__/steeringTrigger.test.ts`
- `src/bot/handleSteering.ts`
- `src/app/api/feedback/route.ts`
- `src/app/api/feedback/mine/route.ts`
- `src/app/api/feedback/[id]/route.ts`
- `src/app/(main)/feedback/page.tsx` + `FeedbackClient.tsx`

**Модифицировать:**
- `src/db/schema.ts` + `src/db/seed.ts`
- `src/bot/index.ts` (добавить dispatch steering)
- `src/bot/handleReport.ts` (вернуть boolean matched/not)
- `src/components/Sidebar.tsx` (пункт «Штурвал»)
- `src/app/(main)/profile/page.tsx` + `ProfileClient.tsx` (блок «Мой штурвал»)
- `src/app/(main)/help/page.tsx` (секция 7)

---

### Task 1: Миграция + schema + seed

**Files:**
- Create: `scripts/migrations/2026-04-23-feedback-items.sql`
- Modify: `src/db/schema.ts`, `src/db/seed.ts`

- [ ] **Step 1: Миграция**

```sql
-- scripts/migrations/2026-04-23-feedback-items.sql
-- Штурвал — таблица feedback_items

CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Применить на dev**

```bash
sqlite3 /root/lumm/data/lumm.db < /root/lumm/scripts/migrations/2026-04-23-feedback-items.sql
sqlite3 /root/lumm/data/lumm.db ".schema feedback_items"
```

Expected: `CREATE TABLE feedback_items (...)`.

- [ ] **Step 3: Обновить `src/db/schema.ts`**

В конец файла добавить:

```ts
export const feedbackItems = sqliteTable("feedback_items", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id),
  text: text("text").notNull(),
  status: text("status", { enum: ["new", "in_progress", "done", "rejected"] })
    .notNull()
    .default("new"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 4: Обновить `src/db/seed.ts`**

В блок `sqlite.exec(...)` после всех других `CREATE TABLE IF NOT EXISTS ...` добавить:

```sql
  CREATE TABLE IF NOT EXISTS feedback_items (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id),
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
```

- [ ] **Step 5: tsc + commit**

```bash
cd /root/lumm && npx tsc --noEmit
git add scripts/migrations/2026-04-23-feedback-items.sql src/db/schema.ts src/db/seed.ts
git commit -m "feat(db): таблица feedback_items — Штурвал (#N)"
```

---

### Task 2: `src/bot/steeringTrigger.ts` + тесты (TDD)

**Files:**
- Create: `src/bot/steeringTrigger.ts`
- Test: `src/bot/__tests__/steeringTrigger.test.ts`

- [ ] **Step 1: Написать тесты**

```ts
// src/bot/__tests__/steeringTrigger.test.ts
import { describe, it, expect } from "vitest";
import { matchSteeringTrigger } from "../steeringTrigger";

const BOT = "lummbrain_bot";

describe("matchSteeringTrigger", () => {
  it("упоминание + штурвал + тело → возвращает тело", () => {
    expect(matchSteeringTrigger("@lummbrain_bot штурвал есть баг", BOT)).toBe("есть баг");
  });

  it("регистронезависимо", () => {
    expect(matchSteeringTrigger("@lummbrain_bot ШТУРВАЛ важная идея", BOT)).toBe("важная идея");
    expect(matchSteeringTrigger("@lummbrain_bot Штурвал идея", BOT)).toBe("идея");
  });

  it("другой бот — null", () => {
    expect(matchSteeringTrigger("@other_bot штурвал тест", BOT)).toBe(null);
  });

  it("без слова штурвал — null", () => {
    expect(matchSteeringTrigger("@lummbrain_bot отчёт", BOT)).toBe(null);
  });

  it("без упоминания — null", () => {
    expect(matchSteeringTrigger("штурвал без упоминания", BOT)).toBe(null);
  });

  it("пустое тело — null", () => {
    expect(matchSteeringTrigger("@lummbrain_bot штурвал", BOT)).toBe(null);
    expect(matchSteeringTrigger("@lummbrain_bot штурвал   ", BOT)).toBe(null);
  });

  it("тело с переносами строк сохраняется", () => {
    const msg = "@lummbrain_bot штурвал первая строка\nвторая строка";
    expect(matchSteeringTrigger(msg, BOT)).toBe("первая строка\nвторая строка");
  });

  it("порядок: упоминание → штурвал → тело; иначе null", () => {
    // слово штурвал перед упоминанием — не совпадает
    expect(matchSteeringTrigger("штурвал @lummbrain_bot тест", BOT)).toBe(null);
  });

  it("пробелы вокруг тела — триммятся", () => {
    expect(matchSteeringTrigger("@lummbrain_bot штурвал    тест   ", BOT)).toBe("тест");
  });
});
```

- [ ] **Step 2: Прогнать — должен упасть**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/steeringTrigger.test.ts`
Expected: FAIL — модуль `../steeringTrigger` не найден.

- [ ] **Step 3: Реализация**

```ts
// src/bot/steeringTrigger.ts

/**
 * Проверяет, является ли сообщение триггером «штурвал».
 * Ожидаемый формат: <mention бота> штурвал <тело>
 * Регистр слова «штурвал» не важен.
 * @returns тело штурвала (триммированное) или null если не триггер / тело пустое.
 */
export function matchSteeringTrigger(text: string, botUsername: string): string | null {
  const mention = `@${botUsername}`;
  const mentionIdx = text.toLowerCase().indexOf(mention.toLowerCase());
  if (mentionIdx === -1) return null;

  // Всё что после mention
  const afterMention = text.slice(mentionIdx + mention.length);
  // Ищем слово «штурвал» (case-insensitive) после mention.
  const match = /\bштурвал\b/i.exec(afterMention);
  if (!match) return null;

  const body = afterMention.slice(match.index + match[0].length).trim();
  if (body.length === 0) return null;
  return body;
}
```

- [ ] **Step 4: Прогнать — должен пройти**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/steeringTrigger.test.ts`
Expected: PASS (9 тестов).

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm
git add src/bot/steeringTrigger.ts src/bot/__tests__/steeringTrigger.test.ts
git commit -m "feat(bot): matchSteeringTrigger + тесты (#N)"
```

---

### Task 3: `handleSteering` + dispatch в `bot/index.ts` (рефакторинг `handleReport`)

**Files:**
- Create: `src/bot/handleSteering.ts`
- Modify: `src/bot/handleReport.ts` (возвращать boolean matched/not)
- Modify: `src/bot/index.ts` (dispatch)

- [ ] **Step 1: Прочитать текущие handleReport.ts и bot/index.ts**

Run: `cd /root/lumm && cat src/bot/handleReport.ts src/bot/index.ts`

Понять как сейчас работает `handleReport` — он возвращает void, внутри сам проверяет `matchTrigger`.

- [ ] **Step 2: Рефакторинг `handleReport.ts` — возвращать boolean**

Найти в `src/bot/handleReport.ts`:

```ts
export async function handleReport(input: ReportInput): Promise<void> {
  const body = matchTrigger(input.text);
  if (!body) return;
  // ... дальше логика
}
```

Заменить сигнатуру на:

```ts
export async function handleReport(input: ReportInput): Promise<boolean> {
  const body = matchTrigger(input.text);
  if (!body) return false;
  // ... дальше логика (как было)
  return true;  // в конце функции
}
```

Нужно найти все `return;` внутри (после фейлов валидации или отправки ответа) и заменить на `return true;` — потому что в этих случаях handleReport **совпал** (слово «отчёт» было) и что-то сделал. Логика «совпало или нет» — только по отсутствию body.

Проверь существующие тесты в `src/bot/__tests__/handleReport.test.ts` — если они мокают return value, обнови.

- [ ] **Step 3: Создать `handleSteering.ts`**

```ts
// src/bot/handleSteering.ts
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, feedbackItems } from "@/db/schema";
import { matchSteeringTrigger } from "./steeringTrigger";

export type SteeringInput = {
  text: string;
  fromId: string; // telegram user id
  reply: (msg: string) => Promise<void> | void;
  baseUrl: string;
  botUsername: string;
};

export async function handleSteering(input: SteeringInput): Promise<boolean> {
  const body = matchSteeringTrigger(input.text, input.botUsername);
  if (!body) return false;

  const rows = await db
    .select({ id: members.id, status: members.status })
    .from(members)
    .where(eq(members.telegramId, input.fromId))
    .limit(1);

  if (rows.length === 0) {
    await input.reply(
      "Не вижу тебя в системе. Админ должен привязать Telegram ID в /admin/members.",
    );
    return true;
  }

  if (rows[0].status !== "active") {
    await input.reply("Ты сейчас неактивен, штурвал не принят.");
    return true;
  }

  const now = new Date().toISOString();
  await db.insert(feedbackItems).values({
    id: randomUUID(),
    memberId: rows[0].id,
    text: body,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });

  await input.reply(`✅ Записал, спасибо. Можно посмотреть на ${input.baseUrl}/feedback`);
  return true;
}
```

- [ ] **Step 4: Обновить `bot/index.ts` — dispatch**

Найти `bot.on("message:text", ...)`:

```ts
bot.on("message:text", async (ctx) => {
  console.log("[bot] incoming text from", ...);
  if (!ctx.from?.id) return;
  try {
    await handleReport({
      text: ctx.message.text,
      fromId: String(ctx.from.id),
      reply: async (msg) => { await ctx.reply(msg, { reply_parameters: { message_id: ctx.message.message_id } }); },
      baseUrl,
    });
  } catch (err) {
    // ...
  }
});
```

Заменить на:

```ts
bot.on("message:text", async (ctx) => {
  console.log(
    "[bot] incoming text from",
    ctx.from?.id,
    "(@" + (ctx.from?.username ?? "no-username") + ")",
    "chat",
    ctx.chat?.id,
    "(" + ctx.chat?.type + ")",
    "text:",
    JSON.stringify(ctx.message.text.slice(0, 200)),
  );
  if (!ctx.from?.id) return;

  const reply = async (msg: string) => {
    await ctx.reply(msg, { reply_parameters: { message_id: ctx.message.message_id } });
  };

  try {
    // 1) попробовать триггер еженедельного отчёта
    const handled = await handleReport({
      text: ctx.message.text,
      fromId: String(ctx.from.id),
      reply,
      baseUrl,
    });
    if (handled) return;

    // 2) попробовать штурвал
    await handleSteering({
      text: ctx.message.text,
      fromId: String(ctx.from.id),
      reply,
      baseUrl,
      botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "lummbrain_bot",
    });
  } catch (err) {
    console.error("[bot] handler crashed:", err);
    try {
      await ctx.reply("Что-то пошло не так. Попробуй через минуту.");
    } catch {
      /* swallow */
    }
  }
});
```

Импорты в начале:
```ts
import { handleSteering } from "./handleSteering";
```

- [ ] **Step 5: tsc + vitest**

Run: `cd /root/lumm && npx tsc --noEmit && npx vitest run`
Expected: чисто; старые handleReport тесты зелёные (если были помечены на void — обновить). 5 pre-existing parser.test.ts — ожидаемы.

- [ ] **Step 6: Коммит**

```bash
cd /root/lumm
git add src/bot/handleReport.ts src/bot/handleSteering.ts src/bot/index.ts src/bot/__tests__/handleReport.test.ts
git commit -m "feat(bot): handleSteering + dispatch; handleReport возвращает boolean (#N)"
```

---

### Task 4: API — `GET /api/feedback` + `GET /api/feedback/mine`

**Files:**
- Create: `src/app/api/feedback/route.ts`
- Create: `src/app/api/feedback/mine/route.ts`

- [ ] **Step 1: `GET /api/feedback`**

Create `src/app/api/feedback/route.ts`:

```ts
// src/app/api/feedback/route.ts
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackItems, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: feedbackItems.id,
      text: feedbackItems.text,
      status: feedbackItems.status,
      createdAt: feedbackItems.createdAt,
      updatedAt: feedbackItems.updatedAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
    })
    .from(feedbackItems)
    .innerJoin(members, eq(members.id, feedbackItems.memberId))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(feedbackItems.createdAt));

  return Response.json(rows);
}
```

- [ ] **Step 2: `GET /api/feedback/mine`**

Create `src/app/api/feedback/mine/route.ts`:

```ts
// src/app/api/feedback/mine/route.ts
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: feedbackItems.id,
      text: feedbackItems.text,
      status: feedbackItems.status,
      createdAt: feedbackItems.createdAt,
      updatedAt: feedbackItems.updatedAt,
    })
    .from(feedbackItems)
    .where(eq(feedbackItems.memberId, user.id))
    .orderBy(desc(feedbackItems.createdAt));

  return Response.json(rows);
}
```

- [ ] **Step 3: tsc + commit**

```bash
cd /root/lumm && npx tsc --noEmit
git add src/app/api/feedback/route.ts src/app/api/feedback/mine/route.ts
git commit -m "feat(api): GET /api/feedback + GET /api/feedback/mine (#N)"
```

---

### Task 5: API — `PATCH /api/feedback/[id]` + `DELETE /api/feedback/[id]` (admin-only)

**Files:**
- Create: `src/app/api/feedback/[id]/route.ts`

- [ ] **Step 1: Создать route**

```ts
// src/app/api/feedback/[id]/route.ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackItems, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const ALLOWED_STATUS = new Set(["new", "in_progress", "done", "rejected"]);

async function loadAndCheck(itemId: string, groupId: string) {
  const rows = await db
    .select({
      id: feedbackItems.id,
      memberGroupId: members.groupId,
    })
    .from(feedbackItems)
    .innerJoin(members, eq(members.id, feedbackItems.memberId))
    .where(eq(feedbackItems.id, itemId))
    .limit(1);

  if (rows.length === 0 || rows[0].memberGroupId !== groupId) {
    return { error: { message: "Штурвал не найден", status: 404 } as const };
  }
  return { ok: true as const };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check && check.error) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  if (typeof body.status !== "string" || !ALLOWED_STATUS.has(body.status)) {
    return Response.json(
      { error: "status должен быть new, in_progress, done или rejected" },
      { status: 400 },
    );
  }

  await db
    .update(feedbackItems)
    .set({ status: body.status as "new" | "in_progress" | "done" | "rejected", updatedAt: new Date().toISOString() })
    .where(eq(feedbackItems.id, id));

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }
  const { id } = await params;

  const check = await loadAndCheck(id, user.groupId);
  if ("error" in check && check.error) {
    return Response.json({ error: check.error.message }, { status: check.error.status });
  }

  await db.delete(feedbackItems).where(eq(feedbackItems.id, id));
  return Response.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 2: tsc + commit**

```bash
cd /root/lumm && npx tsc --noEmit
git add "src/app/api/feedback/[id]/route.ts"
git commit -m "feat(api): PATCH/DELETE /api/feedback/[id] — admin (#N)"
```

---

### Task 6: Страница `/feedback` — server + client

**Files:**
- Create: `src/app/(main)/feedback/page.tsx`
- Create: `src/app/(main)/feedback/FeedbackClient.tsx`

- [ ] **Step 1: Server component**

```tsx
// src/app/(main)/feedback/page.tsx
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { feedbackItems, members } from "@/db/schema";
import { FeedbackClient } from "./FeedbackClient";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await db
    .select({
      id: feedbackItems.id,
      text: feedbackItems.text,
      status: feedbackItems.status,
      createdAt: feedbackItems.createdAt,
      updatedAt: feedbackItems.updatedAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
    })
    .from(feedbackItems)
    .innerJoin(members, eq(members.id, feedbackItems.memberId))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(feedbackItems.createdAt));

  return <FeedbackClient items={items} isAdmin={user.role === "admin"} />;
}
```

- [ ] **Step 2: Client component**

```tsx
// src/app/(main)/feedback/FeedbackClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type Status = "new" | "in_progress" | "done" | "rejected";

type Item = {
  id: string;
  text: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  memberId: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
};

type Props = {
  items: Item[];
  isAdmin: boolean;
};

const STATUS_LABEL: Record<Status, string> = {
  new: "Новый",
  in_progress: "В работе",
  done: "Готово",
  rejected: "Отклонено",
};

const STATUS_CLASS: Record<Status, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  done: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackClient({ items: initialItems, isAdmin }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);

  const counts = items.reduce(
    (acc, it) => {
      acc[it.status] += 1;
      return acc;
    },
    { new: 0, in_progress: 0, done: 0, rejected: 0 } as Record<Status, number>,
  );

  async function changeStatus(id: string, next: Status) {
    setBusy(id);
    const res = await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(null);
    if (res.ok) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: next } : it)));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Ошибка" }));
      alert(data.error ?? "Ошибка");
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Удалить штурвал?")) return;
    setBusy(id);
    const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Ошибка" }));
      alert(data.error ?? "Ошибка");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Штурвал</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          Идеи, правки, баги. Пиши боту в группе:{" "}
          <code className="text-lumm-gold">@lummbrain_bot штурвал &lt;текст&gt;</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.new}`}>
          Новых: {counts.new}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.in_progress}`}>
          В работе: {counts.in_progress}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.done}`}>
          Готово: {counts.done}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS.rejected}`}>
          Отклонено: {counts.rejected}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center text-lumm-text-secondary">
          Пока пусто. Напиши боту в группе:{" "}
          <code className="text-lumm-gold">@lummbrain_bot штурвал &lt;текст&gt;</code>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="bg-lumm-black border border-lumm-gray-light rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  displayName={it.displayName}
                  avatarColor={it.avatarColor}
                  avatarUrl={it.avatarUrl}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-lumm-text-primary">{it.displayName}</span>
                    <span className="text-xs text-lumm-text-secondary">{formatDate(it.createdAt)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CLASS[it.status]}`}>
                      {STATUS_LABEL[it.status]}
                    </span>
                  </div>
                  <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans mt-2">
                    {it.text}
                  </pre>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-2 border-t border-lumm-gray-light/50">
                  <select
                    value={it.status}
                    onChange={(e) => changeStatus(it.id, e.target.value as Status)}
                    disabled={busy === it.id}
                    className="bg-lumm-gray border border-lumm-gray-light rounded px-2 py-1 text-sm text-lumm-text-primary disabled:opacity-50"
                  >
                    <option value="new">Новый</option>
                    <option value="in_progress">В работе</option>
                    <option value="done">Готово</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                  <button
                    onClick={() => removeItem(it.id)}
                    disabled={busy === it.id}
                    className="text-xs text-red-400 border border-red-500/30 rounded px-2 py-1 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: tsc + lint + commit**

```bash
cd /root/lumm && npx tsc --noEmit && npm run lint 2>&1 | tail -5
git add "src/app/(main)/feedback/page.tsx" "src/app/(main)/feedback/FeedbackClient.tsx"
git commit -m "feat(feedback): страница /feedback с лентой + admin-кнопками (#N)"
```

---

### Task 7: Блок «Мой штурвал» в `/profile`

**Files:**
- Modify: `src/app/(main)/profile/page.tsx` (прокинуть mine в client)
- Modify: `src/app/(main)/profile/ProfileClient.tsx` (блок)

- [ ] **Step 1: Прочитать текущие файлы профиля**

Run: `cd /root/lumm && ls "src/app/(main)/profile/" && cat "src/app/(main)/profile/page.tsx"`

- [ ] **Step 2: Обновить `page.tsx`**

Добавить запрос своих feedback'ов и прокинуть в клиент. Шаблон (точные имена полей зависят от существующего кода):

```ts
import { feedbackItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// ... внутри server component, после getCurrentUser():

const mySteering = await db
  .select({
    id: feedbackItems.id,
    text: feedbackItems.text,
    status: feedbackItems.status,
    createdAt: feedbackItems.createdAt,
  })
  .from(feedbackItems)
  .where(eq(feedbackItems.memberId, user.id))
  .orderBy(desc(feedbackItems.createdAt));

// Передать в ProfileClient как prop mySteering={mySteering}
```

- [ ] **Step 3: Обновить `ProfileClient.tsx` — добавить блок**

Добавить тип:
```ts
type MyFeedback = {
  id: string;
  text: string;
  status: "new" | "in_progress" | "done" | "rejected";
  createdAt: string;
};
```

В Props добавить `mySteering: MyFeedback[]`.

Константы для лейблов/цветов (копия из FeedbackClient):
```ts
const STATUS_LABEL = { new: "Новый", in_progress: "В работе", done: "Готово", rejected: "Отклонено" };
const STATUS_CLASS = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  done: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};
```

Добавить секцию после блока с целями:

```tsx
<section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
  <h2 className="text-lg font-semibold text-lumm-text-primary">Мой штурвал</h2>
  <p className="text-xs text-lumm-text-secondary">
    Идеи / баги / правки через бот:{" "}
    <code className="text-lumm-gold">@lummbrain_bot штурвал &lt;текст&gt;</code>
  </p>
  {mySteering.length === 0 ? (
    <p className="text-sm text-lumm-text-secondary">Пока пусто.</p>
  ) : (
    <ul className="space-y-2">
      {mySteering.map((it) => (
        <li key={it.id} className="text-sm text-lumm-text-primary">
          <span
            className={`px-2 py-0.5 rounded-full text-xs border mr-2 ${STATUS_CLASS[it.status]}`}
          >
            {STATUS_LABEL[it.status]}
          </span>
          <span className="text-xs text-lumm-text-secondary mr-2">
            {new Date(it.createdAt).toLocaleDateString("ru-RU")}
          </span>
          <span className="whitespace-pre-wrap">{it.text}</span>
        </li>
      ))}
    </ul>
  )}
</section>
```

- [ ] **Step 4: tsc + commit**

```bash
cd /root/lumm && npx tsc --noEmit
git add "src/app/(main)/profile/page.tsx" "src/app/(main)/profile/ProfileClient.tsx"
git commit -m "feat(profile): блок «Мой штурвал» с моими feedback'ами (#N)"
```

---

### Task 8: Sidebar + /help

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/app/(main)/help/page.tsx`

- [ ] **Step 1: Sidebar — пункт «Штурвал»**

В `src/components/Sidebar.tsx` найти `activeNav` и добавить (между, например, «Календарь» и «Участники»):

```ts
  { href: "/feedback", label: "Штурвал", icon: "⚓" },
```

- [ ] **Step 2: /help секция 7**

В `src/app/(main)/help/page.tsx` после секции 6 («Календарь встреч») добавить:

```tsx
{/* Штурвал */}
<section className="bg-lumm-black border border-lumm-gray-light/50 rounded-xl p-6 space-y-3">
  <h2 className="text-xl font-semibold text-lumm-text-primary">7. Штурвал — обратная связь</h2>
  <p className="text-sm text-lumm-text-secondary">
    Идею / баг / правку пиши боту в группе:
  </p>
  <div className="bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-4">
    <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
{`@lummbrain_bot штурвал хорошо бы добавить график капитала на дашборд`}
    </pre>
  </div>
  <p className="text-sm text-lumm-text-secondary">
    Бот сохранит и ответит. Дальше статус «Новый → В работе → Готово / Отклонено» видно на вкладке{" "}
    <a href="/feedback" className="text-lumm-gold hover:underline">Штурвал</a>. Свои — в{" "}
    <a href="/profile" className="text-lumm-gold hover:underline">/profile</a> под целями.
  </p>
</section>
```

Также обновить подзаголовок h1 (секция с «Коротко про ...») — добавить «штурвал».

- [ ] **Step 3: tsc + commit**

```bash
cd /root/lumm && npx tsc --noEmit
git add src/components/Sidebar.tsx "src/app/(main)/help/page.tsx"
git commit -m "feat(ui): пункт «Штурвал» в сайдбаре + секция 7 в /help (#N)"
```

---

### Task 9: Финальная прогонка + PR + деплой

- [ ] **Step 1: Тесты**

Run: `cd /root/lumm && npx vitest run 2>&1 | tail -6`
Expected: новые 9 тестов steeringTrigger зелёные; существующие не сломаны; 5 pre-existing parser fails — ожидаемы.

- [ ] **Step 2: Сборка**

Run: `cd /root/lumm && npm run build 2>&1 | tail -3`
Expected: build OK.

- [ ] **Step 3: Push + PR**

```bash
cd /root/lumm
git push -u origin steering-feedback
gh pr create --title "Штурвал — фидбек-канал через бот (#N)" --body "$(cat <<'EOF'
## Summary
- Таблица \`feedback_items\` + миграция.
- Триггер бота \`@lummbrain_bot штурвал <текст>\` (через \`matchSteeringTrigger\` + \`handleSteering\`); \`handleReport\` отрефакторен чтобы возвращать boolean matched/not для правильного dispatch.
- API \`GET /api/feedback\` (группа), \`GET /api/feedback/mine\`, \`PATCH /api/feedback/[id]\` и \`DELETE\` (admin-only).
- Страница \`/feedback\` — лента, счётчики, admin-кнопки смены статуса и удаления.
- Блок «Мой штурвал» в \`/profile\` под целями.
- Сайдбар — пункт «Штурвал» с иконкой ⚓.
- \`/help\` — секция 7 с примером использования.

Closes #N

## Test plan
- [x] 9 новых тестов \`steeringTrigger\` зелёные
- [x] tsc чисто, build зелёный
- [ ] Prod: применить миграцию, пересобрать, рестарт обоих сервисов
- [ ] Ручная проверка: в группе написать \`@lummbrain_bot штурвал тест\` → ответ бота; увидеть запись на \`/feedback\` и в \`/profile\`; admin меняет статус; участник видит свой статус в \`/profile\`.
EOF
)"
```

- [ ] **Step 4: Merge + deploy на prod**

```bash
cd /root/lumm
gh pr merge <PR#> --merge --delete-branch
git checkout master && git pull
sqlite3 data/lumm.db < scripts/migrations/2026-04-23-feedback-items.sql
sqlite3 data/lumm.db ".schema feedback_items"
npm run build
sudo systemctl restart lumm.service lumm-bot.service
sudo systemctl is-active lumm.service lumm-bot.service
```

- [ ] **Step 5: Закрыть issue + обновить память**

```bash
gh issue close N --comment "Готово в проде. Merge: <sha>. Бот принимает '@lummbrain_bot штурвал ...', /feedback и блок в /profile работают."
```

Обновить `/root/.claude/projects/-root/memory/project_lumm.md`.

---

## Финальный чек-лист

- [ ] 9 задач сделаны, коммиты с `#N`
- [ ] `npx vitest run` — новые тесты зелёные
- [ ] `npx tsc --noEmit` — без ошибок
- [ ] `npm run build` — зелёный
- [ ] Миграция применена на prod
- [ ] Оба сервиса `active` после рестарта
- [ ] Ручная проверка: бот принимает штурвал, видно на /feedback и /profile
- [ ] PR смержен, issue закрыт
- [ ] `project_lumm.md` обновлён

# Эпик 3 — Ежемесячные и квартальные отчёты: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Довести существующий `/financials` до продового состояния: auth из сессии, UNIQUE+upsert, квартальная логика «Капитал», блок в `/help`.

**Architecture:** Минимальная правка на месте. Чистая доменная логика (`quarter`, `monthlyFinancials.validate`) выносится в `src/lib/` и тестируется vitest. API-роуты — тонкие адаптеры. UI — пере-рендерит форму на основе `month` и ответа `GET /me?month=...`. Миграция применяется вручную через `sqlite3` CLI на dev и prod.

**Tech Stack:** Next.js 16 (App Router), TypeScript, SQLite + better-sqlite3, Drizzle ORM, jose (JWT), vitest, TailwindCSS.

**Spec:** [docs/superpowers/specs/2026-04-22-epic-3-monthly-quarterly-reports-design.md](../specs/2026-04-22-epic-3-monthly-quarterly-reports-design.md)

---

## Работа на ветке и issue

Правило из `CLAUDE.md`: нет issue — нет работы. Перед началом:

- [ ] **Создать GitHub issue** в `ragastar/lumm` с названием «Эпик 3: ежемесячные и квартальные отчёты» и телом, ссылающимся на спеку. Добавить на доску https://github.com/users/ragastar/projects/2 в колонку In Progress.

```bash
gh issue create \
  --repo ragastar/lumm \
  --title "Эпик 3: ежемесячные и квартальные отчёты" \
  --body "Докрутка /financials: auth из сессии, UNIQUE(member_id, month)+upsert, квартал-скрытие «Капитал», блок в /help.

Спека: docs/superpowers/specs/2026-04-22-epic-3-monthly-quarterly-reports-design.md
План:  docs/superpowers/plans/2026-04-22-epic-3-monthly-quarterly-reports.md"
```

После создания запомнить номер issue (далее в плане — `#N`, заменить на реальный).

- [ ] **Создать ветку:**

```bash
cd /root/lumm && git checkout -b epic-3-monthly
```

---

## Файловая структура

**Создать:**
- `src/lib/quarter.ts` — чистая функция `isQuarterEnd(monthIso): boolean`.
- `src/lib/__tests__/quarter.test.ts` — юнит-тесты.
- `src/lib/monthlyFinancials.ts` — валидация body и построение upsert-record.
- `src/lib/__tests__/monthlyFinancials.test.ts` — юнит-тесты.
- `src/app/api/monthly-financials/me/route.ts` — новый `GET /api/monthly-financials/me?month=...`.
- `scripts/migrations/2026-04-22-monthly-financials-unique.sql` — миграция.

**Модифицировать:**
- `src/db/schema.ts` — добавить `updatedAt` и `uniqueIndex` на `(member_id, month)`.
- `src/app/api/monthly-financials/route.ts` — auth из сессии, валидация через helper, upsert.
- `src/app/(main)/financials/FinancialsClient.tsx` — edit-flow, квартал-скрытие, refetch при смене месяца, обработка 400.
- `src/app/(main)/help/page.tsx` — заменить плейсхолдер.

**Не трогаем:** `src/app/(main)/financials/page.tsx` (SSR уже корректно берёт сессию), `seed.ts`, другие API.

---

### Task 1: `src/lib/quarter.ts` — single source of truth для квартала

**Files:**
- Create: `src/lib/quarter.ts`
- Test: `src/lib/__tests__/quarter.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/__tests__/quarter.test.ts
import { describe, it, expect } from "vitest";
import { isQuarterEnd } from "../quarter";

describe("isQuarterEnd", () => {
  it("true for March/June/September/December (YYYY-MM-01)", () => {
    expect(isQuarterEnd("2026-03-01")).toBe(true);
    expect(isQuarterEnd("2026-06-01")).toBe(true);
    expect(isQuarterEnd("2026-09-01")).toBe(true);
    expect(isQuarterEnd("2026-12-01")).toBe(true);
  });

  it("false for non-quarter months", () => {
    expect(isQuarterEnd("2026-01-01")).toBe(false);
    expect(isQuarterEnd("2026-02-01")).toBe(false);
    expect(isQuarterEnd("2026-04-01")).toBe(false);
    expect(isQuarterEnd("2026-05-01")).toBe(false);
    expect(isQuarterEnd("2026-07-01")).toBe(false);
    expect(isQuarterEnd("2026-08-01")).toBe(false);
    expect(isQuarterEnd("2026-10-01")).toBe(false);
    expect(isQuarterEnd("2026-11-01")).toBe(false);
  });

  it("works for leap year (2024) and non-leap (2026)", () => {
    expect(isQuarterEnd("2024-03-01")).toBe(true);
    expect(isQuarterEnd("2024-02-01")).toBe(false);
  });

  it("returns false for malformed input (no throw)", () => {
    expect(isQuarterEnd("2026-13-01")).toBe(false);
    expect(isQuarterEnd("not-a-date")).toBe(false);
    expect(isQuarterEnd("")).toBe(false);
  });
});
```

- [ ] **Step 2: Прогнать тест — должен упасть**

Run: `npx vitest run src/lib/__tests__/quarter.test.ts`
Expected: FAIL — `Cannot find module '../quarter'`.

- [ ] **Step 3: Написать минимальную реализацию**

```ts
// src/lib/quarter.ts
export function isQuarterEnd(monthIso: string): boolean {
  const match = /^(\d{4})-(\d{2})-01$/.exec(monthIso);
  if (!match) return false;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;
  return month === 3 || month === 6 || month === 9 || month === 12;
}
```

- [ ] **Step 4: Прогнать — должен пройти**

Run: `npx vitest run src/lib/__tests__/quarter.test.ts`
Expected: PASS (4 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/lib/quarter.ts src/lib/__tests__/quarter.test.ts
git commit -m "feat(quarter): isQuarterEnd helper + тесты (#N)"
```

---

### Task 2: Миграция БД + схема Drizzle

**Files:**
- Create: `scripts/migrations/2026-04-22-monthly-financials-unique.sql`
- Modify: `src/db/schema.ts:56-69`

- [ ] **Step 1: Проверить на dev БД, есть ли дубликаты `(member_id, month)`**

Run:
```bash
sqlite3 /root/lumm/data/lumm.db "SELECT member_id, month, COUNT(*) AS n FROM monthly_financials GROUP BY member_id, month HAVING n > 1;"
```

Expected: пустой вывод. Если строки есть — их надо руками разрулить (оставить самую свежую по `created_at`, остальные удалить) перед применением миграции:

```bash
sqlite3 /root/lumm/data/lumm.db "DELETE FROM monthly_financials WHERE id IN (SELECT id FROM monthly_financials mf WHERE created_at < (SELECT MAX(created_at) FROM monthly_financials WHERE member_id = mf.member_id AND month = mf.month));"
```

- [ ] **Step 2: Создать директорию scripts/migrations**

Run: `mkdir -p /root/lumm/scripts/migrations`

- [ ] **Step 3: Написать миграционный SQL**

```sql
-- scripts/migrations/2026-04-22-monthly-financials-unique.sql
-- Эпик 3: UNIQUE(member_id, month) + updated_at

BEGIN;

ALTER TABLE monthly_financials
  ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

UPDATE monthly_financials SET updated_at = created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_monthly_member_month
  ON monthly_financials(member_id, month);

COMMIT;
```

- [ ] **Step 4: Применить миграцию на dev**

Run:
```bash
sqlite3 /root/lumm/data/lumm.db < /root/lumm/scripts/migrations/2026-04-22-monthly-financials-unique.sql
```

Expected: нет ошибок. Проверить:
```bash
sqlite3 /root/lumm/data/lumm.db ".schema monthly_financials"
```
В выводе должен быть столбец `updated_at` и `CREATE UNIQUE INDEX uniq_monthly_member_month`.

- [ ] **Step 5: Обновить `src/db/schema.ts`**

Найти текущий блок `monthlyFinancials` ([src/db/schema.ts:56-69](../../../src/db/schema.ts#L56-L69)) и заменить его на:

```ts
export const monthlyFinancials = sqliteTable(
  "monthly_financials",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id").notNull().references(() => members.id),
    month: text("month").notNull(),
    revenue: real("revenue"),
    netProfit: real("net_profit"),
    capital: real("capital"),
    scoreBusiness: integer("score_business"),
    scoreFamily: integer("score_family"),
    scorePersonal: integer("score_personal"),
    reportText: text("report_text"),
    requestText: text("request_text"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    memberMonthUniq: uniqueIndex("uniq_monthly_member_month").on(table.memberId, table.month),
  }),
);
```

Добавить `uniqueIndex` в импорт в начале файла (там уже импортируется из `drizzle-orm/sqlite-core`):

```ts
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
```

- [ ] **Step 6: Проверить, что сборка типов проходит**

Run: `npx tsc --noEmit`
Expected: нет ошибок.

- [ ] **Step 7: Обновить `src/db/seed.ts`**

В `src/db/seed.ts:61-74` блок `CREATE TABLE IF NOT EXISTS monthly_financials (...)` — заменить на:

```sql
  CREATE TABLE IF NOT EXISTS monthly_financials (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id),
    month TEXT NOT NULL,
    revenue REAL,
    net_profit REAL,
    capital REAL,
    score_business INTEGER,
    score_family INTEGER,
    score_personal INTEGER,
    report_text TEXT,
    request_text TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_monthly_member_month
    ON monthly_financials(member_id, month);
```

Это актуализирует DDL для dev reset. Prod не трогается — для него работает миграция из Step 4.

- [ ] **Step 8: Коммит**

```bash
git add scripts/migrations/2026-04-22-monthly-financials-unique.sql src/db/schema.ts src/db/seed.ts
git commit -m "feat(db): UNIQUE(member_id,month) + updated_at на monthly_financials (#N)"
```

---

### Task 3: `src/lib/monthlyFinancials.ts` — валидация body

**Files:**
- Create: `src/lib/monthlyFinancials.ts`
- Test: `src/lib/__tests__/monthlyFinancials.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/__tests__/monthlyFinancials.test.ts
import { describe, it, expect } from "vitest";
import { validateMonthlyFinancialsBody } from "../monthlyFinancials";

describe("validateMonthlyFinancialsBody", () => {
  const valid = {
    month: "2026-04-01",
    revenue: 100000,
    netProfit: 30000,
    capital: null,
    scoreBusiness: 7,
    scoreFamily: 6,
    scorePersonal: 8,
    reportText: "хороший месяц",
    requestText: null,
  };

  it("accepts valid non-quarter body and normalizes capital to null", () => {
    const r = validateMonthlyFinancialsBody(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capital).toBe(null);
  });

  it("forces capital=null in non-quarter month even if provided", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, capital: 50_000_000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capital).toBe(null);
  });

  it("requires capital in quarter months", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, month: "2026-03-01", capital: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/[Кк]апитал/);
  });

  it("accepts capital in quarter months", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, month: "2026-06-01", capital: 5_000_000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capital).toBe(5_000_000);
  });

  it("rejects bad month format", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, month: "2026-04" });
    expect(r.ok).toBe(false);
  });

  it("rejects non-numeric revenue", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, revenue: "100k" as unknown as number });
    expect(r.ok).toBe(false);
  });

  it("rejects score out of 1..10", () => {
    const r1 = validateMonthlyFinancialsBody({ ...valid, scoreBusiness: 0 });
    const r2 = validateMonthlyFinancialsBody({ ...valid, scoreFamily: 11 });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
  });

  it("rejects empty reportText", () => {
    const r = validateMonthlyFinancialsBody({ ...valid, reportText: "   " });
    expect(r.ok).toBe(false);
  });

  it("accepts null requestText and empty-string requestText (coerced to null)", () => {
    const r1 = validateMonthlyFinancialsBody({ ...valid, requestText: null });
    const r2 = validateMonthlyFinancialsBody({ ...valid, requestText: "" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok) expect(r1.value.requestText).toBe(null);
    if (r2.ok) expect(r2.value.requestText).toBe(null);
  });
});
```

- [ ] **Step 2: Прогнать — должен упасть**

Run: `npx vitest run src/lib/__tests__/monthlyFinancials.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

```ts
// src/lib/monthlyFinancials.ts
import { isQuarterEnd } from "./quarter";

export type MonthlyFinancialsInput = {
  month: string;
  revenue: number;
  netProfit: number;
  capital: number | null;
  scoreBusiness: number;
  scoreFamily: number;
  scorePersonal: number;
  reportText: string;
  requestText: string | null;
};

export type ValidateResult =
  | { ok: true; value: MonthlyFinancialsInput }
  | { ok: false; error: string };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v >= min && v <= max;
}

export function validateMonthlyFinancialsBody(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Пустое тело запроса" };
  const b = raw as Record<string, unknown>;

  if (typeof b.month !== "string" || !/^\d{4}-\d{2}-01$/.test(b.month)) {
    return { ok: false, error: "month должен быть в формате YYYY-MM-01" };
  }

  if (!isFiniteNumber(b.revenue)) return { ok: false, error: "revenue обязательное число" };
  if (!isFiniteNumber(b.netProfit)) return { ok: false, error: "netProfit обязательное число" };

  if (!isIntInRange(b.scoreBusiness, 1, 10)) return { ok: false, error: "scoreBusiness должен быть 1..10" };
  if (!isIntInRange(b.scoreFamily, 1, 10)) return { ok: false, error: "scoreFamily должен быть 1..10" };
  if (!isIntInRange(b.scorePersonal, 1, 10)) return { ok: false, error: "scorePersonal должен быть 1..10" };

  if (typeof b.reportText !== "string" || b.reportText.trim() === "") {
    return { ok: false, error: "reportText обязательное поле" };
  }

  let requestText: string | null = null;
  if (b.requestText !== null && b.requestText !== undefined && b.requestText !== "") {
    if (typeof b.requestText !== "string") return { ok: false, error: "requestText должен быть строкой" };
    requestText = b.requestText;
  }

  const isQuarter = isQuarterEnd(b.month);
  let capital: number | null;
  if (isQuarter) {
    if (!isFiniteNumber(b.capital)) {
      return { ok: false, error: "Капитал обязателен в квартальный месяц" };
    }
    capital = b.capital;
  } else {
    capital = null;
  }

  return {
    ok: true,
    value: {
      month: b.month,
      revenue: b.revenue,
      netProfit: b.netProfit,
      capital,
      scoreBusiness: b.scoreBusiness,
      scoreFamily: b.scoreFamily,
      scorePersonal: b.scorePersonal,
      reportText: b.reportText,
      requestText,
    },
  };
}
```

- [ ] **Step 4: Прогнать — должен пройти**

Run: `npx vitest run src/lib/__tests__/monthlyFinancials.test.ts`
Expected: PASS (9 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/lib/monthlyFinancials.ts src/lib/__tests__/monthlyFinancials.test.ts
git commit -m "feat(monthly): validateMonthlyFinancialsBody + тесты (#N)"
```

---

### Task 4: Переписать `POST /api/monthly-financials` на auth+upsert

**Files:**
- Modify: `src/app/api/monthly-financials/route.ts`

- [ ] **Step 1: Заменить файл целиком**

```ts
// src/app/api/monthly-financials/route.ts
import { type NextRequest } from "next/server";
import { db } from "@/db";
import { monthlyFinancials, members } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getCurrentMemberId } from "@/lib/session";
import { validateMonthlyFinancialsBody } from "@/lib/monthlyFinancials";

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get("memberId");

  if (memberId) {
    const rows = await db
      .select()
      .from(monthlyFinancials)
      .where(eq(monthlyFinancials.memberId, memberId))
      .orderBy(desc(monthlyFinancials.month));
    return Response.json(rows);
  }

  const rows = await db
    .select({
      id: monthlyFinancials.id,
      memberId: monthlyFinancials.memberId,
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
      memberDisplayName: members.displayName,
      memberAvatarColor: members.avatarColor,
    })
    .from(monthlyFinancials)
    .leftJoin(members, eq(monthlyFinancials.memberId, members.id))
    .orderBy(desc(monthlyFinancials.month));

  return Response.json(rows);
}

export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const result = validateMonthlyFinancialsBody(raw);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const v = result.value;

  const now = new Date().toISOString();

  const existing = await db
    .select({ id: monthlyFinancials.id, createdAt: monthlyFinancials.createdAt })
    .from(monthlyFinancials)
    .where(and(eq(monthlyFinancials.memberId, memberId), eq(monthlyFinancials.month, v.month)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(monthlyFinancials)
      .set({
        revenue: v.revenue,
        netProfit: v.netProfit,
        capital: v.capital,
        scoreBusiness: v.scoreBusiness,
        scoreFamily: v.scoreFamily,
        scorePersonal: v.scorePersonal,
        reportText: v.reportText,
        requestText: v.requestText,
        updatedAt: now,
      })
      .where(eq(monthlyFinancials.id, existing[0].id));

    return Response.json(
      {
        id: existing[0].id,
        memberId,
        month: v.month,
        revenue: v.revenue,
        netProfit: v.netProfit,
        capital: v.capital,
        scoreBusiness: v.scoreBusiness,
        scoreFamily: v.scoreFamily,
        scorePersonal: v.scorePersonal,
        reportText: v.reportText,
        requestText: v.requestText,
        createdAt: existing[0].createdAt,
        updatedAt: now,
      },
      { status: 200 },
    );
  }

  const record = {
    id: randomUUID(),
    memberId,
    month: v.month,
    revenue: v.revenue,
    netProfit: v.netProfit,
    capital: v.capital,
    scoreBusiness: v.scoreBusiness,
    scoreFamily: v.scoreFamily,
    scorePersonal: v.scorePersonal,
    reportText: v.reportText,
    requestText: v.requestText,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(monthlyFinancials).values(record);
  return Response.json(record, { status: 200 });
}
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: нет ошибок.

- [ ] **Step 3: Проверить, что все существующие тесты не ломаются**

Run: `npx vitest run`
Expected: все тесты зелёные.

- [ ] **Step 4: Коммит**

```bash
git add src/app/api/monthly-financials/route.ts
git commit -m "feat(api): POST monthly-financials использует сессию + upsert (#N)"
```

---

### Task 5: `GET /api/monthly-financials/me?month=...` — для edit-flow

**Files:**
- Create: `src/app/api/monthly-financials/me/route.ts`

- [ ] **Step 1: Создать эндпоинт**

```ts
// src/app/api/monthly-financials/me/route.ts
import { type NextRequest } from "next/server";
import { db } from "@/db";
import { monthlyFinancials } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMemberId } from "@/lib/session";

export async function GET(request: NextRequest) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}-01$/.test(month)) {
    return Response.json({ error: "month должен быть в формате YYYY-MM-01" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(monthlyFinancials)
    .where(and(eq(monthlyFinancials.memberId, memberId), eq(monthlyFinancials.month, month)))
    .limit(1);

  return Response.json(rows[0] ?? null);
}
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: нет ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/app/api/monthly-financials/me/route.ts
git commit -m "feat(api): GET /api/monthly-financials/me?month= (#N)"
```

---

### Task 6: Форма `/financials` — edit-flow + квартал-скрытие

**Files:**
- Modify: `src/app/(main)/financials/FinancialsClient.tsx`

Важно: в Next.js 16 `@/lib/quarter` — чистый модуль, безопасен для клиентского бандла (никаких импортов server-only). Используем.

- [ ] **Step 1: Переписать `FinancialsClient.tsx` целиком**

```tsx
// src/app/(main)/financials/FinancialsClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkline } from "@/components/Sparkline";
import { isQuarterEnd } from "@/lib/quarter";

type Financial = {
  id: string;
  month: string;
  revenue: number | null;
  netProfit: number | null;
  capital: number | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
  reportText: string | null;
  requestText: string | null;
};

type Props = {
  member: { id: string; displayName: string };
  financials: Financial[];
};

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function currentMonthIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function toMonthInput(iso: string): string {
  // "YYYY-MM-01" -> "YYYY-MM"
  return iso.slice(0, 7);
}

function fromMonthInput(val: string): string {
  // "YYYY-MM" -> "YYYY-MM-01"
  return `${val}-01`;
}

type FormState = {
  revenue: string;
  netProfit: string;
  capital: string;
  scoreBusiness: string;
  scoreFamily: string;
  scorePersonal: string;
  reportText: string;
  requestText: string;
};

const EMPTY_FORM: FormState = {
  revenue: "",
  netProfit: "",
  capital: "",
  scoreBusiness: "",
  scoreFamily: "",
  scorePersonal: "",
  reportText: "",
  requestText: "",
};

function fromRecord(r: Financial): FormState {
  return {
    revenue: r.revenue?.toString() ?? "",
    netProfit: r.netProfit?.toString() ?? "",
    capital: r.capital?.toString() ?? "",
    scoreBusiness: r.scoreBusiness?.toString() ?? "",
    scoreFamily: r.scoreFamily?.toString() ?? "",
    scorePersonal: r.scorePersonal?.toString() ?? "",
    reportText: r.reportText ?? "",
    requestText: r.requestText ?? "",
  };
}

export function FinancialsClient({ member, financials }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [month, setMonth] = useState<string>(currentMonthIso());
  const [existing, setExisting] = useState<Financial | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const quarter = isQuarterEnd(month);

  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    setError(null);
    fetch(`/api/monthly-financials/me?month=${encodeURIComponent(month)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as Financial | null;
      })
      .then((record) => {
        if (cancelled) return;
        setExisting(record);
        setForm(record ? fromRecord(record) : EMPTY_FORM);
      });
    return () => {
      cancelled = true;
    };
  }, [month, showForm]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      month,
      revenue: Number(form.revenue),
      netProfit: Number(form.netProfit),
      capital: quarter && form.capital !== "" ? Number(form.capital) : null,
      scoreBusiness: Number(form.scoreBusiness),
      scoreFamily: Number(form.scoreFamily),
      scorePersonal: Number(form.scorePersonal),
      reportText: form.reportText,
      requestText: form.requestText || null,
    };

    const res = await fetch("/api/monthly-financials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
      setError(data.error ?? "Ошибка сервера");
      return;
    }

    setShowForm(false);
    router.refresh();
  };

  const revenueData = [...financials].reverse().map((f) => f.revenue ?? 0);
  const profitData = [...financials].reverse().map((f) => f.netProfit ?? 0);

  const monthLabel = new Date(month + "T00:00:00").toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  const title = existing ? `Редактировать отчёт за ${monthLabel}` : "Месячный отчёт";
  const submitLabel = existing ? "Сохранить изменения" : "Сохранить отчёт";

  const updateField = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-lumm-text-secondary mt-1">
            Ежемесячные отчёты — {member.displayName}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors"
        >
          {showForm ? "Отмена" : "Новый отчёт"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-lg font-medium text-lumm-gold">{title}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Месяц</label>
              <input
                name="month"
                type="month"
                required
                value={toMonthInput(month)}
                onChange={(e) => setMonth(fromMonthInput(e.target.value))}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${quarter ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Выручка (вал), ₽ *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.revenue}
                onChange={updateField("revenue")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Чистая прибыль, ₽ *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.netProfit}
                onChange={updateField("netProfit")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            {quarter && (
              <div>
                <label className="block text-sm text-lumm-text-secondary mb-1">
                  Капитал на конец квартала, ₽ *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.capital}
                  onChange={updateField("capital")}
                  className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Бизнес (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={form.scoreBusiness}
                onChange={updateField("scoreBusiness")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Семья (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={form.scoreFamily}
                onChange={updateField("scoreFamily")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-lumm-text-secondary mb-1">Личное (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={form.scorePersonal}
                onChange={updateField("scorePersonal")}
                className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Отчёт по сферам *</label>
            <textarea
              rows={3}
              required
              value={form.reportText}
              onChange={updateField("reportText")}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">
              Запрос на разбор (опционально)
            </label>
            <textarea
              rows={2}
              value={form.requestText}
              onChange={updateField("requestText")}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Сохранение..." : submitLabel}
          </button>
        </form>
      )}

      {revenueData.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <p className="text-sm text-lumm-text-secondary mb-3">Выручка (6 мес)</p>
            <div className="w-full overflow-hidden">
              <Sparkline data={revenueData} width={450} height={60} color="#c9a84c" />
            </div>
          </div>
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <p className="text-sm text-lumm-text-secondary mb-3">Чистая прибыль (6 мес)</p>
            <div className="w-full overflow-hidden">
              <Sparkline data={profitData} width={450} height={60} color="#51cf66" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-lumm-gray-light">
          <h3 className="text-sm font-medium text-lumm-text-secondary">История отчётов</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                <th className="text-left px-6 py-3">Месяц</th>
                <th className="text-right px-6 py-3">Выручка</th>
                <th className="text-right px-6 py-3">Прибыль</th>
                <th className="text-right px-6 py-3">Капитал</th>
                <th className="text-center px-6 py-3">Б/С/Л</th>
              </tr>
            </thead>
            <tbody>
              {financials.map((f) => (
                <tr key={f.id} className="border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20">
                  <td className="px-6 py-3 text-sm">
                    {new Date(f.month + "T00:00:00").toLocaleDateString("ru-RU", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    {f.revenue != null ? formatRub(f.revenue) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-lumm-gold">
                    {f.netProfit != null ? formatRub(f.netProfit) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    {f.capital != null ? formatRub(f.capital) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-center">
                    <span className="text-lumm-gold">{f.scoreBusiness}</span>/
                    <span className="text-blue-400">{f.scoreFamily}</span>/
                    <span className="text-purple-400">{f.scorePersonal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Проверить типы и lint**

Run: `npx tsc --noEmit`
Expected: нет ошибок.

Run: `npm run lint`
Expected: нет ошибок.

- [ ] **Step 3: Проверить тесты**

Run: `npx vitest run`
Expected: всё зелёное.

- [ ] **Step 4: Коммит**

```bash
git add "src/app/(main)/financials/FinancialsClient.tsx"
git commit -m "feat(financials): edit-flow + квартал-скрытие поля «Капитал» (#N)"
```

---

### Task 7: Обновить `/help` — блок «Ежемесячный отчёт»

**Files:**
- Modify: `src/app/(main)/help/page.tsx:123-132`

- [ ] **Step 1: Заменить плейсхолдер на актуальный блок**

Найти секцию с плейсхолдером и заменить:

```tsx
      {/* Ежемесячный отчёт — placeholder */}
      <section className="bg-lumm-black border border-lumm-gray-light/50 rounded-xl p-6 space-y-2 opacity-60">
        <h2 className="text-xl font-semibold text-lumm-text-primary">5. Ежемесячный отчёт</h2>
        <p className="text-sm text-lumm-text-secondary">
          Раздел в разработке. Месячные отчёты заполняются формой в вебе: выручка, чистая прибыль, оценки по трём
          сферам (Б/С/Л), текст по сферам. В квартальные месяцы (март, июнь, сентябрь, декабрь) — активируется
          дополнительное поле «Капитал».
        </p>
      </section>
```

на:

```tsx
      {/* Ежемесячный отчёт */}
      <section className="bg-lumm-black border border-lumm-gray-light/50 rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-lumm-text-primary">5. Ежемесячный отчёт</h2>
        <p className="text-sm text-lumm-text-secondary">
          Каждый участник сдаёт отчёт раз в месяц через страницу <strong>Финансы</strong>.
        </p>
        <div className="text-sm text-lumm-text-secondary space-y-1">
          <p><strong>Что указываем:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Выручка (валовая) и чистая прибыль за месяц, ₽</li>
            <li>Оценки по сферам: Бизнес / Семья / Личное (1-10)</li>
            <li>Текст отчёта по сферам</li>
            <li>Запрос на разбор (если есть)</li>
          </ul>
        </div>
        <p className="text-sm text-lumm-text-secondary">
          <strong>Капитал</strong> сдаём только в конце квартала — в марте, июне, сентябре и декабре. В эти
          месяцы поле обязательное. В остальные — оно скрыто.
        </p>
        <p className="text-sm text-lumm-text-secondary">
          <strong>Редактировать</strong> можно в любой момент: сохраняешь заново, запись обновляется.
          Финалом считается последняя сохранённая версия.
        </p>
      </section>
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: нет ошибок.

- [ ] **Step 3: Коммит**

```bash
git add "src/app/(main)/help/page.tsx"
git commit -m "docs(help): актуальный блок про ежемесячный отчёт (#N)"
```

---

### Task 8: Сборка + ручная проверка на dev + деплой

- [ ] **Step 1: Сборка**

Run: `cd /root/lumm && npm run build`
Expected: сборка прошла, нет ошибок.

- [ ] **Step 2: Поднять dev-сервер**

Run в отдельном терминале: `cd /root/lumm && npm run dev`

- [ ] **Step 3: Ручная проверка сценариев**

Залогиниться, зайти на `/financials`:

- Открыть «Новый отчёт». Поле месяца — текущий. Поле «Капитал» видно только если текущий месяц — март/июнь/сентябрь/декабрь. Иначе скрыто.
- Поменять месяц на квартальный — поле «Капитал» появилось, `required`.
- Поменять на неквартальный — исчезло.
- Заполнить и сохранить отчёт за текущий месяц. Запись появилась в таблице, форма закрылась.
- Снова «Новый отчёт» за тот же месяц → заголовок «Редактировать...», поля предзаполнены, кнопка «Сохранить изменения».
- Изменить число в выручке, сохранить. Таблица обновилась (тот же месяц, новая выручка). Второй строки нет (UNIQUE работает).
- Открыть devtools, попробовать POST с `memberId` другого юзера → запись уходит за юзера из сессии, не за подставленного.
- Выйти из системы, попробовать POST → 401.
- Проверить `/help` — плейсхолдер убран, новый блок виден.

- [ ] **Step 4: Проверка тестов и типов финально**

Run: `cd /root/lumm && npm test && npx tsc --noEmit`
Expected: всё зелёное.

- [ ] **Step 5: Push ветки и PR**

```bash
cd /root/lumm
git push -u origin epic-3-monthly
gh pr create \
  --title "Эпик 3: ежемесячные и квартальные отчёты" \
  --body "$(cat <<'EOF'
## Summary
- Auth fix: POST /api/monthly-financials берёт memberId из сессии; body.memberId игнорируется.
- UNIQUE(member_id, month) + upsert — нельзя сдать два отчёта за месяц, перезапись поверх.
- Квартальная логика: «Капитал» обязателен в марте/июне/сентябре/декабре; в остальные месяцы скрыт.
- Новый GET /api/monthly-financials/me?month= для предзаполнения формы при редактировании.
- Обновлён /help: блок «Ежемесячный отчёт» без плейсхолдера.

Closes #N

## Test plan
- [ ] `npm test` зелёный
- [ ] `npx tsc --noEmit` — без ошибок
- [ ] Ручная проверка на деве (см. Task 8, Step 3)
- [ ] Применить миграцию на prod: `sqlite3 /root/lumm/data/lumm.db < scripts/migrations/2026-04-22-monthly-financials-unique.sql` после pull
EOF
)"
```

- [ ] **Step 6: Применить миграцию на prod и деплой**

После мержа PR:

```bash
# на сервере (через ssh или локально, если работаем прямо на prod-сервере):
cd /root/lumm
git pull
# PROD-ONLY: перед миграцией — бекап
cp data/lumm.db "data/lumm.db.bak.$(date +%Y%m%d-%H%M%S)"
# проверка дубликатов
sqlite3 data/lumm.db "SELECT member_id, month, COUNT(*) AS n FROM monthly_financials GROUP BY member_id, month HAVING n > 1;"
# если пусто — применяем
sqlite3 data/lumm.db < scripts/migrations/2026-04-22-monthly-financials-unique.sql
# пересборка и рестарт сервиса
npm run build
sudo systemctl restart lumm.service
```

- [ ] **Step 7: Пост-деплой проверка**

- Открыть https://lumm.space/financials и повторить сценарий из Task 8 Step 3.
- Проверить https://lumm.space/help — новый блок.
- Закрыть GitHub issue `#N` с комментарием о деплое, переместить карточку в Done.

---

## Финальный чек-лист

- [ ] Все задачи сделаны, коммиты чистые
- [ ] `npm test` зелёный
- [ ] `npx tsc --noEmit` зелёный
- [ ] `npm run lint` зелёный
- [ ] Ручная проверка на деве пройдена
- [ ] Миграция применена на prod
- [ ] PR смержен
- [ ] Issue закрыт, карточка в Done
- [ ] Обновить `project_lumm.md` в авто-памяти: «Эпик 3 готов, на очереди Эпик 4 (дашборды + интеграция месячных в общую ленту)»

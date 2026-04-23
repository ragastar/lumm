# LUMM Goal System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Встроить структурную цель (WOOP + HARD + 12WY + SCI/Klein) в LUMM как отдельный путь постановки цели рядом с текущими `businessGoal`/`sportGoal`. Лендинг `/goal` → мастер `/goal/new` → просмотр `/goal/my` и `/goal/[memberId]`.

**Architecture:** Отдельная таблица `goal_plans` (гибрид колонок + JSON). 4 API-эндпоинта под `/api/goal-plans/*`. Серверные страницы с SSR, мастер — client component в собственном layout с editorial-палитрой. Остальные новые страницы — в LUMM dark. Переливающаяся CSS-кнопка. Пункт сайдбара, блоки в профиле и `/members/[id]`.

**Tech Stack:** Next.js 16 (App Router), SQLite + Drizzle, vitest, lucide-react (добавляется), next/font для editorial-мастера. Ручная валидация (без zod, как в `monthlyFinancials`). Auth через existing `getCurrentUser()`.

**Spec:** [2026-04-23-lumm-goal-system-design.md](../specs/2026-04-23-lumm-goal-system-design.md)

**Workflow:** Каждая секция = commit с `#N`. Эпик-issue создаётся в Task 0.

**Уточнения к спеке, найденные при планировании:**
- Proxy `src/proxy.ts` **не требует правок** — он catch-all, все пути кроме `publicPaths` уже требуют auth. Новые роуты `/goal*` и `/api/goal-plans/*` защищены автоматически.
- Валидация — **без zod** (его нет в проекте). Паттерн — `{ ok: true, value } | { ok: false, error }`, как в `validateMonthlyFinancialsBody`. Меньше зависимостей.
- Мастер `/goal/new` — в route-group **`(goal-wizard)`**, не в `(main)`. Причина: вложенный layout в App Router **не перекрывает** родительский, сайдбар из `(main)/layout.tsx` продолжал бы рендериться. Отдельная группа на уровне `src/app/` — единственный способ получить полностью изолированный layout без сайдбара. URL остаётся `/goal/new` (route-groups не влияют на URL).

---

## File Structure

**Создаём:**

- `scripts/migrations/2026-04-23-goal-plans.sql` — DDL
- `src/lib/goalPlan.ts` — типы, compute*, validate*
- `src/lib/__tests__/goalPlan.test.ts` — юниты
- `src/app/api/goal-plans/route.ts` — POST (upsert)
- `src/app/api/goal-plans/me/route.ts` — GET + DELETE
- `src/app/api/goal-plans/[memberId]/route.ts` — GET
- `src/app/(main)/goal/page.tsx` — лендинг
- `src/app/(main)/goal/_components/ShimmerButton.tsx` — reusable CTA
- `src/app/(main)/goal/my/page.tsx` — свой просмотр (server)
- `src/app/(main)/goal/my/GoalViewActions.tsx` — кнопки edit/delete (client)
- `src/app/(main)/goal/[memberId]/page.tsx` — чужой просмотр
- `src/app/(main)/goal/_components/GoalView.tsx` — shared presentation
- `src/app/(goal-wizard)/goal/new/layout.tsx` — own editorial layout (route-group, сиблинг `(main)` — избегаем рендера сайдбара)
- `src/app/(goal-wizard)/goal/new/page.tsx` — SSR existing plan
- `src/app/(goal-wizard)/goal/new/GoalWizard.tsx` — client wizard

**Модифицируем:**

- `src/db/schema.ts` — добавить `goalPlans`
- `src/app/globals.css` — добавить `.btn-shimmer`
- `src/components/Sidebar.tsx` — добавить пункт «Цель на 12 недель»
- `src/app/(main)/profile/ProfileClient.tsx` — блок «LUMM Goal System»
- `src/app/(main)/profile/page.tsx` — SSR `goalPlan` и прокидывать в клиент
- `src/app/(main)/members/[id]/page.tsx` — блок «Структурная цель»
- `src/app/(main)/help/page.tsx` — раздел про систему целей
- `package.json` — добавить `lucide-react`

---

## Task 0: Issue + ветка + установка deps

**Files:**
- Modify: `package.json` (через npm)

- [ ] **Step 1: Создать эпик-issue на GitHub**

```bash
gh issue create --repo ragastar/lumm \
  --title "Эпик 5: LUMM Goal System (Wombo Combo)" \
  --body "$(cat <<'EOF'
Структурная цель по методике WOOP+HARD+12WY+SCI/Klein. Рядом с текущими businessGoal/sportGoal.

Флоу: сайдбар/профиль → лендинг /goal → мастер /goal/new → просмотр /goal/my и /goal/[memberId].

Спека: docs/superpowers/specs/2026-04-23-lumm-goal-system-design.md
План: docs/superpowers/plans/2026-04-23-lumm-goal-system.md

Подзадачи будут привязаны как sub-issues.
EOF
)"
```

Записать номер issue → `EPIC_ISSUE` (ссылаемся на него во всех коммитах как `#N`).

- [ ] **Step 2: Создать ветку от master**

```bash
git checkout master && git pull origin master
git checkout -b epic-5-goal-system
```

- [ ] **Step 3: Добавить lucide-react**

```bash
cd /root/lumm && npm install lucide-react
```

Ожидаемо: `+ lucide-react@<version>` в `package.json`, успешная установка без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: добавить lucide-react для иконок мастера целей (#EPIC_ISSUE)"
```

---

## Task 1: DB migration + Drizzle schema

**Files:**
- Create: `scripts/migrations/2026-04-23-goal-plans.sql`
- Modify: `src/db/schema.ts` — добавить `goalPlans`

- [ ] **Step 1: Написать миграцию**

Создать `scripts/migrations/2026-04-23-goal-plans.sql`:

```sql
-- scripts/migrations/2026-04-23-goal-plans.sql
-- Эпик 5: структурная цель (WOOP + HARD + 12WY + SCI/Klein)

BEGIN;

CREATE TABLE IF NOT EXISTS goal_plans (
  id            TEXT PRIMARY KEY NOT NULL,
  member_id     TEXT NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  wish          TEXT NOT NULL,
  sphere        TEXT NOT NULL,
  sci_score     INTEGER NOT NULL,
  klein_avg     REAL NOT NULL,
  difficulty    INTEGER NOT NULL,
  metric_name   TEXT,
  metric_start  TEXT,
  metric_target TEXT,
  data          TEXT NOT NULL,
  locked        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

COMMIT;
```

- [ ] **Step 2: Добавить таблицу в `src/db/schema.ts`**

В конец файла добавить:

```typescript
export const goalPlans = sqliteTable("goal_plans", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().unique().references(() => members.id, { onDelete: "cascade" }),
  wish: text("wish").notNull(),
  sphere: text("sphere").notNull(),
  sciScore: integer("sci_score").notNull(),
  kleinAvg: real("klein_avg").notNull(),
  difficulty: integer("difficulty").notNull(),
  metricName: text("metric_name"),
  metricStart: text("metric_start"),
  metricTarget: text("metric_target"),
  data: text("data").notNull(),
  locked: integer("locked").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 3: Применить миграцию локально**

```bash
cd /root/lumm
sqlite3 data/lumm.db < scripts/migrations/2026-04-23-goal-plans.sql
sqlite3 data/lumm.db "SELECT sql FROM sqlite_master WHERE name='goal_plans';"
```

Ожидаемо: DDL таблицы выводится без ошибок, `goal_plans` присутствует в schema.

- [ ] **Step 4: Проверить билд**

```bash
npm run build 2>&1 | tail -20
```

Ожидаемо: «Compiled successfully» без ошибок типизации.

- [ ] **Step 5: Коммит**

```bash
git add scripts/migrations/2026-04-23-goal-plans.sql src/db/schema.ts
git commit -m "feat(db): таблица goal_plans — структурная цель (#EPIC_ISSUE)"
```

---

## Task 2: Pure domain — типы и компьютеры баллов

**Files:**
- Create: `src/lib/goalPlan.ts`
- Create: `src/lib/__tests__/goalPlan.test.ts`

- [ ] **Step 1: Определить типы и заготовку в `src/lib/goalPlan.ts`**

```typescript
// src/lib/goalPlan.ts — чистая логика структурной цели.

export const SPHERES = ["business", "health", "skills", "family", "creative", "finance"] as const;
export type Sphere = typeof SPHERES[number];

export const OBSTACLE_TYPES = ["emotion", "habit", "belief", "state"] as const;
export type ObstacleType = typeof OBSTACLE_TYPES[number];

/** Payload, приходящий с клиента (мастер) на POST /api/goal-plans */
export type GoalPlanPayload = {
  wish: string;
  sphere: Sphere;
  difficulty: number;                    // 1..10
  metricName: string | null;
  metricStart: string | null;
  metricTarget: string | null;
  // SCI raw (шкала Sheldon-Elliot, 1..9 каждое поле)
  sciShame: number;
  sciExternal: number;
  sciIdentified: number;
  sciIntrinsic: number;
  // Klein raw (1..5 каждое)
  klein1: number;
  klein2: number;
  klein3: number;
  klein4: number;
  // Всё остальное — свободный JSON, хранится в колонке data
  data: Record<string, unknown>;
};

/** SCI = (intrinsic + identified) − (shame + external) */
export function computeSciScore(raw: {
  sciShame: number;
  sciExternal: number;
  sciIdentified: number;
  sciIntrinsic: number;
}): number {
  return (raw.sciIntrinsic + raw.sciIdentified) - (raw.sciShame + raw.sciExternal);
}

/** Klein среднее, с округлением до 1 знака */
export function computeKleinAvg(raw: {
  klein1: number;
  klein2: number;
  klein3: number;
  klein4: number;
}): number {
  const sum = raw.klein1 + raw.klein2 + raw.klein3 + raw.klein4;
  return Math.round((sum / 4) * 10) / 10;
}
```

- [ ] **Step 2: Написать падающий тест**

`src/lib/__tests__/goalPlan.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { computeSciScore, computeKleinAvg } from "../goalPlan";

describe("computeSciScore", () => {
  test("максимум: intrinsic+identified=9+9, shame+external=1+1 → +16", () => {
    const r = computeSciScore({ sciIntrinsic: 9, sciIdentified: 9, sciShame: 1, sciExternal: 1 });
    expect(r).toBe(16);
  });

  test("минимум: все shame/external=9, intrinsic/identified=1 → −16", () => {
    const r = computeSciScore({ sciIntrinsic: 1, sciIdentified: 1, sciShame: 9, sciExternal: 9 });
    expect(r).toBe(-16);
  });

  test("нейтраль: все 5 → 0", () => {
    const r = computeSciScore({ sciIntrinsic: 5, sciIdentified: 5, sciShame: 5, sciExternal: 5 });
    expect(r).toBe(0);
  });

  test("дефолтное значение: все 5 → 0", () => {
    const r = computeSciScore({ sciIntrinsic: 5, sciIdentified: 5, sciShame: 5, sciExternal: 5 });
    expect(r).toBe(0);
  });
});

describe("computeKleinAvg", () => {
  test("все 1 → 1.0", () => {
    expect(computeKleinAvg({ klein1: 1, klein2: 1, klein3: 1, klein4: 1 })).toBe(1);
  });

  test("все 5 → 5.0", () => {
    expect(computeKleinAvg({ klein1: 5, klein2: 5, klein3: 5, klein4: 5 })).toBe(5);
  });

  test("смешанный: 3+4+4+5 / 4 = 4.0", () => {
    expect(computeKleinAvg({ klein1: 3, klein2: 4, klein3: 4, klein4: 5 })).toBe(4);
  });

  test("округление до 1 знака: 3+3+3+4=13 → 3.3 (не 3.25)", () => {
    expect(computeKleinAvg({ klein1: 3, klein2: 3, klein3: 3, klein4: 4 })).toBe(3.3);
  });
});
```

- [ ] **Step 3: Прогнать тест — убедиться, что проходит**

```bash
npm test -- goalPlan.test.ts
```

Ожидаемо: 8 passing (4 SCI + 4 Klein). Если падает — поправить, пока не зелёный.

- [ ] **Step 4: Коммит**

```bash
git add src/lib/goalPlan.ts src/lib/__tests__/goalPlan.test.ts
git commit -m "feat(lib): goalPlan — типы + computeSciScore + computeKleinAvg (#EPIC_ISSUE)"
```

---

## Task 3: Pure domain — validateGoalPlanPayload

**Files:**
- Modify: `src/lib/goalPlan.ts` — добавить `validateGoalPlanPayload`
- Modify: `src/lib/__tests__/goalPlan.test.ts` — 7 тестов

- [ ] **Step 1: Написать падающий тест**

Добавить в `goalPlan.test.ts`:

```typescript
import { validateGoalPlanPayload } from "../goalPlan";

const validBody = {
  wish: "Вывести бизнес на выручку 5 млн ₽/мес к 12-й неделе",
  sphere: "business",
  difficulty: 7,
  metricName: "Выручка",
  metricStart: "2.3 млн ₽",
  metricTarget: "5 млн ₽",
  sciShame: 3,
  sciExternal: 4,
  sciIdentified: 8,
  sciIntrinsic: 7,
  klein1: 4,
  klein2: 5,
  klein3: 4,
  klein4: 5,
  data: { foo: "bar" },
};

describe("validateGoalPlanPayload", () => {
  test("валидный body проходит", () => {
    const r = validateGoalPlanPayload(validBody);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.wish).toBe(validBody.wish);
  });

  test("пустое тело → error", () => {
    expect(validateGoalPlanPayload(null).ok).toBe(false);
    expect(validateGoalPlanPayload("не объект").ok).toBe(false);
  });

  test("wish короче 20 символов → error", () => {
    const r = validateGoalPlanPayload({ ...validBody, wish: "короткий" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/wish/i);
  });

  test("wish длиннее 200 символов → error", () => {
    const longWish = "a".repeat(201);
    const r = validateGoalPlanPayload({ ...validBody, wish: longWish });
    expect(r.ok).toBe(false);
  });

  test("неизвестный sphere → error", () => {
    const r = validateGoalPlanPayload({ ...validBody, sphere: "martial_arts" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/sphere/i);
  });

  test("difficulty вне 1..10 → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, difficulty: 0 }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, difficulty: 11 }).ok).toBe(false);
  });

  test("SCI raw вне 1..9 → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, sciShame: 0 }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, sciIntrinsic: 10 }).ok).toBe(false);
  });

  test("Klein raw вне 1..5 → error", () => {
    expect(validateGoalPlanPayload({ ...validBody, klein1: 0 }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, klein2: 6 }).ok).toBe(false);
  });

  test("metricName допускает null и пустую строку (необязательное поле)", () => {
    expect(validateGoalPlanPayload({ ...validBody, metricName: null, metricStart: null, metricTarget: null }).ok).toBe(true);
    expect(validateGoalPlanPayload({ ...validBody, metricName: "" }).ok).toBe(true);
  });

  test("data обязательно должен быть объектом (можно пустым)", () => {
    expect(validateGoalPlanPayload({ ...validBody, data: {} }).ok).toBe(true);
    expect(validateGoalPlanPayload({ ...validBody, data: "не объект" }).ok).toBe(false);
    expect(validateGoalPlanPayload({ ...validBody, data: null }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

```bash
npm test -- goalPlan.test.ts
```

Ожидаемо: все новые тесты FAIL (validateGoalPlanPayload не экспортирован).

- [ ] **Step 3: Реализовать `validateGoalPlanPayload` в `goalPlan.ts`**

Добавить в конец `src/lib/goalPlan.ts`:

```typescript
export type ValidateResult =
  | { ok: true; value: GoalPlanPayload }
  | { ok: false; error: string };

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return isInt(v) && v >= min && v <= max;
}

function normalizeStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export function validateGoalPlanPayload(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Пустое или некорректное тело запроса" };
  }
  const b = raw as Record<string, unknown>;

  if (typeof b.wish !== "string") return { ok: false, error: "wish обязателен" };
  const wish = b.wish.trim();
  if (wish.length < 20) return { ok: false, error: "wish слишком короткий (минимум 20 символов)" };
  if (wish.length > 200) return { ok: false, error: "wish слишком длинный (максимум 200 символов)" };

  if (typeof b.sphere !== "string" || !SPHERES.includes(b.sphere as Sphere)) {
    return { ok: false, error: `sphere должен быть один из: ${SPHERES.join(", ")}` };
  }

  if (!isIntInRange(b.difficulty, 1, 10)) {
    return { ok: false, error: "difficulty должен быть целым 1..10" };
  }

  // SCI raw — 1..9 каждое
  for (const k of ["sciShame", "sciExternal", "sciIdentified", "sciIntrinsic"] as const) {
    if (!isIntInRange(b[k], 1, 9)) {
      return { ok: false, error: `${k} должен быть целым 1..9` };
    }
  }

  // Klein raw — 1..5 каждое
  for (const k of ["klein1", "klein2", "klein3", "klein4"] as const) {
    if (!isIntInRange(b[k], 1, 5)) {
      return { ok: false, error: `${k} должен быть целым 1..5` };
    }
  }

  if (!b.data || typeof b.data !== "object" || Array.isArray(b.data)) {
    return { ok: false, error: "data должен быть объектом" };
  }

  return {
    ok: true,
    value: {
      wish,
      sphere: b.sphere as Sphere,
      difficulty: b.difficulty as number,
      metricName: normalizeStringOrNull(b.metricName),
      metricStart: normalizeStringOrNull(b.metricStart),
      metricTarget: normalizeStringOrNull(b.metricTarget),
      sciShame: b.sciShame as number,
      sciExternal: b.sciExternal as number,
      sciIdentified: b.sciIdentified as number,
      sciIntrinsic: b.sciIntrinsic as number,
      klein1: b.klein1 as number,
      klein2: b.klein2 as number,
      klein3: b.klein3 as number,
      klein4: b.klein4 as number,
      data: b.data as Record<string, unknown>,
    },
  };
}
```

- [ ] **Step 4: Прогнать — убедиться, что всё зелёное**

```bash
npm test -- goalPlan.test.ts
```

Ожидаемо: все тесты passing (8 старых + ~11 новых кейсов).

- [ ] **Step 5: Коммит**

```bash
git add src/lib/goalPlan.ts src/lib/__tests__/goalPlan.test.ts
git commit -m "feat(lib): validateGoalPlanPayload + тесты (#EPIC_ISSUE)"
```

---

## Task 4: API — GET /api/goal-plans/me + DELETE

**Files:**
- Create: `src/app/api/goal-plans/me/route.ts`

- [ ] **Step 1: Создать handler**

`src/app/api/goal-plans/me/route.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);

  if (rows.length === 0) {
    return Response.json(null);
  }

  const plan = rows[0];
  return Response.json({
    ...plan,
    data: JSON.parse(plan.data),
  });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  await db.delete(goalPlans).where(eq(goalPlans.memberId, user.id));
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 2: Билд + smoke-тест через curl**

```bash
npm run build 2>&1 | tail -5
# сервер должен уже крутиться; если нет — npm run dev в другом окне
curl -s -b "lumm_token=$(sqlite3 data/lumm.db 'SELECT ...')" ... 
```

Для полноценного теста: открыть `https://lumm.space/api/goal-plans/me` в браузере под admin-сессией — должно вернуть `null` (целей пока нет).

- [ ] **Step 3: Коммит**

```bash
git add src/app/api/goal-plans/me/route.ts
git commit -m "feat(api): GET + DELETE /api/goal-plans/me (#EPIC_ISSUE)"
```

---

## Task 5: API — POST /api/goal-plans (upsert)

**Files:**
- Create: `src/app/api/goal-plans/route.ts`

- [ ] **Step 1: Создать handler**

`src/app/api/goal-plans/route.ts`:

```typescript
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { computeKleinAvg, computeSciScore, validateGoalPlanPayload } from "@/lib/goalPlan";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = validateGoalPlanPayload(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  // Проверка на locked (на будущее — в MVP всегда 0)
  const existing = await db
    .select({ id: goalPlans.id, locked: goalPlans.locked })
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);

  if (existing.length > 0 && existing[0].locked === 1) {
    return Response.json(
      { error: "Цель зафиксирована на цикл, редактирование запрещено" },
      { status: 409 },
    );
  }

  const v = result.value;
  const now = new Date().toISOString();
  const sciScore = computeSciScore(v);
  const kleinAvg = computeKleinAvg(v);

  const id = existing.length > 0 ? existing[0].id : randomUUID();

  if (existing.length > 0) {
    await db
      .update(goalPlans)
      .set({
        wish: v.wish,
        sphere: v.sphere,
        sciScore,
        kleinAvg,
        difficulty: v.difficulty,
        metricName: v.metricName,
        metricStart: v.metricStart,
        metricTarget: v.metricTarget,
        data: JSON.stringify(v.data),
        updatedAt: now,
      })
      .where(eq(goalPlans.memberId, user.id));
  } else {
    await db.insert(goalPlans).values({
      id,
      memberId: user.id,
      wish: v.wish,
      sphere: v.sphere,
      sciScore,
      kleinAvg,
      difficulty: v.difficulty,
      metricName: v.metricName,
      metricStart: v.metricStart,
      metricTarget: v.metricTarget,
      data: JSON.stringify(v.data),
      locked: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return Response.json({ id });
}
```

- [ ] **Step 2: Билд**

```bash
npm run build 2>&1 | tail -5
```

Ожидаемо: успешный билд.

- [ ] **Step 3: Smoke-тест через браузер / curl**

В dev-режиме POST-нуть валидный payload и проверить, что запись создалась:

```bash
sqlite3 data/lumm.db "SELECT id, wish, sci_score, klein_avg FROM goal_plans;"
```

Проверить, что перезапись работает — второй POST с тем же memberId обновляет запись (updatedAt меняется, createdAt не меняется).

- [ ] **Step 4: Коммит**

```bash
git add src/app/api/goal-plans/route.ts
git commit -m "feat(api): POST /api/goal-plans — upsert (#EPIC_ISSUE)"
```

---

## Task 6: API — GET /api/goal-plans/[memberId]

**Files:**
- Create: `src/app/api/goal-plans/[memberId]/route.ts`

- [ ] **Step 1: Создать handler с group-фильтром**

`src/app/api/goal-plans/[memberId]/route.ts`:

```typescript
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Нет сессии" }, { status: 401 });
  }

  const { memberId } = await params;

  // Проверяем, что target в той же группе (как /api/members/[id])
  const memberRow = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, user.groupId)))
    .limit(1);

  if (memberRow.length === 0) {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(goalPlans)
    .where(eq(goalPlans.memberId, memberId))
    .limit(1);

  if (rows.length === 0) {
    return Response.json(null);
  }

  const plan = rows[0];
  return Response.json({
    ...plan,
    data: JSON.parse(plan.data),
  });
}
```

- [ ] **Step 2: Билд**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Коммит**

```bash
git add src/app/api/goal-plans/[memberId]/route.ts
git commit -m "feat(api): GET /api/goal-plans/[memberId] с group-фильтром (#EPIC_ISSUE)"
```

---

## Task 7: CSS — переливающаяся кнопка

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Найти подходящее место и добавить анимацию**

В `src/app/globals.css` в конец добавить:

```css
@keyframes lumm-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.btn-shimmer {
  background-image: linear-gradient(
    90deg,
    var(--lumm-gold) 0%,
    var(--lumm-gold-light) 50%,
    var(--lumm-gold) 100%
  );
  background-size: 200% 100%;
  animation: lumm-shimmer 2.4s linear infinite;
  color: var(--lumm-dark);
}

@media (prefers-reduced-motion: reduce) {
  .btn-shimmer {
    animation: none;
    background-image: none;
    background-color: var(--lumm-gold);
  }
}
```

- [ ] **Step 2: Билд**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Коммит**

```bash
git add src/app/globals.css
git commit -m "feat(ui): CSS-анимация .btn-shimmer (#EPIC_ISSUE)"
```

---

## Task 8: ShimmerButton — reusable компонент

**Files:**
- Create: `src/app/(main)/goal/_components/ShimmerButton.tsx`

- [ ] **Step 1: Создать компонент**

`src/app/(main)/goal/_components/ShimmerButton.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function ShimmerButton({ href, children, variant = "primary" }: Props) {
  if (variant === "secondary") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-lumm-gold/40 text-lumm-gold hover:bg-lumm-gold/10 transition-colors font-medium"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="btn-shimmer inline-flex items-center gap-2 px-7 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/\(main\)/goal/_components/ShimmerButton.tsx
git commit -m "feat(ui): ShimmerButton — переливающаяся CTA (#EPIC_ISSUE)"
```

---

## Task 9: Лендинг /goal — server component, 8 секций

**Files:**
- Create: `src/app/(main)/goal/page.tsx`

- [ ] **Step 1: Создать server-компонент лендинга**

`src/app/(main)/goal/page.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ShimmerButton } from "./_components/ShimmerButton";

export const dynamic = "force-dynamic";

export default async function GoalLandingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await db
    .select({ id: goalPlans.id })
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);
  const hasGoal = existing.length > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-16">
      {/* 1. Hero */}
      <section className="space-y-6">
        <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">
          LUMM × Wombo Combo
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight text-lumm-text-primary">
          Цель на 12 недель.<br/>По системе, которую не стыдно защищать
        </h1>
        <p className="text-xl text-lumm-text-secondary max-w-2xl leading-relaxed">
          4 научно подтверждённых метода в одном шаблоне: WOOP, HARD, 12 Week Year
          и две психометрические шкалы качества.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          {hasGoal ? (
            <>
              <ShimmerButton href="/goal/my">Открыть мою цель</ShimmerButton>
              <ShimmerButton href="/goal/new" variant="secondary">Заполнить заново</ShimmerButton>
            </>
          ) : (
            <ShimmerButton href="/goal/new">Начать заполнение</ShimmerButton>
          )}
        </div>
        <p className="text-xs text-lumm-text-secondary pt-1">
          Шаблон v1 · внутренний инструмент LUMM · 45–90 минут вдумчивой работы (можно прервать и вернуться)
        </p>
      </section>

      {/* 2. Почему большинство целей не доживают */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">
          Почему большинство целей не доживают до конца цикла
        </h2>
        <p className="text-lumm-text-secondary">
          Проблема не в дисциплине. В момент постановки цель уже содержит пару дефектов,
          которые на старте не видно, а через 4 недели они взрывают весь план.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["Цель не своя", "Идёт из «надо», стыда, ожиданий других. Внешняя мотивация даёт импульс, но разваливается в первый же тяжёлый момент."],
            ["Не то препятствие", "«Нет времени», «клиенты не платят» — это следствия. Настоящее препятствие почти всегда внутри: эмоция, привычка, убеждение, состояние."],
            ["Нет эмоциональной тяги", "Сухие SMART-формулировки не активируют внутреннюю картину. Цель тянет тебя первую неделю, потом гаснет."],
            ["Годовое планирование поощряет откладывание", "Горизонт 365 дней включает режим «ещё есть время». 12 недель — нет, не есть."],
          ].map(([title, text]) => (
            <div key={title} className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
              <h3 className="font-semibold text-lumm-gold mb-2">{title}</h3>
              <p className="text-sm text-lumm-text-secondary leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Почему готовые фреймворки не подходят */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">
          Почему готовые фреймворки не подходят мастермайнду
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-lumm-text-secondary">
          <p><strong className="text-lumm-text-primary">SMART (1981).</strong> Корпоративный инструмент. Буква «Achievable» прямо противоречит классической теории Локка/Латама — специфичные + трудные цели работают лучше достижимых. Ничего не говорит про мотивацию, препятствия и самосогласованность.</p>
          <p><strong className="text-lumm-text-primary">OKR.</strong> Блестяще работает в организациях с вертикальным alignment. В мастермайнде нет корпоративной стратегии, нечего каскадировать.</p>
          <p><strong className="text-lumm-text-primary">GROW.</strong> Отличная методика коучинга, но требует компетентного коуча в каждой сессии. В peer-группе такого ресурса нет.</p>
          <p><strong className="text-lumm-text-primary">Vision Boards.</strong> Чистая позитивная визуализация снижает мотивацию (Oettingen 2002, JPSP): мозг получает дофаминовое вознаграждение от воображения успеха.</p>
          <p><strong className="text-lumm-text-primary">HARD Goals в чистом виде.</strong> Сильная эмоциональная валидация, но без операционализации — улучшенный vision board.</p>
          <p><strong className="text-lumm-text-primary">12 Week Year в чистом виде.</strong> Отличный скелет каденции, но без психометрии на входе и эмоционального слоя.</p>
        </div>
      </section>

      {/* 4. Архитектура системы: 4 слоя */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">
          Архитектура: 4 слоя
        </h2>
        <div className="space-y-3">
          {[
            ["1. Годовой ориентир", "Одно предложение на 12 месяцев. Не метрика, направление. 4 цикла обслуживают его."],
            ["2. Эмоциональная тяга (HARD + SCI)", "Heartfelt · Animated · Required · Difficult. Плюс шкала самосогласованности Sheldon-Elliot — фильтр против «навязанных» целей."],
            ["3. Операционализация (WOOP)", "Wish → Outcome → Obstacle → Plan. Мета-анализ Gollwitzer & Sheeran (2006): 94 исследования, 8000+ участников, эффект d=0.65."],
            ["4. Дисциплина исполнения (12 Week Year)", "12-недельный цикл, еженедельный отчёт с процентом выполнения и уверенностью 1–10, 85% target, промежуточные встречи на 4-й и 8-й неделях."],
          ].map(([title, text]) => (
            <div key={title} className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-6">
              <h3 className="font-semibold text-lumm-gold mb-1">{title}</h3>
              <p className="text-sm text-lumm-text-secondary leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Проверка качества 5+5 */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">
          Проверка качества на входе: 5 + 5
        </h2>
        <p className="text-lumm-text-secondary">
          Перед тем как цель попадает в цикл, она проходит 10-пунктовую проверку. Для защиты
          в группе — 5 базовых зелёных обязательны + минимум 3 из 5 углублённых.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <h3 className="font-semibold text-lumm-text-primary mb-3">5 базовых</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Конкретность</li>
              <li>Измеримость</li>
              <li>Срок с контрольными точками</li>
              <li>Амбиция (сложность 5–8 из 10)</li>
              <li>Регулярный разбор встроен</li>
            </ul>
          </div>
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <h3 className="font-semibold text-lumm-text-primary mb-3">5 углублённых</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Самосогласованность (шкала Sheldon-Elliot, SCI)</li>
              <li>Приверженность (шкала Klein, K.U.T.)</li>
              <li>План «когда — тогда» заполнен (мин. 2)</li>
              <li>Препятствие сформулировано как внутреннее</li>
              <li>Согласованность с остальной жизнью</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Научная база */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Научная база</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lumm-gray-light">
                <th className="text-left py-2 text-lumm-text-secondary font-medium">Элемент</th>
                <th className="text-left py-2 text-lumm-text-secondary font-medium">Источник</th>
                <th className="text-left py-2 text-lumm-text-secondary font-medium">Эффект</th>
              </tr>
            </thead>
            <tbody className="text-lumm-text-primary">
              {[
                ["Implementation intentions (WOOP-план)", "Gollwitzer & Sheeran, 2006", "d = 0.65"],
                ["Mental contrasting (сам метод WOOP)", "Wang, Wang & Gai, 2021", "g = 0.34"],
                ["Specific-difficult goals", "Locke & Latham, 2002", "d = 0.42–0.80"],
                ["Self-concordance → attainment", "Sheldon & Elliot, 1999", "β ≈ 0.25–0.30"],
                ["Goal commitment × performance", "Klein et al., 1999", "ρ = 0.23"],
                ["Group goal-setting", "Kleingeld et al., 2011", "d ≈ 0.80"],
                ["Feedback", "Hattie, Visible Learning, 2009", "d ≈ 0.70"],
              ].map(([e, s, r]) => (
                <tr key={e} className="border-b border-lumm-gray-light/40">
                  <td className="py-2 pr-4">{e}</td>
                  <td className="py-2 pr-4 text-lumm-text-secondary">{s}</td>
                  <td className="py-2 text-lumm-gold font-mono">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Кому подойдёт / кому нет */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Кому подойдёт / кому нет</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-green-500/30 rounded-xl p-6">
            <h3 className="font-semibold text-green-400 mb-3">Подойдёт</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Мастермайнд-группы 4–6 человек с peer-accountability</li>
              <li>Предприниматели, пробовавшие SMART/OKR и чувствующие недостаток</li>
              <li>Если цель соединяет бизнес, здоровье и личное развитие</li>
              <li>Кто ценит научную базу за практичностью</li>
            </ul>
          </div>
          <div className="bg-lumm-black border border-red-500/30 rounded-xl p-6">
            <h3 className="font-semibold text-red-400 mb-3">Не подойдёт</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Корпоративные команды с вертикальным alignment — нужен OKR</li>
              <li>Кто хочет «простое за 5 минут» — заполнение 45–90 минут</li>
              <li>Клиенты индивидуального коучинга — GROW с коучем</li>
              <li>Кто в принципе не хочет работать с препятствиями</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 8. Возражения */}
      <section className="space-y-4">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Частые возражения</h2>
        {[
          ["SMART же работает у меня много лет", "Если цели регулярно достигаются — не меняй ничего. По опросу Mooncamp 2024 только 8% доходят до целей, поставленных в начале года. Если иногда попадаешь в эти 92% — возможно, это дефект методологии, не дисциплины."],
          ["Слишком сложно", "Заполнение — один раз в 12 недель. Еженедельный отчёт — 3–5 минут. SCI и Klein считаются автоматически, ты двигаешь слайдеры."],
          ["Я уже использую OKR", "Отлично. OKR — корпоративная методика, эта — личная. Дополняют друг друга: OKR на работе, это — в мастермайнде и для личных целей."],
          ["А как же визуализация?", "В системе есть шаг «картина успеха» — ты описываешь конкретный момент через 12 недель с сенсорной детализацией. Это часть методологии MCII с доказанной эффективностью. Разница: мы не останавливаемся на картине, а сразу идём к препятствиям и плану."],
        ].map(([q, a]) => (
          <details key={q} className="bg-lumm-black border border-lumm-gray-light rounded-xl">
            <summary className="p-5 cursor-pointer font-medium text-lumm-text-primary hover:bg-lumm-gray-light/20 transition-colors">
              {q}
            </summary>
            <div className="px-5 pb-5 text-sm text-lumm-text-secondary leading-relaxed">
              {a}
            </div>
          </details>
        ))}
      </section>

      {/* Финальная CTA */}
      <section className="text-center space-y-4 pt-8 pb-4">
        {hasGoal ? (
          <>
            <ShimmerButton href="/goal/my">Открыть мою цель</ShimmerButton>
            <div>
              <ShimmerButton href="/goal/new" variant="secondary">Заполнить заново</ShimmerButton>
            </div>
          </>
        ) : (
          <ShimmerButton href="/goal/new">Начать заполнение</ShimmerButton>
        )}
        <p className="text-xs text-lumm-text-secondary">
          Данные хранятся в твоём профиле LUMM. Не передаются третьим сторонам.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Билд + открыть в браузере**

```bash
npm run build 2>&1 | tail -5
```

Зайти на `https://lumm.space/goal` (dev или prod после deploy) — проверить, что все секции рендерятся, аккордеоны работают, кнопка переливается.

- [ ] **Step 3: Коммит**

```bash
git add "src/app/(main)/goal/page.tsx"
git commit -m "feat(goal): лендинг /goal — 8 секций (#EPIC_ISSUE)"
```

---

## Task 10: GoalView — shared presentational + /goal/my

**Files:**
- Create: `src/app/(main)/goal/_components/GoalView.tsx`
- Create: `src/app/(main)/goal/my/page.tsx`
- Create: `src/app/(main)/goal/my/GoalViewActions.tsx`

- [ ] **Step 1: Создать `GoalView.tsx` — презентационный компонент**

`src/app/(main)/goal/_components/GoalView.tsx`:

```tsx
import type { ReactNode } from "react";

type GoalPlan = {
  id: string;
  memberId: string;
  wish: string;
  sphere: string;
  sciScore: number;
  kleinAvg: number;
  difficulty: number;
  metricName: string | null;
  metricStart: string | null;
  metricTarget: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SPHERE_LABELS: Record<string, string> = {
  business: "Бизнес и деньги",
  health: "Здоровье и спорт",
  skills: "Навыки и обучение",
  family: "Семья и отношения",
  creative: "Творчество",
  finance: "Финансы",
};

const OBSTACLE_LABELS: Record<string, string> = {
  emotion: "Эмоция",
  habit: "Привычка",
  belief: "Убеждение",
  state: "Состояние",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-lumm-text-secondary">{label}</div>
      <div className="text-sm text-lumm-text-primary whitespace-pre-wrap">{children || <span className="text-lumm-text-secondary">—</span>}</div>
    </div>
  );
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asArr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function GoalView({ plan, actions }: { plan: GoalPlan; actions?: ReactNode }) {
  const d = plan.data;

  const ifThen = asArr<{ when: string; then: string }>(d.ifThen).filter((p) => p.when || p.then);
  const leadActions = asArr<{ name: string; freq: string }>(d.leadActions).filter((a) => a.name);
  const nonGoals = asArr<string>(d.nonGoals).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      {/* Hero: wish + ключевые бейджи */}
      <section className="space-y-4">
        <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">
          LUMM × Wombo Combo
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-lumm-text-primary leading-tight">
          {plan.wish}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/30">
            {SPHERE_LABELS[plan.sphere] ?? plan.sphere}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-lumm-gray border border-lumm-gray-light text-lumm-text-primary">
            Сложность {plan.difficulty}/10
          </span>
          <span className={`px-3 py-1 rounded-full text-xs border ${
            plan.sciScore >= 8 ? "bg-green-500/10 text-green-400 border-green-500/30" :
            plan.sciScore >= 3 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
            "bg-red-500/10 text-red-400 border-red-500/30"
          }`}>
            SCI: {plan.sciScore > 0 ? "+" : ""}{plan.sciScore}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs border ${
            plan.kleinAvg >= 4.5 ? "bg-green-500/10 text-green-400 border-green-500/30" :
            plan.kleinAvg >= 3.5 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
            "bg-red-500/10 text-red-400 border-red-500/30"
          }`}>
            Klein: {plan.kleinAvg.toFixed(1)}/5
          </span>
        </div>
        {actions && <div className="pt-2">{actions}</div>}
      </section>

      {/* Годовой контекст */}
      {(asStr(d.annualGoal) || d.cyclePosition) && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Годовой контекст</h2>
          {asStr(d.annualGoal) && <Field label="Годовой ориентир">{asStr(d.annualGoal)}</Field>}
          {typeof d.cyclePosition === "number" && d.cyclePosition > 0 && (
            <Field label="Позиция">Цикл {d.cyclePosition} из 4</Field>
          )}
          {asStr(d.annualServing) && <Field label="Чем этот цикл служит году">{asStr(d.annualServing)}</Field>}
        </section>
      )}

      {/* Метрика */}
      {plan.metricName && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Метрика результата</h2>
          <Field label="Что измеряем">{plan.metricName}</Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Старт">{plan.metricStart}</Field>
            <Field label="Цель (12 неделя)">{plan.metricTarget}</Field>
          </div>
        </section>
      )}

      {/* Эмоциональная тяга */}
      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Эмоциональная тяга</h2>
        <Field label="Почему это важно">{asStr(d.internalReason)}</Field>
        <Field label="Если никто не узнает — хотел бы?">{asStr(d.hiddenTest)}</Field>
        <Field label="Картина успеха через 12 недель">{asStr(d.successScene)}</Field>
        <Field label="Цена бездействия">{asStr(d.costOfInaction)}</Field>
      </section>

      {/* WOOP */}
      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Препятствия и план</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Что увидят снаружи">{asStr(d.outcomeExternal)}</Field>
          <Field label="Что почувствую внутри">{asStr(d.outcomeInternal)}</Field>
        </div>
        <Field label="Тип препятствия">
          {OBSTACLE_LABELS[asStr(d.obstacleType)] ?? ""}
        </Field>
        <Field label="Главное препятствие">{asStr(d.primaryObstacle)}</Field>
        {asStr(d.secondaryObstacle) && <Field label="Второе по силе">{asStr(d.secondaryObstacle)}</Field>}

        {ifThen.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-lumm-text-secondary">План «когда — тогда»</div>
            {ifThen.map((p, i) => (
              <div key={i} className="text-sm text-lumm-text-primary">
                <span className="text-lumm-gold">Когда</span> {p.when} — <span className="text-lumm-gold">тогда</span> {p.then}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* План на 12 недель */}
      {(leadActions.length > 0 || asStr(d.milestone14)) && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-lumm-text-primary">План на 12 недель</h2>
          {leadActions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-lumm-text-secondary">Ведущие действия</div>
              {leadActions.map((a, i) => (
                <div key={i} className="text-sm text-lumm-text-primary">
                  {a.name} — <span className="text-lumm-text-secondary">{a.freq}</span>
                </div>
              ))}
            </div>
          )}
          {asStr(d.milestone14) && <Field label="Недели 1–4">{asStr(d.milestone14)}</Field>}
          {asStr(d.milestone58) && <Field label="Недели 5–8">{asStr(d.milestone58)}</Field>}
          {asStr(d.milestone912) && <Field label="Недели 9–12">{asStr(d.milestone912)}</Field>}
        </section>
      )}

      {/* Запреты */}
      {nonGoals.length > 0 && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Что я НЕ жертвую</h2>
          <ul className="list-decimal list-inside space-y-1 text-sm text-lumm-text-primary">
            {nonGoals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

export type { GoalPlan };
```

- [ ] **Step 2: Создать кнопки-действия для своей цели**

`src/app/(main)/goal/my/GoalViewActions.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function GoalViewActions() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Удалить структурную цель? Это действие нельзя отменить.")) return;
    setDeleting(true);
    const res = await fetch("/api/goal-plans/me", { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/goal");
      router.refresh();
    } else {
      alert("Не удалось удалить цель");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/goal/new?edit=1"
        className="px-5 py-2.5 rounded-lg bg-lumm-gold text-lumm-dark font-medium hover:bg-lumm-gold-light transition-colors"
      >
        Уточнить формулировку
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-5 py-2.5 rounded-lg bg-lumm-gray border border-lumm-gray-light text-red-400 hover:bg-lumm-gray-light transition-colors disabled:opacity-50"
      >
        {deleting ? "Удаление..." : "Отказаться от цели"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Создать server-страницу `/goal/my`**

`src/app/(main)/goal/my/page.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GoalView } from "../_components/GoalView";
import { GoalViewActions } from "./GoalViewActions";

export const dynamic = "force-dynamic";

export default async function MyGoalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db.select().from(goalPlans).where(eq(goalPlans.memberId, user.id)).limit(1);
  if (rows.length === 0) {
    redirect("/goal");
  }

  const plan = {
    ...rows[0],
    data: JSON.parse(rows[0].data),
  };

  return <GoalView plan={plan} actions={<GoalViewActions />} />;
}
```

- [ ] **Step 4: Билд**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Коммит**

```bash
git add "src/app/(main)/goal/_components/GoalView.tsx" "src/app/(main)/goal/my/"
git commit -m "feat(goal): /goal/my — свой просмотр с edit/delete (#EPIC_ISSUE)"
```

---

## Task 11: /goal/[memberId] — чужой просмотр

**Files:**
- Create: `src/app/(main)/goal/[memberId]/page.tsx`

- [ ] **Step 1: Создать страницу**

`src/app/(main)/goal/[memberId]/page.tsx`:

```tsx
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { goalPlans, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GoalView } from "../_components/GoalView";

export const dynamic = "force-dynamic";

export default async function OtherGoalPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { memberId } = await params;

  if (memberId === user.id) {
    redirect("/goal/my");
  }

  // Подтверждаем, что member в той же группе — не утекаем факт существования
  const memberRows = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, user.groupId)))
    .limit(1);

  if (memberRows.length === 0) notFound();

  const planRows = await db.select().from(goalPlans).where(eq(goalPlans.memberId, memberId)).limit(1);
  if (planRows.length === 0) notFound();

  const plan = {
    ...planRows[0],
    data: JSON.parse(planRows[0].data),
  };

  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <Link
          href={`/members/${memberId}`}
          className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
        >
          ← Назад к {memberRows[0].displayName}
        </Link>
      </div>
      <GoalView plan={plan} />
    </div>
  );
}
```

- [ ] **Step 2: Билд**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Коммит**

```bash
git add "src/app/(main)/goal/[memberId]/"
git commit -m "feat(goal): /goal/[memberId] — публичный просмотр (#EPIC_ISSUE)"
```

---

## Task 12: Layout мастера + server page (route-group `(goal-wizard)`)

**Files:**
- Create: `src/app/(goal-wizard)/goal/new/layout.tsx`
- Create: `src/app/(goal-wizard)/goal/new/page.tsx`

**Почему route-group:** `(main)/layout.tsx` рендерит сайдбар для всех страниц внутри. Nested layouts в Next.js App Router **не перекрывают** родительский — они стакаются. Чтобы реально убрать сайдбар для мастера, нужен layout в отдельной route-группе на уровне `src/app/`. Группа `(goal-wizard)` — сиблинг `(main)`, URL остаётся `/goal/new` (скобочные группы не влияют на путь).

Лендинг `/goal` остаётся в `(main)/goal/page.tsx` — там сайдбар нужен.

- [ ] **Step 1: Layout с editorial-шрифтами и cream-фоном**

Создать `src/app/(goal-wizard)/goal/new/layout.tsx`:

```tsx
import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";

const fraunces = Fraunces({
  subsets: ["latin", "cyrillic"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export default function GoalNewLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${manrope.variable} min-h-screen`}
      style={{ background: "#F5EFE6", color: "#1F1A16" }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Server-страница с pre-fill из `/api/goal-plans/me`**

`src/app/(goal-wizard)/goal/new/page.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GoalWizard } from "./GoalWizard";

export const dynamic = "force-dynamic";

export default async function GoalNewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db.select().from(goalPlans).where(eq(goalPlans.memberId, user.id)).limit(1);

  const initial = rows.length === 0 ? null : {
    wish: rows[0].wish,
    sphere: rows[0].sphere,
    sciScore: rows[0].sciScore,
    kleinAvg: rows[0].kleinAvg,
    difficulty: rows[0].difficulty,
    metricName: rows[0].metricName,
    metricStart: rows[0].metricStart,
    metricTarget: rows[0].metricTarget,
    data: JSON.parse(rows[0].data),
  };

  return <GoalWizard memberId={user.id} memberName={user.displayName} initial={initial} />;
}
```

- [ ] **Step 3: Shell-компонент мастера (минимальный) для проверки layout**

Создать stub `src/app/(goal-wizard)/goal/new/GoalWizard.tsx` — в Task 13 заменим полноценно:

```tsx
"use client";

type Props = {
  memberId: string;
  memberName: string;
  initial: unknown;
};

export function GoalWizard({ memberName }: Props) {
  return (
    <div className="max-w-3xl mx-auto p-8 font-sans">
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
        Цель на 12 недель
      </h1>
      <p className="mt-2">Привет, {memberName}. Мастер будет тут.</p>
    </div>
  );
}
```

- [ ] **Step 4: Билд + визуальная проверка**

```bash
npm run build 2>&1 | tail -5
```

Открыть `/goal/new` в браузере. Ожидается:
- Cream-фон (`#F5EFE6`) занимает всю ширину экрана — сайдбар LUMM не рендерится (route-group `(goal-wizard)` изолирует от `(main)/layout.tsx`).
- Fraunces применяется к заголовку (через `var(--font-fraunces)`).

Если сайдбар всё-таки виден — значит путь ошибочен. Проверить, что файлы лежат ровно в `src/app/(goal-wizard)/goal/new/`, а не в `src/app/(main)/goal/new/`.

- [ ] **Step 5: Коммит**

```bash
git add "src/app/(goal-wizard)/goal/new/layout.tsx" "src/app/(goal-wizard)/goal/new/page.tsx" "src/app/(goal-wizard)/goal/new/GoalWizard.tsx"
git commit -m "feat(goal): layout /goal/new (route-group) + shell GoalWizard (#EPIC_ISSUE)"
```

---

## Task 13: GoalWizard — порт мастера из артефакта

Это большая задача (~1000 LOC). Разбита на подшаги.

**Files:**
- Modify (полная замена): `src/app/(goal-wizard)/goal/new/GoalWizard.tsx`

- [ ] **Step 1: Скопировать тело артефакта в `GoalWizard.tsx`**

Взять контент из `lumm_goal_template.jsx` (вложение пользователя) и положить целиком в `src/app/(goal-wizard)/goal/new/GoalWizard.tsx` **с адаптациями**:

1. Директива `"use client"` в первой строке.
2. Убрать `export default function LummGoalTemplate()` → `export function GoalWizard(props: Props)`.
3. Убрать из `fontImports` блок `@import url('https://fonts.googleapis.com/...')` и правила `body { font-family: 'Manrope' ... }`, `.font-display { font-family: 'Fraunces' ... }`, `.font-body { font-family: 'Manrope' ... }` — шрифты приходят из next/font в layout. Взамен добавить внутри оставшегося `<style>{wizardStyles}</style>` правила:
   ```css
   .font-display { font-family: var(--font-fraunces), Georgia, serif; font-optical-sizing: auto; }
   .font-body   { font-family: var(--font-manrope), system-ui, sans-serif; }
   ```
   Остальные блоки (`.step-enter`, `@keyframes stepEnter`, `.slider-track`, `::selection`, `.checkbox-custom`) — **оставить без изменений**, они нужны для интерактива.
4. Добавить `type Props` в начало файла:
   ```tsx
   type Props = {
     memberId: string;
     memberName: string;
     initial: {
       wish: string;
       sphere: string;
       difficulty: number;
       metricName: string | null;
       metricStart: string | null;
       metricTarget: string | null;
       data: Record<string, unknown>;
     } | null;
   };
   ```
6. В `useState(emptyData)` заменить на merge initial → emptyData:
   ```tsx
   const [data, setData] = useState(() => {
     if (!props.initial) return emptyData;
     return {
       ...emptyData,
       ...(props.initial.data as typeof emptyData),
       // Дублируем ключевые поля на верхний уровень mastemind state
       wish: props.initial.wish,
       sphere: props.initial.sphere,
       difficulty: props.initial.difficulty,
       metricName: props.initial.metricName ?? "",
       metricStart: props.initial.metricStart ?? "",
       metricTarget: props.initial.metricTarget ?? "",
     };
   });
   ```

- [ ] **Step 2: Добавить автосохранение draft в localStorage**

В `GoalWizard.tsx` после объявления `const [data, setData] = useState(...)` и `const [step, setStep] = useState(0)` добавить:

```tsx
const draftKey = `lumm.goal-draft.${props.memberId}`;

// Загрузить draft при mount (если initial пустой)
useEffect(() => {
  if (props.initial) return; // при edit-flow приоритет у initial из сервера
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.step === "number") setStep(parsed.step);
      if (parsed.data && typeof parsed.data === "object") {
        setData({ ...emptyData, ...parsed.data });
      }
    }
  } catch {
    /* битый draft — игнор */
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Сохранять draft при каждом изменении (debounce 500ms)
useEffect(() => {
  const t = setTimeout(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ step, data }));
    } catch {
      /* QuotaExceeded — игнор */
    }
  }, 500);
  return () => clearTimeout(t);
}, [step, data, draftKey]);
```

Импорты: добавить `useEffect` к существующему `useState`.

- [ ] **Step 3: Заменить кнопки «Скопировать/Распечатать» в Step7 на **«Сохранить и посмотреть»**, «Скопировать markdown», «Распечатать»**

В функции `Step7` найти блок `<div className="flex flex-col md:flex-row gap-3">` с двумя кнопками и заменить:

```tsx
const [saving, setSaving] = useState(false);
const [saveErr, setSaveErr] = useState<string | null>(null);

const handleSave = async () => {
  // Если quality не зелёный — подтверждение
  if (!readyToPresent) {
    if (!window.confirm("Цель пока не прошла проверку качества. Сохранить всё равно?")) return;
  }

  setSaving(true);
  setSaveErr(null);

  const payload = {
    wish: data.wish,
    sphere: data.sphere,
    difficulty: data.difficulty,
    metricName: data.metricName || null,
    metricStart: data.metricStart || null,
    metricTarget: data.metricTarget || null,
    sciShame: data.sciShame,
    sciExternal: data.sciExternal,
    sciIdentified: data.sciIdentified,
    sciIntrinsic: data.sciIntrinsic,
    klein1: data.klein1,
    klein2: data.klein2,
    klein3: data.klein3,
    klein4: data.klein4,
    data: {
      name: data.name,
      cycleStart: data.cycleStart,
      partner: data.partner,
      annualGoal: data.annualGoal,
      cyclePosition: data.cyclePosition,
      annualServing: data.annualServing,
      plannedArc: data.plannedArc,
      sphereReason: data.sphereReason,
      baseline: data.baseline,
      internalReason: data.internalReason,
      hiddenTest: data.hiddenTest,
      successScene: data.successScene,
      costOfInaction: data.costOfInaction,
      newSkills: data.newSkills,
      outcomeExternal: data.outcomeExternal,
      outcomeInternal: data.outcomeInternal,
      primaryObstacle: data.primaryObstacle,
      secondaryObstacle: data.secondaryObstacle,
      obstacleType: data.obstacleType,
      ifThen: data.ifThen,
      leadActions: data.leadActions,
      milestone14: data.milestone14,
      milestone58: data.milestone58,
      milestone912: data.milestone912,
      coherenceLong: data.coherenceLong,
      coherenceWide: data.coherenceWide,
      nonGoals: data.nonGoals,
      confirm: data.confirm,
    },
  };

  const res = await fetch("/api/goal-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    // Очищаем draft
    try { localStorage.removeItem(`lumm.goal-draft.${memberId}`); } catch { /* ok */ }
    window.location.href = "/goal/my";
  } else {
    const err = await res.json().catch(() => ({ error: "Ошибка сохранения" }));
    setSaveErr(err.error || "Ошибка сохранения");
    setSaving(false);
  }
};
```

Параметр `memberId` пробросить вниз от `GoalWizard` в `Step7` через пропс (или через context — проще пропсом).

Кнопки на UI:

```tsx
<div className="flex flex-col md:flex-row gap-3">
  <button
    onClick={handleSave}
    disabled={saving}
    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-medium transition-all disabled:opacity-50"
    style={{ background: COLORS.text, color: COLORS.bg }}
  >
    {saving ? "Сохранение..." : "Сохранить и посмотреть"}
  </button>
  <button
    onClick={handleCopy}
    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-medium transition-all"
    style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
  >
    {copied ? <><Check className="w-4 h-4" /> Скопировано</> : <><Copy className="w-4 h-4" /> Скопировать markdown</>}
  </button>
  <button
    onClick={() => window.print()}
    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-medium transition-all"
    style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
  >
    Распечатать / PDF
  </button>
</div>
{saveErr && (
  <p className="mt-3 text-sm" style={{ color: COLORS.red }}>
    {saveErr}
  </p>
)}
```

- [ ] **Step 4: Билд**

```bash
npm run build 2>&1 | tail -30
```

Ожидаемо: билд проходит, возможно с type-warnings (шаблон был в JSX). Если TypeScript ругается на any/implicit types — добавить минимальные типы (`string`, `number`, `boolean`) где компилятор требует.

- [ ] **Step 5: Ручная проверка в браузере**

Открыть `/goal/new`:
- Пройти мастер до конца (можно наспех).
- Нажать «Сохранить и посмотреть» — редиректит на `/goal/my`.
- Открыть `/goal/my` — цель рендерится через `GoalView`.
- Вернуться на `/goal/new?edit=1` — мастер предзаполнен существующими данными.
- Закрыть вкладку посредине мастера, вернуться — draft восстановлен.
- `DELETE` через `GoalViewActions` — удаляет цель, редиректит на `/goal`.

- [ ] **Step 6: Коммит**

```bash
git add "src/app/(goal-wizard)/goal/new/GoalWizard.tsx"
git commit -m "feat(goal): полный порт мастера из артефакта + save/draft/edit (#EPIC_ISSUE)"
```

---

## Task 14: Пункт сайдбара «Цель на 12 недель»

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Добавить пункт в `activeNav`**

В `src/components/Sidebar.tsx` найти массив `activeNav` и вставить новый пункт между `feedback` и `members`:

```tsx
const activeNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/reports", label: "Еженедельные", icon: "◇" },
  { href: "/financials", label: "Ежемесячные", icon: "◈" },
  { href: "/analytics", label: "Аналитика", icon: "◈" },
  { href: "/calendar", label: "Календарь", icon: "◎" },
  { href: "/goal", label: "Цель на 12 недель", icon: "🎯", badge: "NEW" },
  { href: "/feedback", label: "Штурвал", icon: "⚓" },
  { href: "/members", label: "Участники", icon: "◐", badge: "NEW" },
  { href: "/constitution", label: "Конституция", icon: "◩" },
  { href: "/help", label: "Как это работает", icon: "?" },
];
```

- [ ] **Step 2: Билд + проверка**

```bash
npm run build 2>&1 | tail -5
```

Открыть в браузере — сайдбар показывает «🎯 Цель на 12 недель NEW», клик ведёт на `/goal`, пункт подсвечивается на активных роутах.

- [ ] **Step 3: Коммит**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(ui): пункт сайдбара «Цель на 12 недель» с NEW-бейджем (#EPIC_ISSUE)"
```

---

## Task 15: Блок в `/profile`

**Files:**
- Modify: `src/app/(main)/profile/page.tsx` — пре-загрузка наличия плана
- Modify: `src/app/(main)/profile/ProfileClient.tsx` — новый блок

- [ ] **Step 1: SSR pre-check в `page.tsx`**

Правки к `src/app/(main)/profile/page.tsx`:

```tsx
// ...существующий импорт db, feedbackItems...
import { goalPlans } from "@/db/schema";

// в default async function ProfilePage():
const planRows = await db
  .select({ id: goalPlans.id, wish: goalPlans.wish })
  .from(goalPlans)
  .where(eq(goalPlans.memberId, user.id))
  .limit(1);
const myGoalSummary = planRows.length > 0 ? { id: planRows[0].id, wish: planRows[0].wish } : null;

// Передать в <ProfileClient ... myGoalSummary={myGoalSummary} />
```

- [ ] **Step 2: В `ProfileClient.tsx` добавить пропс + блок**

В `Props`:
```tsx
myGoalSummary: { id: string; wish: string } | null;
```

В компоненте, между секцией «Мои цели» (form с businessGoal/sportGoal) и секцией «Мой штурвал», добавить:

```tsx
<section className="bg-lumm-black border border-lumm-gold/30 rounded-xl p-6 space-y-3 relative overflow-hidden">
  <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] uppercase tracking-wider bg-lumm-gold text-lumm-dark rounded font-bold">NEW</div>
  <h2 className="text-lg font-semibold text-lumm-text-primary">LUMM Goal System <span className="text-lumm-text-secondary font-normal">· Wombo Combo</span></h2>
  {initial.myGoalSummary ? (
    <>
      <p className="text-sm text-lumm-text-secondary leading-relaxed">
        Твоя структурная цель:
      </p>
      <p className="text-base text-lumm-text-primary leading-snug">
        {initial.myGoalSummary.wish}
      </p>
      <a
        href="/goal/my"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lumm-gold text-lumm-dark font-medium hover:bg-lumm-gold-light transition-colors text-sm"
      >
        Открыть мою цель
      </a>
    </>
  ) : (
    <>
      <p className="text-sm text-lumm-text-secondary leading-relaxed">
        Серьёзная постановка цели на 12 недель — WOOP, HARD, 12 Week Year и две психометрические шкалы качества в одном шаблоне.
      </p>
      <a
        href="/goal"
        className="btn-shimmer inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm"
      >
        Узнать и попробовать
      </a>
    </>
  )}
</section>
```

Не забыть: `myGoalSummary` нужно включить в `initial` или передать отдельным пропсом. Проще — отдельным пропсом (как `mySteering`):

```tsx
type Props = {
  initial: { /* ... как было ... */ };
  mySteering: MyFeedback[];
  myGoalSummary: { id: string; wish: string } | null;
};
```

И в `ProfilePage`:
```tsx
<ProfileClient
  initial={{ ...существующее }}
  mySteering={mySteering}
  myGoalSummary={myGoalSummary}
/>
```

Тогда в JSX использовать `myGoalSummary`, не `initial.myGoalSummary`.

- [ ] **Step 3: Билд + визуальная проверка**

```bash
npm run build 2>&1 | tail -5
```

Открыть `/profile` — новый блок виден между «Мои цели» и «Мой штурвал». CTA «Узнать и попробовать» переливается (или «Открыть мою цель» если цель есть).

- [ ] **Step 4: Коммит**

```bash
git add "src/app/(main)/profile/"
git commit -m "feat(profile): блок LUMM Goal System с переливающейся CTA (#EPIC_ISSUE)"
```

---

## Task 16: Блок в `/members/[id]`

**Files:**
- Modify: `src/app/(main)/members/[id]/page.tsx`

- [ ] **Step 1: Загрузить план + отрисовать блок**

В `src/app/(main)/members/[id]/page.tsx` после загрузки `rows` и проверки `m` добавить:

```tsx
import { goalPlans } from "@/db/schema";
// ...

const goalRows = await db
  .select({
    id: goalPlans.id,
    wish: goalPlans.wish,
    sphere: goalPlans.sphere,
    sciScore: goalPlans.sciScore,
    kleinAvg: goalPlans.kleinAvg,
    difficulty: goalPlans.difficulty,
    metricName: goalPlans.metricName,
    metricStart: goalPlans.metricStart,
    metricTarget: goalPlans.metricTarget,
  })
  .from(goalPlans)
  .where(eq(goalPlans.memberId, id))
  .limit(1);

const goalSummary = goalRows.length > 0 ? goalRows[0] : null;
```

А в JSX после блока «Цели» (с `businessGoal`/`sportGoal`) добавить:

```tsx
{goalSummary && (
  <div className="bg-lumm-black border border-lumm-gold/30 rounded-xl p-6 space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-lumm-text-primary">Структурная цель на цикл</h2>
      <span className="text-xs uppercase tracking-wider text-lumm-gold">LUMM Goal System</span>
    </div>
    <p className="text-sm text-lumm-text-primary leading-snug">{goalSummary.wish}</p>
    {goalSummary.metricName && (
      <p className="text-xs text-lumm-text-secondary">
        {goalSummary.metricName}: {goalSummary.metricStart ?? "—"} → {goalSummary.metricTarget ?? "—"}
      </p>
    )}
    <div className="flex flex-wrap gap-2">
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-lumm-gray border border-lumm-gray-light text-lumm-text-primary">
        Сложность {goalSummary.difficulty}/10
      </span>
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/30">
        SCI: {goalSummary.sciScore > 0 ? "+" : ""}{goalSummary.sciScore}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/30">
        Klein: {goalSummary.kleinAvg.toFixed(1)}/5
      </span>
    </div>
    <Link
      href={`/goal/${id}`}
      className="inline-flex items-center gap-2 text-sm text-lumm-gold hover:underline"
    >
      Открыть полный план →
    </Link>
  </div>
)}
```

Обновить заголовок существующего блока: `<h2>Цели</h2>` → `<h2>Краткие цели</h2>` (чтобы не было путаницы с «Структурной»).

- [ ] **Step 2: Билд + визуальная проверка**

```bash
npm run build 2>&1 | tail -5
```

Для проверки нужна цель в БД хотя бы у одного member. Пройти мастер под admin, потом открыть `/members/<admin-id>` из другого аккаунта — оба блока рендерятся.

- [ ] **Step 3: Коммит**

```bash
git add "src/app/(main)/members/[id]/page.tsx"
git commit -m "feat(members): блок «Структурная цель на цикл» на /members/[id] (#EPIC_ISSUE)"
```

---

## Task 17: Раздел в `/help`

**Files:**
- Modify: `src/app/(main)/help/page.tsx`

- [ ] **Step 1: Добавить раздел**

В `src/app/(main)/help/page.tsx` в конце перечня (после «7. Штурвал») добавить:

```tsx
<section className="space-y-3">
  <h2 className="text-xl font-bold text-lumm-text-primary">8. LUMM Goal System (Wombo Combo)</h2>
  <p className="text-sm text-lumm-text-secondary leading-relaxed">
    Серьёзный путь постановки цели на 12 недель: WOOP + HARD + 12 Week Year + две психометрические шкалы качества (SCI Sheldon-Elliot и Klein). Живёт рядом с простыми «Моими целями» в профиле, не заменяет их.
  </p>
  <p className="text-sm text-lumm-text-secondary leading-relaxed">
    Как начать: в сайдбаре пункт «🎯 Цель на 12 недель», или в профиле — блок с переливающейся кнопкой. Сначала читаешь лендинг, потом проходишь мастер из 9 экранов (45–90 минут, можно прервать и вернуться — черновик автоматически сохраняется). После сохранения цель видна тебе на <code className="text-lumm-gold">/goal/my</code> и другим участникам на <code className="text-lumm-gold">/members/[id]</code>.
  </p>
  <p className="text-sm text-lumm-text-secondary leading-relaxed">
    Редактировать формулировку можно в любой момент через «Уточнить формулировку». Отказаться от цели и начать заново — «Отказаться от цели» на <code className="text-lumm-gold">/goal/my</code>.
  </p>
  <p className="text-sm text-lumm-text-secondary leading-relaxed">
    В MVP бот пока не знает про структурную цель — еженедельный анализ продолжает работать по старым полям «Бизнес-цель» и «Спортивная цель». Интеграция бота — в следующих эпиках.
  </p>
</section>
```

- [ ] **Step 2: Коммит**

```bash
git add "src/app/(main)/help/page.tsx"
git commit -m "docs(help): секция 8 про LUMM Goal System (#EPIC_ISSUE)"
```

---

## Task 18: Деплой на prod

**Files:**
- None (инфра-шаги)

- [ ] **Step 1: Создать PR и смёржить (после self-review + опционально ультрариview)**

```bash
git push -u origin epic-5-goal-system
gh pr create --title "Эпик 5: LUMM Goal System (Wombo Combo)" --body "$(cat <<'EOF'
## Summary
- Структурная цель WOOP+HARD+12WY+SCI/Klein как отдельный путь рядом с businessGoal/sportGoal
- Лендинг /goal → мастер /goal/new → /goal/my → /goal/[memberId]
- Пункт сайдбара + блоки в /profile и /members/[id]

## Test plan
- [ ] Пройти мастер как admin, проверить сохранение
- [ ] Открыть /goal/my — корректный рендер GoalView
- [ ] Открыть /goal/[adminId] из member-аккаунта — рендерится, кнопок admin нет
- [ ] `/profile` показывает блок LUMM Goal System с правильной CTA
- [ ] `/members/[id]` — блок «Структурная цель» если цель заполнена
- [ ] Draft в localStorage: закрыть мастер посредине, открыть заново — восстановлено
- [ ] `?edit=1` — pre-fill из существующей цели
- [ ] DELETE — удаляет, редиректит на /goal

Closes #EPIC_ISSUE
EOF
)"
```

- [ ] **Step 2: Бэкап прод-базы**

```bash
cp /root/lumm/data/lumm.db "/root/lumm/data/lumm.db.bak.$(date +%Y%m%d-%H%M%S)"
ls -lh /root/lumm/data/lumm.db.bak.*
```

- [ ] **Step 3: Применить миграцию на prod**

```bash
cd /root/lumm
git checkout master && git pull origin master  # после мёржа PR
sqlite3 data/lumm.db < scripts/migrations/2026-04-23-goal-plans.sql
sqlite3 data/lumm.db "SELECT name FROM sqlite_master WHERE type='table' AND name='goal_plans';"
```

Ожидаемо: `goal_plans` в списке.

- [ ] **Step 4: Билд + перезапуск сервиса**

```bash
cd /root/lumm && npm run build && systemctl restart lumm
journalctl -u lumm --no-pager -n 30
```

Ожидаемо: сервис стартует без ошибок, Next.js готов на порту.

- [ ] **Step 5: Дымовое тестирование на prod**

Открыть `https://lumm.space/goal` — рендерится лендинг. Открыть `/goal/new` — мастер стартует. Пройти одним кликом до конца, сохранить — `/goal/my` показывает результат. Вернуться в `/profile` — блок обновился.

- [ ] **Step 6: Закрыть эпик-issue + обновить карточку на доске**

```bash
gh issue close EPIC_ISSUE --comment "Смёржено в master коммитом ... . Деплой на prod выполнен, smoke test прошёл."
```

Перенести карточку на доске `https://github.com/users/ragastar/projects/2` в Done.

---

## После-задача: снятие NEW-бейджа

Через 2–3 недели после деплоя (примерно 2026-05-14) — руками убрать `badge: "NEW"` у пункта «Цель на 12 недель» в `src/components/Sidebar.tsx`. Отдельный маленький коммит `chore(ui): убрать NEW-бейдж у «Цель на 12 недель»`.

Не добавлять как отдельный Task в план — это follow-up.

# Эпик 1: Цели + активация через бота — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить поля «Бизнес-цель» и «Спортивная цель» в профиль участника, показать их на страницах `/members`, и сделать кнопку в админке, которая шлёт в групповой чат Telegram приглашение заполнить цели.

**Architecture:** Две новые nullable-колонки в `members`. API-расширения (profile PATCH, public GET, admin POST). UI-апдейты трёх страниц (`/profile`, `/members`, `/members/[id]`, `/admin/members`). Чистый модуль `src/lib/telegram.ts` с одной функцией `sendGroupMessage` на `fetch` — без grammy, без polling.

**Tech Stack:** Next.js 16 (App Router, route groups `(main)`), Drizzle ORM + better-sqlite3, Vitest, Tailwind.

**Spec:** [docs/superpowers/specs/2026-04-21-epic-1-goals-and-activation-design.md](../specs/2026-04-21-epic-1-goals-and-activation-design.md)

---

## File Structure

```
src/
  db/
    schema.ts                                  — MODIFY: +business_goal, +sport_goal на members
  lib/
    telegram.ts                                — CREATE: sendGroupMessage
    __tests__/
      telegram.test.ts                         — CREATE: unit-тесты
  app/
    api/
      auth/profile/route.ts                    — MODIFY: принимать businessGoal, sportGoal
      members/route.ts                         — MODIFY: отдавать businessGoal, sportGoal
      members/[id]/route.ts                    — MODIFY: то же
      admin/activate-goals/route.ts            — CREATE: POST, шлёт в group chat
    (main)/
      profile/
        page.tsx                               — MODIFY: прокидывает initial goals
        ProfileClient.tsx                      — MODIFY: секция "Мои цели"
      members/
        page.tsx                               — MODIFY: превью целей на карточках
        [id]/page.tsx                          — MODIFY: секция "Цели"
      admin/members/
        MembersClient.tsx                      — MODIFY: кнопка "Активировать цели"
```

Миграционный файл Drizzle сгенерируется в `./drizzle/` командой `drizzle-kit generate`.

---

### Task 1: Схема — добавить `business_goal` и `sport_goal`

В проекте исторически используется `drizzle-kit push` напрямую (папка `drizzle/` не коммитится), поэтому пропускаем `generate` и пушим сразу в SQLite.

**Files:**
- Modify: `/root/lumm/src/db/schema.ts`

- [ ] **Step 1: Добавить колонки в схеме**

В `/root/lumm/src/db/schema.ts`, внутри `members = sqliteTable(...)`, перед строкой `avatarColor:`, добавить:

```typescript
  businessGoal: text("business_goal"),
  sportGoal: text("sport_goal"),
```

- [ ] **Step 2: Запушить схему в dev-БД**

Run: `cd /root/lumm && npx drizzle-kit push`

Expected: `[✓] Changes applied`. Если drizzle-kit спрашивает про добавление колонок — ответить Yes (они nullable, данные не теряются).

- [ ] **Step 3: Убедиться, что колонки появились**

Run:
```bash
cd /root/lumm && node -e "const db=require('better-sqlite3')('./data/lumm.db',{readonly:true}); console.log(db.prepare('PRAGMA table_info(members)').all().map(c=>c.name).join(','))"
```

Expected: среди имён есть `business_goal` и `sport_goal`.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/db/schema.ts
git commit -m "feat: +business_goal, +sport_goal на members"
```

---

### Task 2: `PATCH /api/auth/profile` — принимать цели

**Files:**
- Modify: `/root/lumm/src/app/api/auth/profile/route.ts`

Текущий хэндлер принимает `displayName` и `avatarColor`. Расширяем набором `businessGoal`, `sportGoal`. Валидация: строка или null; длина ≤ 500; пустая строка → null.

- [ ] **Step 1: Обновить тип body и добавить валидацию целей**

Заменить полностью содержимое `/root/lumm/src/app/api/auth/profile/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const GOAL_MAX = 500;

type Body = {
  displayName?: string;
  avatarColor?: string;
  businessGoal?: string | null;
  sportGoal?: string | null;
};

function normalizeGoal(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const updates: Partial<typeof members.$inferInsert> = {};

  if (body.displayName !== undefined) {
    const trimmed = body.displayName.trim();
    if (trimmed.length < 2) {
      return Response.json({ error: "Никнейм должен быть минимум 2 символа" }, { status: 400 });
    }
    updates.displayName = trimmed;
  }

  if (body.avatarColor !== undefined) {
    if (!HEX_COLOR.test(body.avatarColor)) {
      return Response.json({ error: "Неверный цвет" }, { status: 400 });
    }
    updates.avatarColor = body.avatarColor;
  }

  const business = normalizeGoal(body.businessGoal);
  if (business !== undefined) {
    if (business !== null && business.length > GOAL_MAX) {
      return Response.json({ error: `Бизнес-цель — не больше ${GOAL_MAX} символов` }, { status: 400 });
    }
    updates.businessGoal = business;
  }

  const sport = normalizeGoal(body.sportGoal);
  if (sport !== undefined) {
    if (sport !== null && sport.length > GOAL_MAX) {
      return Response.json({ error: `Спортивная цель — не больше ${GOAL_MAX} символов` }, { status: 400 });
    }
    updates.sportGoal = sport;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  await db.update(members).set(updates).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Проверить smoke-запросом**

Создай временного юзера или используй существующего. Войди, получи cookie. Затем:

```bash
cd /root/lumm && curl -s -X PATCH http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <сессионная cookie от /login>" \
  -d '{"businessGoal":"Запустить 3 новых продукта","sportGoal":"Полумарафон за 1:45"}'
```

Expected: `{"ok":true}`. Проверить в БД: `SELECT business_goal, sport_goal FROM members WHERE id=...`.

Если dev-сервер не запущен — `npm run dev` в отдельном терминале.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/app/api/auth/profile/route.ts
git commit -m "feat: PATCH /api/auth/profile — принимать бизнес/спорт цели"
```

---

### Task 3: `GET /api/members` и `/api/members/[id]` — отдавать цели

Расширить публичный набор полей.

**Files:**
- Modify: `/root/lumm/src/app/api/members/route.ts`
- Modify: `/root/lumm/src/app/api/members/[id]/route.ts`

- [ ] **Step 1: Добавить поля в select для `/api/members`**

В `/root/lumm/src/app/api/members/route.ts` внутри `.select({ ... })` добавить после `createdAt`:

```typescript
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
```

- [ ] **Step 2: То же для `/api/members/[id]`**

Прочитать `/root/lumm/src/app/api/members/[id]/route.ts`, найти `.select({ ... })`, добавить те же две строки в блок select.

- [ ] **Step 3: Smoke-check**

```bash
curl -s http://localhost:3000/api/members -H "Cookie: <...>" | head -c 300
```

Expected: в JSON-объектах присутствуют поля `businessGoal` и `sportGoal` (могут быть `null`).

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/app/api/members/route.ts 'src/app/api/members/[id]/route.ts'
git commit -m "feat: цели в публичных members-эндпоинтах"
```

---

### Task 4: `/profile` UI — секция «Мои цели»

**Files:**
- Modify: `/root/lumm/src/app/(main)/profile/page.tsx`
- Modify: `/root/lumm/src/app/(main)/profile/ProfileClient.tsx`

- [ ] **Step 1: Прокинуть initial goals в ProfileClient**

Прочитать `/root/lumm/src/app/(main)/profile/page.tsx`. В select из БД добавить `businessGoal: members.businessGoal, sportGoal: members.sportGoal`. В передачу пропсов `<ProfileClient initial={...} />` добавить `businessGoal: row.businessGoal, sportGoal: row.sportGoal`.

- [ ] **Step 2: Расширить тип `initial` в ProfileClient**

В `/root/lumm/src/app/(main)/profile/ProfileClient.tsx`, в `type Props = { initial: {...} }`, добавить:

```typescript
    businessGoal: string | null;
    sportGoal: string | null;
```

- [ ] **Step 3: Добавить state и обработчик сохранения**

В компонент `ProfileClient` после существующих useState'ов добавить:

```typescript
  const [businessGoal, setBusinessGoal] = useState(initial.businessGoal ?? "");
  const [sportGoal, setSportGoal] = useState(initial.sportGoal ?? "");
  const [goalsMsg, setGoalsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalsMsg(null);
    setGoalsLoading(true);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessGoal: businessGoal.trim() || null,
        sportGoal: sportGoal.trim() || null,
      }),
    });
    setGoalsLoading(false);
    if (res.ok) {
      setGoalsMsg({ type: "ok", text: "Цели сохранены" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setGoalsMsg({ type: "err", text: data.error || "Ошибка сохранения" });
    }
  };
```

- [ ] **Step 4: Добавить JSX-секцию «Мои цели»**

В return JSX, после карточки «Публичные данные» (найди её — это секция с displayName/avatar) и перед секцией «Смена пароля», вставить:

```tsx
      <form
        onSubmit={saveGoals}
        className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-lumm-text-primary">Мои цели</h2>
        <p className="text-sm text-lumm-text-secondary">
          Эти цели видны другим участникам группы. Бот сверяет с ними твои еженедельные отчёты.
        </p>
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Бизнес-цель</label>
          <textarea
            value={businessGoal}
            onChange={(e) => setBusinessGoal(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-3 text-lumm-text-primary"
            placeholder="Например: запустить новый продукт, выйти на выручку X"
          />
          <p className="text-xs text-lumm-text-secondary mt-1">{businessGoal.length}/500</p>
        </div>
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Спортивная цель</label>
          <textarea
            value={sportGoal}
            onChange={(e) => setSportGoal(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-3 text-lumm-text-primary"
            placeholder="Например: полумарафон за 1:45, подтягивания 15 раз"
          />
          <p className="text-xs text-lumm-text-secondary mt-1">{sportGoal.length}/500</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={goalsLoading}
            className="bg-lumm-gold text-lumm-black font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {goalsLoading ? "Сохраняю..." : "Сохранить цели"}
          </button>
          {goalsMsg && (
            <span className={`text-sm ${goalsMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
              {goalsMsg.text}
            </span>
          )}
        </div>
      </form>
```

- [ ] **Step 5: Запустить билд для проверки типов**

Run: `cd /root/lumm && npm run build`
Expected: билд проходит без ошибок TypeScript.

- [ ] **Step 6: Smoke-проверка в браузере**

Run: `cd /root/lumm && npm run dev` (если не запущен), открыть `http://localhost:3000/profile`. Ввести цели, сохранить, перезагрузить страницу — цели должны подтянуться.

- [ ] **Step 7: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/profile/'
git commit -m "feat: /profile — секция 'Мои цели' (бизнес + спорт)"
```

---

### Task 5: `/members/[id]` — показать цели

**Files:**
- Modify: `/root/lumm/src/app/(main)/members/[id]/page.tsx`

- [ ] **Step 1: Добавить businessGoal и sportGoal в select**

В select из БД добавить:

```typescript
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
```

- [ ] **Step 2: Добавить JSX-секцию «Цели»**

После карточки с аватаром и до конца компонента добавить:

```tsx
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Цели</h2>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Бизнес</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">
            {m.businessGoal ?? <span className="text-lumm-text-secondary">—</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Спорт</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">
            {m.sportGoal ?? <span className="text-lumm-text-secondary">—</span>}
          </p>
        </div>
      </div>
```

- [ ] **Step 3: Билд**

Run: `cd /root/lumm && npm run build`
Expected: проходит.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/members/[id]/page.tsx'
git commit -m "feat: показать цели на /members/[id]"
```

---

### Task 6: `/members` grid — превью целей

**Files:**
- Modify: `/root/lumm/src/app/(main)/members/page.tsx`

- [ ] **Step 1: Добавить поля в select**

В `.select({ ... })` добавить:

```typescript
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
```

- [ ] **Step 2: Хелпер обрезки**

Над `export default async function MembersPage` добавить:

```typescript
function truncate(s: string | null, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}
```

- [ ] **Step 3: Дописать превью в карточке**

Заменить блок с `<p className="text-xs text-lumm-text-secondary">{m.role}</p>` на:

```tsx
            <p className="text-xs text-lumm-text-secondary">{m.role}</p>
            {(m.businessGoal || m.sportGoal) && (
              <div className="w-full text-xs text-lumm-text-secondary mt-2 space-y-1">
                {m.businessGoal && (
                  <p className="truncate"><span className="text-lumm-gold">Бизнес:</span> {truncate(m.businessGoal, 80)}</p>
                )}
                {m.sportGoal && (
                  <p className="truncate"><span className="text-lumm-gold">Спорт:</span> {truncate(m.sportGoal, 80)}</p>
                )}
              </div>
            )}
```

- [ ] **Step 4: Билд + smoke**

Run: `cd /root/lumm && npm run build`. Открыть `/members` — у юзеров с заполненными целями видно превью.

- [ ] **Step 5: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/members/page.tsx'
git commit -m "feat: превью целей на /members grid"
```

---

### Task 7: Модуль `src/lib/telegram.ts` + тесты

**Files:**
- Create: `/root/lumm/src/lib/telegram.ts`
- Create: `/root/lumm/src/lib/__tests__/telegram.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `/root/lumm/src/lib/__tests__/telegram.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendGroupMessage } from "../telegram";

const realFetch = global.fetch;
const realToken = process.env.TELEGRAM_BOT_TOKEN;

describe("sendGroupMessage", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env.TELEGRAM_BOT_TOKEN = realToken;
  });

  it("posts to Telegram sendMessage with chat_id and text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendGroupMessage({ chatId: "-100123", text: "hello" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.chat_id).toBe("-100123");
    expect(body.text).toBe("hello");
  });

  it("passes parse_mode when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendGroupMessage({ chatId: "-1", text: "t", parseMode: "HTML" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.parse_mode).toBe("HTML");
  });

  it("throws when Telegram returns ok:false", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, description: "chat not found" }),
    }) as unknown as typeof fetch;

    await expect(sendGroupMessage({ chatId: "-1", text: "t" })).rejects.toThrow("chat not found");
  });

  it("throws when TELEGRAM_BOT_TOKEN is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendGroupMessage({ chatId: "-1", text: "t" })).rejects.toThrow(/TELEGRAM_BOT_TOKEN/);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть (модуля нет)**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/telegram.test.ts`
Expected: FAIL — Cannot find module `../telegram`.

- [ ] **Step 3: Реализовать `sendGroupMessage`**

Создать `/root/lumm/src/lib/telegram.ts`:

```typescript
type SendArgs = {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
};

export async function sendGroupMessage({ chatId, text, parseMode }: SendArgs): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `Telegram API error (HTTP ${res.status})`);
  }
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/telegram.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /root/lumm && git add src/lib/telegram.ts src/lib/__tests__/telegram.test.ts
git commit -m "feat: src/lib/telegram.ts — sendGroupMessage + тесты"
```

---

### Task 8: `POST /api/admin/activate-goals`

Admin-only эндпоинт, шлёт фиксированное сообщение в `GROUP_CHAT_ID`.

**Files:**
- Create: `/root/lumm/src/app/api/admin/activate-goals/route.ts`

- [ ] **Step 1: Создать route**

Создать `/root/lumm/src/app/api/admin/activate-goals/route.ts`:

```typescript
import { getCurrentUser } from "@/lib/session";
import { sendGroupMessage } from "@/lib/telegram";

const MESSAGE = `Друзья, команда Level Up!

Время зафиксировать цели на этот сезон — бизнес и спорт.

Зайди в https://lumm.space/profile → «Мои цели».

Как заполнимся — двинем дальше по программе.`;

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const chatId = process.env.GROUP_CHAT_ID;
  if (!chatId) {
    return Response.json({ error: "GROUP_CHAT_ID не задан в .env" }, { status: 500 });
  }

  try {
    await sendGroupMessage({ chatId, text: MESSAGE });
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
    return Response.json({ error: msg }, { status: 502 });
  }
}
```

- [ ] **Step 2: Билд**

Run: `cd /root/lumm && npm run build`
Expected: проходит.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/app/api/admin/activate-goals/
git commit -m "feat: POST /api/admin/activate-goals"
```

---

### Task 9: `/admin/members` — кнопка «Активировать цели»

**Files:**
- Modify: `/root/lumm/src/app/(main)/admin/members/MembersClient.tsx`

- [ ] **Step 1: Добавить state и handler**

Прочитать файл, в начале компонента `MembersClient` добавить:

```typescript
  const [activating, setActivating] = useState(false);

  const activateGoals = async () => {
    const preview = `Друзья, команда Level Up!\n\nВремя зафиксировать цели на этот сезон — бизнес и спорт.\n\nЗайди в https://lumm.space/profile → «Мои цели».\n\nКак заполнимся — двинем дальше по программе.`;
    if (!confirm(`Отправить в групповой чат:\n\n${preview}`)) return;
    setActivating(true);
    const res = await fetch("/api/admin/activate-goals", { method: "POST" });
    setActivating(false);
    if (res.ok) {
      alert("Сообщение отправлено в группу");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Ошибка: ${data.error || res.statusText}`);
    }
  };
```

(`useState` уже импортирован — проверить. Если нет — добавить.)

- [ ] **Step 2: Добавить кнопку в шапку**

Найти заголовок страницы (что-то вроде `<h1>…Участники…</h1>`). Рядом с заголовком (в одной строке через flex) разместить:

```tsx
        <button
          onClick={activateGoals}
          disabled={activating}
          className="bg-lumm-gold text-lumm-black font-medium px-4 py-2 rounded-lg disabled:opacity-50 text-sm"
        >
          {activating ? "Отправляю..." : "Активировать цели"}
        </button>
```

- [ ] **Step 3: Билд**

Run: `cd /root/lumm && npm run build`
Expected: проходит.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/admin/members/MembersClient.tsx'
git commit -m "feat: кнопка 'Активировать цели' в /admin/members"
```

---

### Task 10: Деплой и smoke-чек в прод

**Files:** ничего не меняем, только деплой

- [ ] **Step 1: Применить миграцию в prod-БД**

Run:
```bash
cd /root/lumm && npx drizzle-kit push
```

Expected: `[✓] Changes applied`.

- [ ] **Step 2: Собрать и перезапустить**

Run: `cd /root/lumm && npm run build && systemctl restart lumm`
Expected: билд проходит, service `lumm.service` в статусе `active (running)`.

- [ ] **Step 3: Прод-smoke чек-лист**

Открой `https://lumm.space`, залогинься админом и пройди по пунктам:

- [ ] `/profile` показывает секцию «Мои цели», заполнение и сохранение работают
- [ ] `/members` — в карточках юзеров с целями видно превью
- [ ] `/members/[id]` — открывается, показаны обе цели (или «—» если пусто)
- [ ] `/admin/members` — кнопка «Активировать цели» на месте
- [ ] Нажать кнопку (confirm → OK) — в группе «Level Up - mastermind» приходит сообщение

- [ ] **Step 4: Обновить память**

Файл: `/root/.claude/projects/-root/memory/project_lumm.md`

Обновить секцию «Что сделано» (добавить «Цели в профиле: бизнес + спорт; активация-рассылка через бота»). В «Что осталось по Фазе 1 PRD» добавить Эпики 2/3/4 v0.1 БЕТА.

- [ ] **Step 5: Финальный коммит-отметка**

```bash
cd /root/lumm && git commit --allow-empty -m "chore: Эпик 1 v0.1 БЕТА готов"
```

---

## Notes

- **Next.js 16 gotchas** (из `AGENTS.md`): при любом сомнении по API Next сверяйся с `node_modules/next/dist/docs/` перед кодом. В этом эпике мы используем только прямолинейные вещи (Response.json, Server Components с `params: Promise<...>`), должно хватить существующих патчей.
- **TDD** применяется к чистому модулю `src/lib/telegram.ts`. API-роуты проверяются smoke-запросами — тестовой инфры под route handlers в проекте пока нет, отдельную поднимать в этом эпике не планируется.
- **Коммиты** — после каждой задачи. Без squash. Привязка к issue на GitHub — добавь `#N` в messages, если issue создан до старта.

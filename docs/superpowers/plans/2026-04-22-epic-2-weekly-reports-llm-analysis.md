# Эпик 2: Еженедельные отчёты + LLM-анализ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Научить бота ловить еженедельный отчёт из групп-чата, прогонять через Claude Sonnet 4.6 (OpenRouter), сохранять 3-слойный анализ и показывать в вебе на `/reports` и `/reports/[id]`.

**Architecture:** Отдельный systemd-процесс `lumm-bot.service` (grammy polling) делит SQLite с `lumm.service`. handleReport оркестрирует: match триггера → find member by `telegram_id` → check goals → save `weekly_reports` → call `analyze` → save `report_analyses` → reply в чат. `analyze` — один HTTP POST к OpenRouter с `response_format: json_object`, 1 ретрай. Веб читает новые таблицы.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + better-sqlite3, grammy 1.x, vitest, date-fns (для weekStart), `crypto.randomUUID()` для id. Без новых npm-зависимостей.

**Spec:** [docs/superpowers/specs/2026-04-22-epic-2-weekly-reports-llm-analysis-design.md](../specs/2026-04-22-epic-2-weekly-reports-llm-analysis-design.md)

---

## File Structure

```
src/
  db/
    schema.ts                                          MODIFY (+raw_text на weekly_reports, +report_analyses)
  lib/
    analyzer.ts                                        CREATE (OpenRouter client + JSON-парсинг + 1 ретрай)
    __tests__/
      analyzer.test.ts                                 CREATE
  bot/
    index.ts                                           REWRITE (grammy + делегат в handleReport)
    trigger.ts                                         CREATE (matchTrigger regex + извлечение тела)
    handleReport.ts                                    CREATE (оркестратор)
    parser.ts                                          UNTOUCHED (старый hashtag-парсер, остаётся на будущее)
    __tests__/
      parser.test.ts                                   UNTOUCHED
      trigger.test.ts                                  CREATE
      handleReport.test.ts                             CREATE
  app/
    api/admin/members/[id]/telegram-id/route.ts        CREATE (POST — установить/очистить telegram_id)
    (main)/
      admin/members/MembersClient.tsx                  MODIFY (+редактирование telegram_id)
      reports/
        page.tsx                                       REWRITE (была заглушка, теперь лента отчётов)
        [id]/page.tsx                                  CREATE (детальная страница одного отчёта)
/etc/systemd/system/
  lumm-bot.service                                     CREATE
```

---

### Task 1: Схема — `raw_text` на weekly_reports + таблица `report_analyses`

**Files:**
- Modify: `/root/lumm/src/db/schema.ts`

- [ ] **Step 1: Добавить колонку и таблицу в схеме**

В `/root/lumm/src/db/schema.ts`:

(1) Внутри `weeklyReports = sqliteTable("weekly_reports", { ... })`, ПОСЛЕ строки `planText: text("plan_text"),` добавить:

```typescript
  rawText: text("raw_text"),
```

(2) В конце файла (после `meetings = sqliteTable(...)` или любой другой последней таблицы) добавить:

```typescript
export const reportAnalyses = sqliteTable("report_analyses", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().unique().references(() => weeklyReports.id),
  trafficLight: text("traffic_light", { enum: ["green", "yellow", "red"] }).notNull(),
  did: text("did").notNull(),
  missed: text("missed").notNull(),
  nextQuestion: text("next_question").notNull(),
  coach: text("coach").notNull(),
  model: text("model").notNull(),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Запушить схему в dev-БД**

Run: `cd /root/lumm && npx drizzle-kit push`
Expected: `[✓] Changes applied` (если drizzle-kit спрашивает про добавление — Yes; безопасно, данных не теряем).

- [ ] **Step 3: Убедиться, что колонки и таблица на месте**

Run:
```bash
cd /root/lumm && node -e "const db=require('better-sqlite3')('./data/lumm.db',{readonly:true}); console.log('weekly_reports:', db.prepare('PRAGMA table_info(weekly_reports)').all().map(c=>c.name).join(',')); console.log('report_analyses:', db.prepare('PRAGMA table_info(report_analyses)').all().map(c=>c.name).join(','));"
```

Expected:
- `weekly_reports: …,raw_text,…`
- `report_analyses: id,report_id,traffic_light,did,missed,next_question,coach,model,created_at`

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/db/schema.ts
git commit -m "feat: +raw_text на weekly_reports, +таблица report_analyses (#2)"
```

(Issue #2 создадим отдельным коммитом/шагом позже — сейчас просто заделываем якорь.)

---

### Task 2: API — `POST /api/admin/members/[id]/telegram-id`

**Files:**
- Create: `/root/lumm/src/app/api/admin/members/[id]/telegram-id/route.ts`

- [ ] **Step 1: Создать route**

Создать `/root/lumm/src/app/api/admin/members/[id]/telegram-id/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

const TG_ID_REGEX = /^\d{1,15}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await params;

  let body: { telegramId?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const raw = body.telegramId;
  let telegramId: string | null;
  if (raw === null || raw === undefined || raw === "") {
    telegramId = null;
  } else if (typeof raw === "string" && TG_ID_REGEX.test(raw)) {
    telegramId = raw;
  } else {
    return Response.json({ error: "telegramId должен быть числом или null" }, { status: 400 });
  }

  const target = await db
    .select({ id: members.id, groupId: members.groupId })
    .from(members)
    .where(eq(members.id, id))
    .limit(1);

  if (target.length === 0) {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }
  if (target[0].groupId !== user.groupId) {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  if (telegramId !== null) {
    const clash = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.telegramId, telegramId), ne(members.id, id)))
      .limit(1);
    if (clash.length > 0) {
      return Response.json({ error: "Этот Telegram ID уже привязан к другому участнику" }, { status: 409 });
    }
  }

  await db.update(members).set({ telegramId }).where(eq(members.id, id));

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Build**

Run: `cd /root/lumm && npm run build 2>&1 | tail -10`
Expected: билд проходит без ошибок.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add 'src/app/api/admin/members/[id]/telegram-id/'
git commit -m "feat: POST /api/admin/members/[id]/telegram-id (#2)"
```

---

### Task 3: UI — редактирование `telegram_id` в `/admin/members`

**Files:**
- Modify: `/root/lumm/src/app/(main)/admin/members/page.tsx`
- Modify: `/root/lumm/src/app/(main)/admin/members/MembersClient.tsx`

- [ ] **Step 1: Прокинуть telegramId в клиент**

В `/root/lumm/src/app/(main)/admin/members/page.tsx`, внутри `.select({ ... })` добавить строку после существующих полей:

```typescript
      telegramId: members.telegramId,
```

Тип `Member` в `MembersClient.tsx` (тип `initialMembers`) обновится автоматически при корректной передаче, но явно расширить тип тоже нужно (следующий шаг).

- [ ] **Step 2: Расширить тип Member в MembersClient**

Открыть `/root/lumm/src/app/(main)/admin/members/MembersClient.tsx`. Найти `type Member = { ... }` (или как он определён — возможно inline в props). Добавить поле:

```typescript
  telegramId: string | null;
```

- [ ] **Step 3: Добавить state и handler для сохранения**

После существующих useState'ов в `MembersClient` добавить:

```typescript
  const [tgDrafts, setTgDrafts] = useState<Record<string, string>>({});
  const [tgBusy, setTgBusy] = useState<string | null>(null);

  const saveTelegramId = async (memberId: string) => {
    const draft = tgDrafts[memberId] ?? "";
    setTgBusy(memberId);
    const res = await fetch(`/api/admin/members/${memberId}/telegram-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: draft.trim() || null }),
    });
    setTgBusy(null);
    if (res.ok) {
      alert("Telegram ID сохранён");
      location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Ошибка: ${data.error || res.statusText}`);
    }
  };
```

- [ ] **Step 4: Добавить колонку в таблицу**

Найти заголовок таблицы `<thead>` и добавить ячейку:

```tsx
            <th className="text-left p-3 text-sm text-lumm-text-secondary">Telegram ID</th>
```

В `<tbody>` внутри `{initialMembers.map((m) => (...))}` строчке добавить ячейку после существующих:

```tsx
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={m.telegramId ?? ""}
                    onChange={(e) => setTgDrafts({ ...tgDrafts, [m.id]: e.target.value })}
                    placeholder="напр. 123456789"
                    className="bg-lumm-gray-dark border border-lumm-gray-light rounded px-2 py-1 text-sm w-36"
                  />
                  <button
                    onClick={() => saveTelegramId(m.id)}
                    disabled={tgBusy === m.id}
                    className="text-xs bg-lumm-gray-light px-2 py-1 rounded disabled:opacity-50"
                  >
                    {tgBusy === m.id ? "..." : "✓"}
                  </button>
                </div>
              </td>
```

- [ ] **Step 5: Добавить подсказку под таблицей**

После закрывающего `</table>` (или под карточкой с таблицей) добавить строку подсказки:

```tsx
      <p className="text-xs text-lumm-text-secondary">
        Чтобы узнать свой Telegram ID — напиши в Telegram боту <code className="text-lumm-gold">@userinfobot</code>, он ответит числом.
      </p>
```

- [ ] **Step 6: Build**

Run: `cd /root/lumm && npm run build 2>&1 | tail -10`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/admin/members/'
git commit -m "feat: редактирование telegram_id в /admin/members (#2)"
```

---

### Task 4: `src/bot/trigger.ts` — матчинг триггера (TDD)

**Files:**
- Create: `/root/lumm/src/bot/trigger.ts`
- Create: `/root/lumm/src/bot/__tests__/trigger.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Создать `/root/lumm/src/bot/__tests__/trigger.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { matchTrigger } from "../trigger";

describe("matchTrigger", () => {
  it("matches mention followed by phrase", () => {
    const r = matchTrigger("@lummbrain_bot Еженедельный отчёт: бизнес провалил, спорт ок");
    expect(r).toBe("бизнес провалил, спорт ок");
  });

  it("matches phrase then mention at end", () => {
    const r = matchTrigger("Еженедельный отчёт: закрыл 3 сделки, 10 км пробежал @lummbrain_bot");
    expect(r).toBe("закрыл 3 сделки, 10 км пробежал");
  });

  it("is case-insensitive", () => {
    expect(matchTrigger("@lummbrain_bot еженедельный Отчет всё норм")).toBe("всё норм");
    expect(matchTrigger("@LUMMBRAIN_BOT ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ текст")).toBe("текст");
  });

  it("accepts both отчёт and отчет", () => {
    expect(matchTrigger("@lummbrain_bot еженедельный отчет текст")).toBe("текст");
    expect(matchTrigger("@lummbrain_bot еженедельный отчёт текст")).toBe("текст");
  });

  it("returns null when mention is absent", () => {
    expect(matchTrigger("Еженедельный отчёт: без бота")).toBeNull();
  });

  it("returns null when phrase is absent", () => {
    expect(matchTrigger("@lummbrain_bot напомни мне завтра")).toBeNull();
  });

  it("returns null for empty or unrelated text", () => {
    expect(matchTrigger("")).toBeNull();
    expect(matchTrigger("Привет всем!")).toBeNull();
  });

  it("handles multi-line reports", () => {
    const text = "@lummbrain_bot Еженедельный отчёт\n\nБизнес: всё плохо\nСпорт: лучше";
    expect(matchTrigger(text)).toBe("Бизнес: всё плохо\nСпорт: лучше");
  });

  it("trims leading punctuation and whitespace from body", () => {
    expect(matchTrigger("@lummbrain_bot Еженедельный отчёт   —   текст отчёта")).toBe("текст отчёта");
  });

  it("returns null when body is empty after stripping", () => {
    expect(matchTrigger("@lummbrain_bot Еженедельный отчёт")).toBeNull();
    expect(matchTrigger("@lummbrain_bot Еженедельный отчёт    ")).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тесты — должны упасть**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/trigger.test.ts 2>&1 | tail -15`
Expected: FAIL — cannot resolve `../trigger`.

- [ ] **Step 3: Реализовать matchTrigger**

Создать `/root/lumm/src/bot/trigger.ts`:

```typescript
const MENTION = /@lummbrain_bot/i;
const PHRASE = /еженедельн[ыо]й\s+отч[её]т/i;

export function matchTrigger(text: string): string | null {
  if (!text) return null;
  if (!MENTION.test(text) || !PHRASE.test(text)) return null;

  const stripped = text
    .replace(MENTION, " ")
    .replace(PHRASE, " ")
    .trim()
    .replace(/^[\s:,.\-—–]+/, "")
    .replace(/[\s]+/g, (m) => (m.includes("\n") ? m : " "))
    .trim();

  return stripped.length > 0 ? stripped : null;
}
```

- [ ] **Step 4: Запустить тесты — должны пройти**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/trigger.test.ts 2>&1 | tail -15`
Expected: 10 passed.

Если какой-то тест не проходит — поправь `trigger.ts` так, чтобы все тесты были зелёные. Основные кейсы: ведущие знаки препинания, нормализация пробелов (не трогать переносы строк), пустое тело возвращает null.

- [ ] **Step 5: Commit**

```bash
cd /root/lumm && git add src/bot/trigger.ts src/bot/__tests__/trigger.test.ts
git commit -m "feat: src/bot/trigger.ts — matchTrigger + тесты (#2)"
```

---

### Task 5: `src/lib/analyzer.ts` — OpenRouter клиент (TDD)

**Files:**
- Create: `/root/lumm/src/lib/analyzer.ts`
- Create: `/root/lumm/src/lib/__tests__/analyzer.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Создать `/root/lumm/src/lib/__tests__/analyzer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyze } from "../analyzer";

const realFetch = global.fetch;
const realKey = process.env.OPENROUTER_API_KEY;

const GOALS = { business: "запустить продукт X", sport: "полумарафон 1:45" };
const REPORT = "Закрыл 2 сделки, пробежал 5 км";

function okResponse(json: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(json) } }],
    }),
  };
}

function validAnalysis() {
  return {
    traffic_light: "yellow" as const,
    did: "Две сделки и 5 км",
    missed: "Спорт в половину от цели",
    next_question: "Где найти темп для длинных пробежек?",
    coach: "Движение есть, но спорт просел. Не давай себе забить.",
  };
}

describe("analyze", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env.OPENROUTER_API_KEY = realKey;
  });

  it("posts to OpenRouter with correct body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(validAnalysis()));
    global.fetch = fetchMock as unknown as typeof fetch;

    await analyze({ goals: GOALS, reportText: REPORT });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("anthropic/claude-sonnet-4-6");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toContain("запустить продукт X");
    expect(body.messages[1].content).toContain("полумарафон 1:45");
    expect(body.messages[1].content).toContain(REPORT);
  });

  it("parses valid JSON response into Analysis", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(validAnalysis())) as unknown as typeof fetch;
    const a = await analyze({ goals: GOALS, reportText: REPORT });
    expect(a.trafficLight).toBe("yellow");
    expect(a.did).toBe("Две сделки и 5 км");
    expect(a.missed).toBe("Спорт в половину от цели");
    expect(a.nextQuestion).toBe("Где найти темп для длинных пробежек?");
    expect(a.coach).toContain("Движение есть");
    expect(a.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("retries once on invalid JSON, then succeeds", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "not a json" } }] }) })
      .mockResolvedValueOnce(okResponse(validAnalysis()));
    global.fetch = fetchMock as unknown as typeof fetch;

    const a = await analyze({ goals: GOALS, reportText: REPORT });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a.trafficLight).toBe("yellow");
  });

  it("throws after two invalid JSON responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "still not json" } }] }),
    }) as unknown as typeof fetch;

    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow(/LLM/);
  });

  it("throws on missing required fields in response", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ traffic_light: "green" })) as unknown as typeof fetch;
    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow();
  });

  it("throws on invalid traffic_light value", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ ...validAnalysis(), traffic_light: "purple" })) as unknown as typeof fetch;
    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow();
  });

  it("retries on HTTP 5xx", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse(validAnalysis()));
    global.fetch = fetchMock as unknown as typeof fetch;

    const a = await analyze({ goals: GOALS, reportText: REPORT });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a.trafficLight).toBe("yellow");
  });

  it("throws when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});
```

- [ ] **Step 2: Запустить тесты — должны упасть**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/analyzer.test.ts 2>&1 | tail -15`
Expected: FAIL — cannot resolve `../analyzer`.

- [ ] **Step 3: Реализовать analyzer**

Создать `/root/lumm/src/lib/analyzer.ts`:

```typescript
const MODEL = "anthropic/claude-sonnet-4-6";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `Ты коуч мастермайнд-группы. На входе — цели участника и его отчёт за неделю.
Верни JSON строго по схеме:
{
  "traffic_light": "green" | "yellow" | "red",
  "did": "1-3 предложения — что участник сделал к цели",
  "missed": "1-3 предложения — что упустил или где застрял",
  "next_question": "один острый вопрос участнику на следующую неделю",
  "coach": "5-10 предложений рефлексии в тоне поддержки+конфронтации"
}

Правила светофора:
- green — явное движение и к бизнес-, и к спорт-цели
- yellow — движение в одной из целей, или символическое в обеих
- red — нет движения или участник застрял

Говори на ты, по-русски, без воды, без канцелярита.
Не придумывай факты — работай только с тем, что написано в отчёте.`;

export type Analysis = {
  trafficLight: "green" | "yellow" | "red";
  did: string;
  missed: string;
  nextQuestion: string;
  coach: string;
  model: string;
};

export type AnalyzeArgs = {
  goals: { business: string; sport: string };
  reportText: string;
};

function buildUserContent(args: AnalyzeArgs): string {
  return `Бизнес-цель: ${args.goals.business}\nСпортивная цель: ${args.goals.sport}\n\nОтчёт:\n${args.reportText}`;
}

function isLight(v: unknown): v is Analysis["trafficLight"] {
  return v === "green" || v === "yellow" || v === "red";
}

function parseAnalysis(raw: unknown): Analysis {
  if (!raw || typeof raw !== "object") throw new Error("LLM ответ не объект");
  const o = raw as Record<string, unknown>;
  if (!isLight(o.traffic_light)) throw new Error("LLM: некорректный traffic_light");
  if (typeof o.did !== "string" || !o.did.trim()) throw new Error("LLM: пустой did");
  if (typeof o.missed !== "string" || !o.missed.trim()) throw new Error("LLM: пустой missed");
  if (typeof o.next_question !== "string" || !o.next_question.trim()) throw new Error("LLM: пустой next_question");
  if (typeof o.coach !== "string" || !o.coach.trim()) throw new Error("LLM: пустой coach");
  return {
    trafficLight: o.traffic_light,
    did: o.did,
    missed: o.missed,
    nextQuestion: o.next_question,
    coach: o.coach,
    model: MODEL,
  };
}

async function callOnce(args: AnalyzeArgs, apiKey: string): Promise<Analysis> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lumm.space",
      "X-Title": "LUMM",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserContent(args) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter HTTP ${res.status}`);
  }

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM: пустой content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("LLM: не JSON");
  }
  return parseAnalysis(parsed);
}

export async function analyze(args: AnalyzeArgs): Promise<Analysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  try {
    return await callOnce(args, apiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[analyzer] первая попытка упала:", msg, "— ретрай");
    return await callOnce(args, apiKey);
  }
}
```

- [ ] **Step 4: Запустить тесты — должны пройти**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/analyzer.test.ts 2>&1 | tail -15`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
cd /root/lumm && git add src/lib/analyzer.ts src/lib/__tests__/analyzer.test.ts
git commit -m "feat: src/lib/analyzer.ts — OpenRouter клиент + тесты (#2)"
```

---

### Task 6: `src/bot/handleReport.ts` — оркестратор (TDD)

**Files:**
- Create: `/root/lumm/src/bot/handleReport.ts`
- Create: `/root/lumm/src/bot/__tests__/handleReport.test.ts`

Цель: чистая функция, не зависящая от grammy напрямую. Принимает маленький интерфейс — `{ text, fromId, reply }` — что упрощает тесты.

- [ ] **Step 1: Написать падающие тесты**

Создать `/root/lumm/src/bot/__tests__/handleReport.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/analyzer", () => ({
  analyze: vi.fn(),
}));

import { handleReport } from "../handleReport";
import { db } from "@/db";
import { analyze } from "@/lib/analyzer";

const replyMock = vi.fn();

function baseInput(overrides: Partial<{ text: string; fromId: string }> = {}) {
  return {
    text: "@lummbrain_bot Еженедельный отчёт всё норм",
    fromId: "123456789",
    reply: replyMock,
    baseUrl: "https://lumm.space",
    ...overrides,
  };
}

function mockSelectReturning(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

function mockInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  (db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ values });
  return values;
}

describe("handleReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing on non-trigger text", async () => {
    await handleReport(baseInput({ text: "@lummbrain_bot напомни завтра" }));
    expect(replyMock).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("asks to link account when member not found", async () => {
    mockSelectReturning([]);
    await handleReport(baseInput());
    expect(replyMock).toHaveBeenCalledOnce();
    expect(replyMock.mock.calls[0][0]).toMatch(/не привязан/i);
  });

  it("asks to fill goals when businessGoal is missing", async () => {
    mockSelectReturning([{
      id: "m1", displayName: "Саша", businessGoal: null, sportGoal: "полумарафон",
    }]);
    await handleReport(baseInput());
    expect(replyMock).toHaveBeenCalledOnce();
    expect(replyMock.mock.calls[0][0]).toMatch(/цели/i);
    expect(replyMock.mock.calls[0][0]).toMatch(/Саша/);
  });

  it("happy path: saves report, analysis, replies with link", async () => {
    mockSelectReturning([{
      id: "m1", displayName: "Саша", businessGoal: "запустить продукт", sportGoal: "полумарафон",
    }]);
    const insertValues = mockInsert();
    (analyze as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      trafficLight: "green",
      did: "сделано",
      missed: "ничего",
      nextQuestion: "что дальше?",
      coach: "молодец",
      model: "anthropic/claude-sonnet-4-6",
    });

    await handleReport(baseInput());

    expect(analyze).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledTimes(2); // weekly_reports + report_analyses
    expect(replyMock).toHaveBeenCalledOnce();
    const reply = replyMock.mock.calls[0][0] as string;
    expect(reply).toMatch(/Саша/);
    expect(reply).toMatch(/lumm.space\/reports\//);
  });

  it("on analyzer failure: saves report, no analysis, apologizes in reply", async () => {
    mockSelectReturning([{
      id: "m1", displayName: "Саша", businessGoal: "X", sportGoal: "Y",
    }]);
    const insertValues = mockInsert();
    (analyze as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("LLM down"));

    await handleReport(baseInput());

    expect(insertValues).toHaveBeenCalledOnce(); // только weekly_reports
    expect(replyMock).toHaveBeenCalledOnce();
    expect(replyMock.mock.calls[0][0]).toMatch(/анализ не получился/i);
  });
});
```

- [ ] **Step 2: Запустить тесты — должны упасть**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/handleReport.test.ts 2>&1 | tail -15`
Expected: FAIL — cannot resolve `../handleReport`.

- [ ] **Step 3: Реализовать handleReport**

Создать `/root/lumm/src/bot/handleReport.ts`:

```typescript
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

export async function handleReport(input: ReportInput): Promise<void> {
  const body = matchTrigger(input.text);
  if (!body) return;

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
    return;
  }

  const member = rows[0];
  if (!member.businessGoal?.trim() || !member.sportGoal?.trim()) {
    await input.reply(
      `${member.displayName}, у тебя не заполнены цели. Зайди в ${input.baseUrl}/profile → «Мои цели». Пришли отчёт снова после.`,
    );
    return;
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
}
```

- [ ] **Step 4: Запустить тесты — должны пройти**

Run: `cd /root/lumm && npx vitest run src/bot/__tests__/handleReport.test.ts 2>&1 | tail -15`
Expected: 5 passed.

- [ ] **Step 5: Прогнать все тесты проекта на регрессии**

Run: `cd /root/lumm && npx vitest run 2>&1 | tail -10`
Expected: все тестовые файлы зелёные (trigger, analyzer, handleReport, telegram, parser).

- [ ] **Step 6: Commit**

```bash
cd /root/lumm && git add src/bot/handleReport.ts src/bot/__tests__/handleReport.test.ts
git commit -m "feat: src/bot/handleReport.ts — оркестратор + тесты (#2)"
```

---

### Task 7: Переписать `src/bot/index.ts` — grammy делегирует в handleReport

**Files:**
- Rewrite: `/root/lumm/src/bot/index.ts`

- [ ] **Step 1: Заменить файл**

Перезаписать `/root/lumm/src/bot/index.ts` содержимым:

```typescript
import { Bot } from "grammy";
import { handleReport } from "./handleReport";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lumm.space";

const bot = new Bot(token);

bot.command("start", (ctx) => ctx.reply("LUMM Bot запущен. Пиши еженедельные отчёты в группе."));

bot.on("message:text", async (ctx) => {
  if (!ctx.from?.id) return;
  try {
    await handleReport({
      text: ctx.message.text,
      fromId: String(ctx.from.id),
      reply: async (msg) => {
        await ctx.reply(msg, { reply_parameters: { message_id: ctx.message.message_id } });
      },
      baseUrl,
    });
  } catch (err) {
    console.error("[bot] handleReport crashed:", err);
    try {
      await ctx.reply("Что-то пошло не так. Попробуй через минуту.");
    } catch {
      /* swallow — уже упали */
    }
  }
});

bot.catch((err) => {
  console.error("[bot] grammy error:", err);
});

bot.start({
  onStart: () => console.log("LUMM Bot started (long-polling)"),
});
```

- [ ] **Step 2: Проверить, что бот стартует локально**

Run (в отдельном терминале или с коротким таймаутом):
```bash
cd /root/lumm && timeout 5 npm run bot 2>&1 | head -15
```

Expected: видно строку `LUMM Bot started (long-polling)`. После 5 секунд процесс убивается по timeout — это ок, просто проверка что стартует без крэша.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/bot/index.ts
git commit -m "feat: src/bot/index.ts — grammy делегирует в handleReport (#2)"
```

---

### Task 8: `/reports/[id]` — детальная страница отчёта

**Files:**
- Create: `/root/lumm/src/app/(main)/reports/[id]/page.tsx`

- [ ] **Step 1: Создать страницу**

Создать `/root/lumm/src/app/(main)/reports/[id]/page.tsx`:

```typescript
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members, weeklyReports, reportAnalyses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const LIGHT_BADGE: Record<string, { label: string; color: string }> = {
  green: { label: "🟢 Движется", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  yellow: { label: "🟡 Частично", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  red: { label: "🔴 Застрял", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const rows = await db
    .select({
      reportId: weeklyReports.id,
      rawText: weeklyReports.rawText,
      createdAt: weeklyReports.createdAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      groupId: members.groupId,
      businessGoal: members.businessGoal,
      sportGoal: members.sportGoal,
      trafficLight: reportAnalyses.trafficLight,
      did: reportAnalyses.did,
      missed: reportAnalyses.missed,
      nextQuestion: reportAnalyses.nextQuestion,
      coach: reportAnalyses.coach,
    })
    .from(weeklyReports)
    .innerJoin(members, eq(members.id, weeklyReports.memberId))
    .leftJoin(reportAnalyses, eq(reportAnalyses.reportId, weeklyReports.id))
    .where(and(eq(weeklyReports.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0) notFound();
  const r = rows[0];

  const badge = r.trafficLight ? LIGHT_BADGE[r.trafficLight] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/reports"
        className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
      >
        ← К ленте отчётов
      </Link>

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
          <Link href={`/members/${r.memberId}`} className="text-lg font-semibold text-lumm-text-primary hover:underline">
            {r.displayName}
          </Link>
          <p className="text-sm text-lumm-text-secondary">{formatDate(r.createdAt)}</p>
        </div>
        {badge ? (
          <span className={`px-3 py-1 rounded-full text-sm border ${badge.color}`}>{badge.label}</span>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm border bg-lumm-gray-light/10 text-lumm-text-secondary border-lumm-gray-light">
            Без анализа
          </span>
        )}
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-2">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Текст отчёта</h2>
        <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
          {r.rawText ?? "—"}
        </pre>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Цели участника</h2>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Бизнес</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.businessGoal ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Спорт</p>
          <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.sportGoal ?? "—"}</p>
        </div>
      </div>

      {r.trafficLight ? (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Анализ</h2>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Что сделал к цели</p>
            <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.did}</p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Что упустил</p>
            <p className="text-sm text-lumm-text-primary whitespace-pre-wrap">{r.missed}</p>
          </div>
          <div className="border-l-4 border-lumm-gold pl-4">
            <p className="text-xs text-lumm-gold uppercase tracking-wide mb-1">Вопрос на следующую неделю</p>
            <p className="text-base text-lumm-text-primary whitespace-pre-wrap">{r.nextQuestion}</p>
          </div>
          <div>
            <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-1">Коуч</p>
            <p className="text-sm text-lumm-text-primary whitespace-pre-wrap leading-relaxed">{r.coach}</p>
          </div>
        </div>
      ) : (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
          <p className="text-sm text-lumm-text-secondary">Анализ не удался — попробуем ещё раз позже.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd /root/lumm && npm run build 2>&1 | tail -10`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/reports/[id]/'
git commit -m "feat: /reports/[id] — детальная страница отчёта с анализом (#2)"
```

---

### Task 9: `/reports` — лента отчётов группы

**Files:**
- Rewrite: `/root/lumm/src/app/(main)/reports/page.tsx`

- [ ] **Step 1: Заменить файл**

Перезаписать `/root/lumm/src/app/(main)/reports/page.tsx`:

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members, weeklyReports, reportAnalyses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const LIGHT_BADGE: Record<string, { label: string; color: string }> = {
  green: { label: "🟢", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  yellow: { label: "🟡", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  red: { label: "🔴", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

function truncate(s: string | null, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      reportId: weeklyReports.id,
      createdAt: weeklyReports.createdAt,
      memberId: members.id,
      displayName: members.displayName,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      trafficLight: reportAnalyses.trafficLight,
      coach: reportAnalyses.coach,
    })
    .from(weeklyReports)
    .innerJoin(members, eq(members.id, weeklyReports.memberId))
    .leftJoin(reportAnalyses, eq(reportAnalyses.reportId, weeklyReports.id))
    .where(eq(members.groupId, user.groupId))
    .orderBy(desc(weeklyReports.createdAt));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Отчёты</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          {rows.length} {rows.length === 1 ? "отчёт" : "отчётов"} в группе
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center text-lumm-text-secondary">
          Пока отчётов нет. Напиши в групп-чат: <code className="text-lumm-gold">@lummbrain_bot Еженедельный отчёт ...</code>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const badge = r.trafficLight ? LIGHT_BADGE[r.trafficLight] : null;
            return (
              <Link
                key={r.reportId}
                href={`/reports/${r.reportId}`}
                className="block bg-lumm-black border border-lumm-gray-light rounded-xl p-4 hover:border-lumm-gold transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    displayName={r.displayName}
                    avatarColor={r.avatarColor}
                    avatarUrl={r.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-lumm-text-primary">{r.displayName}</span>
                      <span className="text-xs text-lumm-text-secondary">{formatDate(r.createdAt)}</span>
                      {badge ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${badge.color}`}>{badge.label}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs border bg-lumm-gray-light/10 text-lumm-text-secondary border-lumm-gray-light">
                          без анализа
                        </span>
                      )}
                    </div>
                    {r.coach && (
                      <p className="text-sm text-lumm-text-secondary mt-1 truncate">{truncate(r.coach, 120)}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd /root/lumm && npm run build 2>&1 | tail -10`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add 'src/app/(main)/reports/page.tsx'
git commit -m "feat: /reports — лента отчётов группы (#2)"
```

---

### Task 10: Systemd unit + деплой в прод

**Files:**
- Create: `/etc/systemd/system/lumm-bot.service`

- [ ] **Step 1: Создать issue #2 на GitHub (если ещё нет)**

Если issue #2 для этого эпика ещё не создан — создать:

```bash
gh issue create --repo ragastar/lumm \
  --title "Эпик 2: Еженедельные отчёты через бота + LLM-анализ (v0.1 БЕТА)" \
  --body "Спека: docs/superpowers/specs/2026-04-22-epic-2-weekly-reports-llm-analysis-design.md
План: docs/superpowers/plans/2026-04-22-epic-2-weekly-reports-llm-analysis.md

## Scope
- Бот ловит \`@lummbrain_bot Еженедельный отчёт …\` в группе
- Claude Sonnet 4.6 через OpenRouter, 3-слойный анализ (светофор + блоки + коуч)
- Страницы \`/reports\` и \`/reports/[id]\`
- Админ вручную вбивает \`telegram_id\` каждому в \`/admin/members\`
- Отдельный \`lumm-bot.service\`"
```

Если issue уже создан вручную — пропусти шаг.

- [ ] **Step 2: Мерж ветки (если работали на ветке)**

Если работаем на ветке `epic-2-reports`:

```bash
cd /root/lumm && git checkout master && git merge --ff-only epic-2-reports
```

Если работали прямо на master — пропусти.

- [ ] **Step 3: Записать systemd unit**

Создать `/etc/systemd/system/lumm-bot.service`:

```ini
[Unit]
Description=LUMM Telegram Bot (grammy polling)
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/lumm
EnvironmentFile=/root/lumm/.env
ExecStart=/usr/bin/npm run bot
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 4: Активировать unit**

```bash
systemctl daemon-reload
systemctl enable lumm-bot
systemctl start lumm-bot
sleep 3
systemctl is-active lumm-bot
journalctl -u lumm-bot --no-pager -n 10
```

Expected: `active`, в логах `LUMM Bot started (long-polling)`.

- [ ] **Step 5: Пересобрать и перезапустить сайт**

```bash
cd /root/lumm && npm run build && systemctl restart lumm && sleep 2 && systemctl is-active lumm
```

Expected: билд проходит, `active`.

- [ ] **Step 6: Прод-смок чек-лист (ручной)**

- [ ] Открой https://lumm.space/admin/members — появилась колонка «Telegram ID»
- [ ] Вбей себе свой Telegram ID (узнай через @userinfobot), нажми ✓, страница перезагружается
- [ ] Убедись, что у тебя в `/profile` заполнены ОБЕ цели (бизнес + спорт). Если нет — заполни
- [ ] Напиши в группе `Level Up - mastermind`: `@lummbrain_bot Еженедельный отчёт Тест: закрыл 2 задачи, пробежал 3 км`
- [ ] Через ~10-15 сек бот должен ответить в чат вида `✅ {имя}, отчёт принят. Анализ: https://lumm.space/reports/<id>`
- [ ] Кликни по ссылке — открылась детальная страница с твоим текстом + анализом (светофор, блоки, коуч)
- [ ] Открой `/reports` — твой отчёт наверху ленты с цветной пилюлькой

Проверь негативные кейсы:
- [ ] Пошли от юзера без telegram_id (или временно очисти себе в админке) — бот отвечает «не привязан»
- [ ] Убери цель на время из `/profile` (сохрани), пошли отчёт — бот отвечает «заполни цели»

- [ ] **Step 7: Обновить память**

Файл `/root/.claude/projects/-root/memory/project_lumm.md`:

1. В секции «Что сделано» добавить пункт: `Еженедельные отчёты через бота (Эпик 2): @lummbrain_bot Еженедельный отчёт → Claude Sonnet 4.6 через OpenRouter → анализ (светофор + блоки + коуч), сохранение в report_analyses, страницы /reports и /reports/[id], отдельный systemd-unit lumm-bot.service.`
2. В секции «v0.1 БЕТА roadmap» поменять `⬜ Эпик 2:` на `✅ Эпик 2:`.
3. Удалить секцию «Эпик 2 — brainstorm в процессе» целиком — она устарела.

- [ ] **Step 8: Закрыть issue #2**

```bash
gh issue close 2 --comment "Эпик 2 закрыт. Всё задеплоено, смок прошёл, бот ловит отчёты и возвращает анализ."
```

- [ ] **Step 9: Финальный маркер**

```bash
cd /root/lumm && git commit --allow-empty -m "chore: Эпик 2 v0.1 БЕТА готов (#2)"
```

---

## Notes

- **OpenRouter биллинг:** на момент написания баланс положительный (проверить: https://openrouter.ai/activity). Sonnet 4.6 стоит ~$3/M input / $15/M output — на 4-6 отчётов в неделю ≈ $0.02-0.05 в неделю, копейки.
- **Privacy mode бота:** включён по умолчанию. Bot получает сообщения с упоминанием `@lummbrain_bot`, команды (`/start`) и реплаи на свои сообщения. Этого достаточно, специально отключать не надо.
- **Next.js 16 gotchas** (`AGENTS.md`): params в server component — это Promise, обязательно `await params`. Ответы — `Response.json()`, не `NextResponse`.
- **TDD** применяется к чистым модулям (`trigger`, `analyzer`, `handleReport`). Веб-страницы и админ-UI — smoke-check в прод-чеклисте.
- **Коммиты** после каждой задачи. Привязка к issue — `#2` в сообщениях.

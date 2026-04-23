# Эпик 4 — Календарь встреч + бот-напоминания

**Дата:** 2026-04-22
**Статус:** дизайн утверждён, к плану

## Контекст

- Таблица `meetings` существует, но в БД 0 записей. `/api/meetings` — только GET. Admin UI для создания нет. `/calendar` рендерит «нет запланированных встреч».
- Бот (`lumm-bot.service`) уже крутится с grammy polling и умеет `sendGroupMessage`. Никаких cron-задач сейчас нет.
- PRD: встречи проходят «по стандарту как 3-й четверг месяца». Организатор — по очереди, ротация между участниками. Еженедельные отчёты сдаются через бота с триггером `@lummbrain_bot Еженедельный отчёт …`. Ежемесячные — через форму `/financials`, привязаны к ближайшей встрече.

## Цель

Автоматизировать два куска жизни группы:

1. **Календарь встреч** — стандартные встречи на 3-й чт автоматически появляются в календаре с назначенным по ротации организатором. Любой участник может поправить дату/место/организатора или создать внеплановую (ad-hoc) встречу.
2. **Бот-напоминания** — бот по расписанию пингует отстающих: еженедельный отчёт по воскресеньям, ежемесячный за 3 дня до ближайшей стандартной встречи. Если все сдали — молчит.

## Решения брейншторма

| Вопрос | Выбор |
|---|---|
| Скоуп | Всё в один эпик: meetings + напоминания + правка `/calendar`. |
| Как создавать встречи | Cron в процессе бота + UI для ручной правки/создания. Seed не нужен. |
| Когда cron проверяет календарь | Ежедневно 09:00 MSK, логика «нет ли будущей scheduled standard → создать». |
| Первая ротация | По `createdAt ASC` активных участников группы. |
| Смена организатора | Через UI (любой участник может поменять `organizerId` у любой встречи в своей группе). Сдвигает следующую ротацию. |
| Ad-hoc встречи | Отдельный тип `kind='ad_hoc'`. Не участвуют в ротации. Ротация смотрит только на `kind='standard'`. |
| Напоминания | Smart: пингуем только тех, кто ещё не сдал. Если все сдали — молчание. |
| Когда monthly-пинг | Ровно за 3 дня до ближайшей scheduled standard встречи. |
| Когда weekly-пинг | Воскресенье 19:00 MSK. |
| Настройки в UI | Нет. Время cron, тексты, правила — хардкод в коде. |
| Один групповой чат | Да, `GROUP_CHAT_ID` из env. Таблица `groups.telegram_chat_id` пока не задействована в cron. |
| Эмодзи в текстах | Без эмодзи. |

## Скоуп

**Делаем:**
- Поле `kind` в `meetings` + миграция.
- `/calendar`: фильтр по группе, кнопки «Создать встречу», «Редактировать», «Отменить». Форма — дата, тип, организатор, место, статус. Бейдж типа на карточке.
- API: `POST /api/meetings` (любой участник группы), `PATCH /api/meetings/[id]`. `GET` обновляется фильтром по сессии.
- Cron в процессе `lumm-bot.service` через `node-cron`, TZ `Europe/Moscow`:
  - **daily 09:00** `ensureNextMeeting` — создаёт scheduled standard meeting на следующий 3-й чт, если нет в будущем. Пишет в группу «Следующий мастермайнд: ..., ведёт ...».
  - **daily 09:00** `monthlyReminder` — если ближайшая standard встреча ровно через 3 дня, пингует отстающих по ежемесячному отчёту.
  - **sunday 19:00** `weeklyReminder` — пингует отстающих по еженедельному отчёту.

**Не делаем:**
- LLM-анализ ежемесячных.
- Дашборды (личный/общий).
- Настройки cron/текстов в админ-UI.
- Поддержку нескольких `telegram_chat_id` одновременно.
- Сбор Telegram-username'ов для упоминаний через `@handle` — если username неизвестен, пишем displayName без `@` (т.е. без звонкого пинга).
- Тесты cron-wiring (тестим только чистые функции-хелперы).

## Архитектура

### Изменения БД

Миграция `scripts/migrations/2026-04-22-meetings-kind.sql`:

```sql
ALTER TABLE meetings ADD COLUMN kind TEXT NOT NULL DEFAULT 'standard';
```

В `src/db/schema.ts`:

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

В `src/db/seed.ts`: добавить `kind TEXT NOT NULL DEFAULT 'standard'` в DDL таблицы `meetings` для чистых dev-пересозданий.

### `src/lib/rotation.ts` — чистые функции ротации

```ts
export type PoolMember = { id: string; displayName: string };

export function nextOrganizer(
  pool: PoolMember[],
  lastStandardOrganizerId: string | null,
): string | null {
  if (pool.length === 0) return null;
  if (!lastStandardOrganizerId) return pool[0].id;
  const idx = pool.findIndex((m) => m.id === lastStandardOrganizerId);
  if (idx === -1) return pool[0].id; // предыдущий организатор уже вне пула
  return pool[(idx + 1) % pool.length].id;
}

export function nextThirdThursday(from: Date): Date {
  // Возвращает дату ближайшего 3-го четверга месяца от `from` включительно.
  // Если 3-й чт текущего месяца >= from — это он. Иначе — 3-й чт следующего месяца.
  // ...
}
```

Тесты: циклический обход пула, выбывший организатор, пустой пул, граница месяца у `nextThirdThursday`, «сегодня = 3-й чт» возвращает сегодня.

### `src/lib/meetings.ts` — domain helper

```ts
export async function ensureNextMeeting(groupId: string): Promise<{ created: boolean; meetingId?: string; organizerId?: string | null; date?: string }> {
  // 1. SELECT * FROM meetings WHERE group_id = ? AND kind = 'standard' AND status = 'scheduled' AND date >= today → если есть, return { created: false }
  // 2. poolRows = активные участники группы, ORDER BY created_at ASC
  // 3. lastStandardOrg = organizer_id последней kind='standard' встречи (по date DESC, без учёта status)
  // 4. organizerId = nextOrganizer(pool, lastStandardOrg)
  // 5. date = nextThirdThursday(today)
  // 6. INSERT row
  // 7. return { created: true, meetingId, organizerId, date }
}
```

### `src/bot/reminders.ts` — чистые функции напоминаний

```ts
export function findLaggardsWeekly(
  members: Array<{ id: string; displayName: string; telegramId: string | null }>,
  reports: Array<{ memberId: string; weekStart: string }>,
  currentWeekStart: string,
): Array<{ displayName: string; telegramId: string | null }>;

export function findLaggardsMonthly(
  members: Array<{ id: string; displayName: string; telegramId: string | null }>,
  financials: Array<{ memberId: string; month: string }>,
  currentMonth: string,
): Array<{ displayName: string; telegramId: string | null }>;

export function formatMentions(
  laggards: Array<{ displayName: string; telegramId: string | null }>,
): string; // "@Вася, Петя" (если нет telegramId — без @)

export function composeWeeklyReminder(laggards: ...): string | null;
export function composeMonthlyReminder(laggards: ..., meetingDate: Date): string | null;
// null означает "все сдали, не пиши"
```

Тесты: все сдали → null, один отстал, все отстали, fallback displayName без telegramId.

### `src/bot/scheduler.ts` — node-cron wiring

```ts
import cron from "node-cron";
import { ensureNextMeeting } from "@/lib/meetings";
import { findLaggardsWeekly, findLaggardsMonthly, composeWeeklyReminder, composeMonthlyReminder } from "./reminders";
import { sendGroupMessage } from "@/lib/telegram";
// ...

export function startScheduler() {
  // Ежедневно 09:00 MSK: ensure-next-meeting + monthly-reminder
  cron.schedule("0 9 * * *", async () => {
    // 1. ensureNextMeeting(groupId)
    //    если created: sendGroupMessage("Следующий мастермайнд: ...")
    // 2. monthlyReminder:
    //    найти ближайшую scheduled standard встречу
    //    если её date === today + 3 дня → findLaggardsMonthly → composeMonthlyReminder → sendGroupMessage
  }, { timezone: "Europe/Moscow" });

  // Воскресенье 19:00 MSK: weekly-reminder
  cron.schedule("0 19 * * 0", async () => {
    // weeklyReminder:
    //   currentWeekStart = monday of current week (ISO)
    //   findLaggardsWeekly → composeWeeklyReminder → sendGroupMessage
  }, { timezone: "Europe/Moscow" });
}
```

Инициализация: `src/bot/index.ts` вызывает `startScheduler()` при старте после успешного запуска grammy.

### API

**`POST /api/meetings`** — создать встречу.
Auth: `getCurrentUser()`, без сессии → 401.
Body:
- `date` (string, YYYY-MM-DD, обязательное)
- `kind` (enum, default `"standard"`)
- `organizerId` (string | null, опциональное — должен быть в той же группе или null)
- `location` (string | null, опциональное)
Server ставит `groupId = user.groupId`, `status = "scheduled"`, `createdAt = now`, `id = randomUUID()`.
Validation через inline-стиль (по паттерну telegram-id route).
Возвращает 201 с созданной записью.

**`PATCH /api/meetings/[id]`** — редактировать.
Auth: `getCurrentUser()`. Запись должна принадлежать той же группе (404 иначе, не 403, чтобы не палить существование).
Body (все поля опциональны): `date`, `kind`, `organizerId`, `location`, `status`.
Возвращает 200 с обновлённой записью.

**`GET /api/meetings`** — существующий роут.
Изменение: добавить `WHERE meetings.group_id = user.groupId`. Без сессии → 401.

### UI: `/calendar`

Текущая `page.tsx` превращается в thin server: тянет список встреч + список участников группы, передаёт в новый `CalendarClient.tsx`.

`CalendarClient.tsx` отвечает за:
- рендер карточек (как сейчас) + бейдж типа встречи («ст.» / «ad-hoc»),
- кнопку «Создать встречу» сверху → модалка с формой,
- кнопки «Редактировать» / «Отменить» у предстоящих встреч,
- модалку формы создания/редактирования,
- отправку запросов на API и `router.refresh()` после успеха,
- отображение inline-ошибок от API.

Модалка — обычный div с backdrop (без отдельной библиотеки), по паттерну как в остальных местах проекта (если нет — делаем простой).

### Safety / privacy

- `/api/meetings` (GET/POST/PATCH) — сессия обязательна, `groupId` всегда из сессии. Нельзя создать в чужой группе или увидеть чужие.
- Страница `/calendar` защищена `proxy.ts` (как все main-страницы).
- Ротационные чтения в `ensureNextMeeting` читают только участников **той** группы.

## Тесты

**Unit (vitest):**

- `src/lib/__tests__/rotation.test.ts`:
  - `nextOrganizer`: циклический обход пула, `lastStandardOrganizerId=null` → первый, выбывший организатор → первый, пустой пул → `null`.
  - `nextThirdThursday`: первая/вторая/третья пятница/четверг, переход в следующий месяц, «сегодня = 3-й чт» возвращает сегодня, год-високос проверкой в феврале.

- `src/bot/__tests__/reminders.test.ts`:
  - `findLaggardsWeekly`: все сдали → пусто, один не сдал, все не сдали, игнорирует inactive (если тест требует — передать в пуле только active).
  - `findLaggardsMonthly`: аналогично, с `month` instead of `weekStart`.
  - `composeWeeklyReminder(null)` / `composeMonthlyReminder(null, ...)` → `null` если laggards пустой.
  - `formatMentions`: все с telegramId → с `@`, без telegramId → displayName без `@`, смесь.

**Не тестируем:** сам cron wiring, API routes (по существующему паттерну — тестим helper'ы, роуты — thin adapters).

## Порядок работ

1. Миграция БД + schema.ts + seed.ts: `kind` на `meetings`. Применить на dev.
2. `src/lib/rotation.ts` + тесты (TDD).
3. `src/lib/meetings.ts` (`ensureNextMeeting`).
4. `src/bot/reminders.ts` + тесты (TDD).
5. `src/bot/scheduler.ts` — cron-wiring.
6. `src/bot/index.ts` — вызвать `startScheduler()` при старте.
7. `GET /api/meetings` — фильтр по группе + 401 без сессии.
8. `POST /api/meetings` — реализация.
9. `PATCH /api/meetings/[id]` — реализация.
10. `/calendar` — новый CalendarClient + модалка формы + бейдж типа.
11. Деплой: миграция на prod, build, restart `lumm.service` + `lumm-bot.service`. Проверить `systemctl status` обоих.

## Риски

- **Cron срабатывает до rollout и создаёт невалидную встречу** — не страшно, INSERT фильтруется проверкой «нет будущей standard». Повторный запуск ничего не ломает.
- **ensureNextMeeting создаёт первую встречу, а дата — сегодня (если сегодня 3-й чт)** — это валидно; если не хотим «сегодня», можно `nextThirdThursday` делать `strictlyAfter=true`. YAGNI сейчас.
- **Участник, ставший организатором, удалён/деактивирован до встречи** — ротация не сломается (UI переназначит), следующая ротация найдёт актуального.
- **Cron в момент деплоя/рестарта** — если пропустили 09:00, следующий tick завтра. Не критично.

## Issue tracking

Создать GitHub issue «Эпик 4: календарь встреч + бот-напоминания». Коммиты — с `#N`. Миграция применяется на prod после мержа PR.

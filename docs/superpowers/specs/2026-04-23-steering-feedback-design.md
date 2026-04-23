# «Штурвал» — фидбек-канал через бот

**Дата:** 2026-04-23
**Статус:** дизайн утверждён, к плану

## Контекст

Участникам нужен простой канал сообщить идею / баг / правку, не выходя из Telegram. Админ должен видеть очередь и двигать по статусам. Группа хочет прозрачности — все видят что коллеги пишут и что уже сделано.

Сейчас есть бот-триггер только для еженедельных отчётов (`@bot ... отчёт ...`). Фидбек-канала нет.

## Цель

Добавить отдельный бот-триггер «штурвал» для свободного фидбека, хранить его в БД, дать три UI-точки просмотра.

## Решения

| Вопрос | Выбор |
|---|---|
| Триггер | `@lummbrain_bot штурвал <текст>` (регистронезависимо). Весь остаток сообщения — тело. |
| Категории (bug/идея/вопрос) | Не делаем. Единый фидбек, админ в голове сортирует. |
| Статусы | `new` / `in_progress` / `done` / `rejected`. Цветной бейдж. |
| Видимость | (1) `/feedback` — открыта всем участникам группы; (2) `/profile` блок «Мой штурвал» — только свои; (3) admin в `/feedback` видит кнопки смены статуса/удаления. |
| Терминология UI | везде «Штурвал» (держим внутренний бренд). |
| Сайдбар | добавить пункт «Штурвал» с иконкой. |
| Удаление | admin-only (автор удалить не может). |
| Редактирование текста | не делаем. Если ошибся — пишет новый штурвал, старый админ отклонит. |
| Ответ бота | «✅ Записал, спасибо. Можно посмотреть на lumm.space/feedback». |

## Скоуп

**Делаем:**
- Миграция + таблица `feedback_items`.
- Бот-триггер + handler + юнит-тесты на чистую логику (trigger match).
- API: `GET /api/feedback`, `GET /api/feedback/mine`, `PATCH /api/feedback/[id]`, `DELETE /api/feedback/[id]`.
- Страница `/feedback` — лента всех + счётчики + admin-кнопки.
- Блок «Мой штурвал» в `/profile`.
- Пункт «Штурвал» в сайдбаре.
- Обновить `/help` с разделом «7. Штурвал».

**Не делаем:**
- Категории.
- Редактирование текста после submit.
- Комментарии на feedback-элементы (можно в будущем).
- Уведомление админа в Telegram о новом штурвале (пусть сам заходит смотреть).
- Auto-create GitHub issue из feedback (overkill).
- Email-нотификации.

## Архитектура

### Схема БД

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

Миграция `scripts/migrations/2026-04-23-feedback-items.sql`:

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

### Бот

**`src/bot/steeringTrigger.ts`** — чистая функция с юнит-тестами:
```ts
export function matchSteeringTrigger(text: string, botUsername: string): string | null;
```

Признаки совпадения:
- Упомянут бот (`@lummbrain_bot` или его текстовый-mention).
- Слово «штурвал» (регистронезависимо).
- Возвращает «тело» = всё что после слова штурвал (обрезать `@lummbrain_bot` и само слово «штурвал»).
- Если тело пустое (только `@bot штурвал`) — возвращает `null` (ничего сохранять).

Тесты: с mention + слово → тело. Без слова → null. Пустое тело → null. Регистр «Штурвал»/«ШТУРВАЛ» → работает. И в личке (без mention?) — **только в группе** с mention. Если в личке — ignore.

**`src/bot/handleSteering.ts`** — IO-хендлер:
```ts
export async function handleSteering(input: {
  text: string;
  fromId: string; // telegram user id
  reply: (msg: string) => Promise<void>;
  baseUrl: string;
}): Promise<void>;
```

Логика:
1. `matchSteeringTrigger(text, BOT_USERNAME)` — вернул null → ничего не делаем.
2. Найти member по `telegram_id = fromId`. Если нет — `reply("Не вижу тебя в системе. Админ должен привязать Telegram ID в /admin/members.")` и выход.
3. Member.status === 'inactive' → reply «ты неактивен, штурвал не принят» и выход.
4. INSERT feedback_items.
5. Reply: `✅ Записал, спасибо. Можно посмотреть на ${baseUrl}/feedback`.

**`src/bot/index.ts`** — добавить dispatch. Сейчас вызывается `handleReport(...)`. Надо разделить:

```ts
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  // Попробовать оба триггера — первый подходящий побеждает.
  const reportBody = matchReportTrigger(text, BOT_USERNAME);
  if (reportBody) { await handleReport(...); return; }

  const steeringBody = matchSteeringTrigger(text, BOT_USERNAME);
  if (steeringBody) { await handleSteering(...); return; }

  // иначе молчим
});
```

Но `handleReport` сейчас сам внутри вызывает `matchTrigger`. Рефакторить не трогаем — просто добавляем второй handler после `handleReport`. Если handleReport что-то делает (сохраняет/отвечает) — return. Если возвращает «не совпало» — пробуем steering. Изменим `handleReport` чтобы возвращал `boolean` (matched/not) — см. Task.

### API

**`GET /api/feedback`** — лента всей группы.
- Auth → 401.
- JOIN members, WHERE members.group_id = user.groupId.
- ORDER BY createdAt DESC.
- Возвращает `{ id, text, status, createdAt, updatedAt, member: { id, displayName, avatarColor, avatarUrl } }[]`.
- Плюс можно в ответ положить `counts: { new, in_progress, done, rejected }` (агрегат), чтобы счётчики рендерить без второго запроса. ИЛИ посчитать на клиенте — список и так придёт.

**`GET /api/feedback/mine`** — свои.
- Auth → 401.
- WHERE member_id = user.id.
- ORDER BY createdAt DESC.
- Те же поля без member (очевидно — это он).

**`PATCH /api/feedback/[id]`** — смена статуса.
- Auth + `user.role === 'admin'` → иначе 403.
- Body: `{ status: "new" | "in_progress" | "done" | "rejected" }`.
- Должен принадлежать той же группе (404 если чужая).
- UPDATE status + updatedAt = now.

**`DELETE /api/feedback/[id]`** — удалить.
- Auth + admin → иначе 403.
- Та же группа (404).
- DELETE.

### UI

**`/feedback/page.tsx`** — server. Fetch весь список группы + current user (для admin-check). Pass в client.

**`FeedbackClient.tsx`** — client:
- Шапка: h1 «Штурвал» + подзаголовок «Идеи, правки, баги. Пиши боту `@lummbrain_bot штурвал <текст>`».
- Счётчики сверху: «Новых: N · В работе: M · Готово: K · Отклонено: L» (маленькие плашки с цветами).
- Лента: карточки с аватаром+ником, текстом (pre-wrap), датой, бейджем статуса.
- Для admin: в каждой карточке dropdown смены статуса + кнопка «Удалить» (`confirm`).
- Пустая лента: «Пока пусто. Напиши боту в группе: `@lummbrain_bot штурвал <текст>`».

**`/profile` блок «Мой штурвал»** — добавить отдельную секцию под блоком целей.
- Fetch `GET /api/feedback/mine` (client-side в useEffect, или server-side в ProfilePage и прокинуть в client).
- Компактный список: дата · статус-бейдж · первые 80 символов текста. Клик → расширить.
- Пустой: «У тебя ещё нет штурвалов. Пиши боту: `@lummbrain_bot штурвал <текст>`».

**Sidebar:** добавить пункт «Штурвал» с иконкой (например `⚓` или `🎯` — в проекте используются символы-глифы как `◇`, `◈`, пусть будет `⚓`).

**`/help`:** добавить секцию 7 «Штурвал» — как пользоваться, кто видит, что делает админ.

### Privacy / Safety

- Все API фильтруют по `user.groupId` (через JOIN members).
- PATCH/DELETE — только admin.
- Бот принимает только от members с `status='active'` и с привязанным `telegram_id`.
- `/feedback` отдаёт displayName + avatar (публичные поля, ок по PRD).

## Тесты

**Unit (vitest):**
- `src/bot/__tests__/steeringTrigger.test.ts`:
  - «`@lummbrain_bot штурвал есть баг`» → "есть баг".
  - «`@lummbrain_bot ШТУРВАЛ важная идея`» → "важная идея" (case-insensitive).
  - «`@other_bot штурвал тест`» → null (не наш бот).
  - «`@lummbrain_bot штурвал`» (без тела) → null.
  - «`@lummbrain_bot отчёт`» (слова штурвал нет) → null.
  - «`штурвал без упоминания`» → null.
  - Упоминание в конце: «`есть баг @lummbrain_bot штурвал`» → "есть баг" (или null? — решаем: трим текста до/после слова «штурвал» не делаем, возвращаем null если слово не идёт после упоминания. Упрощение: считаем что order `mention → steering → body`. Если user хочет иначе — добавим позже).

**Unit (vitest) для `handleSteering`:** можно сделать stub для db+reply, 2-3 теста на основные пути. Опционально — если время позволит.

**API routes, UI** — без тестов (по паттерну проекта).

## Порядок работ

1. Миграция + schema + seed (feedback_items).
2. `steeringTrigger.ts` + юнит-тесты (TDD).
3. `handleSteering.ts` + dispatch в `bot/index.ts` (рефакторинг: `handleReport` возвращает boolean).
4. API: `GET /api/feedback`, `GET /api/feedback/mine`.
5. API: `PATCH /api/feedback/[id]`, `DELETE /api/feedback/[id]`.
6. `/feedback` страница (server + client с admin-actions).
7. Блок «Мой штурвал» в `/profile`.
8. Sidebar — пункт «Штурвал».
9. `/help` — секция 7.
10. Build + PR + deploy.

## Риски

- **Рефакторинг `handleReport`** (чтобы вернуть boolean вместо void) может затронуть существующие тесты. Проверить что `src/bot/__tests__/handleReport.test.ts` зелёный.
- **Telegram user без `telegram_id`** в БД — штурвал отклонён ботом, участник получит пояснение; админ должен привязать.
- **Mention format:** Telegram посылает mention либо как entity, либо в тексте. В проекте уже обрабатывается для weekly-триггера — переиспользуем подход.

## Issue tracking

Создать GitHub issue перед началом работ. Коммиты — с `#N`.

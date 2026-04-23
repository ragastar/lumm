# RSVP на доп. встречи + унифицированные bot-анонсы + термины UI

**Дата:** 2026-04-23
**Статус:** дизайн утверждён, к плану

## Контекст

- Типы встреч `meetings.kind`: `standard | ad_hoc`. В UI сейчас отображаются как «Стандартная» / «Ad-hoc» — техничные, невнятные для пользователя.
- При создании мастермайнда ботом (cron в `scheduler.ts`) есть анонс в группу; при ручном создании встречи через `/calendar` модалку — бот молчит. Непоследовательно.
- При создании любой встречи нет способа «записаться» — если ad-hoc, непонятно кто идёт.
- `/calendar` — только список; детальной страницы встречи нет.

## Цель

Сделать систему встреч user-friendly для группы мастермайнда:

1. UI-термины: «Мастермайнд» вместо «Стандартная», «Доп. встреча» вместо «Ad-hoc».
2. При ручном создании встречи бот шлёт анонс в группу (с `@`-пингом всех для доп. встречи).
3. У доп. встреч есть RSVP: кнопка «Записаться» / «Отменить запись», список идущих на детальной странице.
4. У мастермайндов RSVP не нужен (все активные участники обязаны) — показываем список всех.
5. При отмене встречи бот уведомляет; при прочих правках — молчит.

## Решения брейншторма

| Вопрос | Выбор |
|---|---|
| Скоуп | Один эпик: термины + RSVP + анонсы + детальная страница |
| RSVP на мастермайнде | Не нужен (обязательная встреча) |
| RSVP модель на ad-hoc | Простой opt-in (иду или не указано) |
| Организатор ad-hoc | Автоматически записан при создании |
| Bot-анонс при создании мастермайнда | Как сейчас (только organizer, без `@all`) + ссылка на детальную |
| Bot-анонс при создании ad-hoc | С `@all`-пингом всех активных + ссылка на детальную |
| Bot при правках | Молчит (кроме отмены) |
| Bot при отмене | Пишет «Встреча DD.MM отменена» |
| Cancelled + RSVP | Записи остаются для истории |
| Ручная кнопка «Объявить» | Не делаем (YAGNI) |

## Скоуп

**Делаем:**
- Таблица `meeting_attendees` + миграция.
- API: `POST /api/meetings/[id]/attend`, `DELETE /api/meetings/[id]/attend`, новый `GET /api/meetings/[id]`. Апдейт `POST /api/meetings` (организатор→attendee на ad_hoc + анонс), `PATCH /api/meetings/[id]` (анонс при переходе на cancelled), `GET /api/meetings` (attendeesCount).
- `src/lib/meetingAnnouncements.ts` — `composeAnnouncement` (чистая функция, тестируемая) + `announceMeeting(meetingId, event)` (fetch+send).
- Новая `/calendar/[id]/page.tsx` + `MeetingDetailClient.tsx`.
- Апдейт `/calendar/page.tsx` и `CalendarClient.tsx` — термины, счётчик «Идут», клик на карточку.
- Апдейт `src/bot/scheduler.ts` — использует `announceMeeting`.
- Апдейт `/help` — термины и параграф про RSVP.

**Не делаем:**
- RSVP-состояния «не иду» / «думаю».
- RSVP на мастермайнде.
- Авто-апдейт при edit (кроме cancel).
- Ручная кнопка «Объявить».
- Google Calendar / email интеграции.

## Архитектура

### Схема БД

Новая таблица `meeting_attendees`:

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

Миграция:
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

Отмена встречи (`status='cancelled'`) не удаляет записи — остаются для истории.

### API

**`POST /api/meetings/[id]/attend`** (записаться)
- Auth → 401 без сессии.
- Meeting exists + groupId match → иначе 404.
- `kind='ad_hoc'` → иначе 400 «RSVP только для доп. встреч».
- `status='scheduled'` → иначе 400 «Встреча не активна».
- INSERT `meeting_attendees`; при UNIQUE-конфликте — игнорируется (идемпотентно), возвращаем 200.
- Ответ: `200 { ok: true, attendeesCount }`.

**`DELETE /api/meetings/[id]/attend`** (отменить запись)
- Та же auth и проверки.
- DELETE `meeting_attendees WHERE meeting_id=? AND member_id=user.id`. Если записи нет — 200 (идемпотентно).
- Ответ: `200 { ok: true, attendeesCount }`.

**`GET /api/meetings/[id]`** (новый, для детальной)
- Auth → 401; groupId-check → 404.
- Возвращает: `{ id, date, timeStart, timeEnd, kind, status, location, price, organizer: { id, displayName, avatarColor, avatarUrl, telegramUsername } | null, attendees: [{ memberId, displayName, avatarColor, avatarUrl, telegramUsername }] }`. `attendees` отсортированы по `meeting_attendees.createdAt ASC`.

**`POST /api/meetings`** (изменения)
- После INSERT meeting — если `kind='ad_hoc'` и `organizerId !== null`: INSERT attendee (игнор UNIQUE).
- Затем `await announceMeeting(meetingId, "created")` (не падать, если шлёт ошибку).

**`PATCH /api/meetings/[id]`** (изменения)
- Если `status` меняется с `scheduled` на `cancelled` — после UPDATE `await announceMeeting(meetingId, "cancelled")`.

**`GET /api/meetings`** (изменения)
- Добавляем поле `attendeesCount: number` через LEFT JOIN + `count()`. Для не-ad_hoc можно возвращать `null` или `0` — UI игнорирует для standard.

### `src/lib/meetingAnnouncements.ts`

```ts
type AnnounceEvent = "created" | "cancelled";

type AnnouncementInput = {
  meeting: { id, date, timeStart, timeEnd, kind, location, price };
  organizer: { displayName, telegramUsername } | null;
  members: Array<{ displayName, telegramUsername }>; // active group members, включая организатора
  baseUrl: string; // "https://lumm.space"
};

export function composeAnnouncement(event: AnnounceEvent, input: AnnouncementInput): string;

export async function announceMeeting(meetingId: string, event: AnnounceEvent): Promise<void>;
```

`composeAnnouncement` — чистая функция, testable.

`announceMeeting`:
1. SELECT встречу + организатора (LEFT JOIN members).
2. Если нет — бросить (быть не должно).
3. Если `event='created'` и `kind='ad_hoc'` — SELECT всех active members группы для `@all`-пинга.
4. Позвать `composeAnnouncement`.
5. `sendGroupMessage({ chatId: process.env.GROUP_CHAT_ID, text })`. Ошибка — log, не бросать (не блокируем API).

**Шаблоны** (утверждённые в брейншторме):

- **created, ad_hoc:**
  ```
  @a @b @c — {organizer} зовёт на доп. встречу DD.MM.YYYY HH:MM–HH:MM.
  Адрес: X
  Цена: N ₽ (M ₽/чел)   [если price задана и > 0]
  Записаться: https://lumm.space/calendar/{id}
  ```
  `@a @b @c` — все active members с `telegramUsername` (включая организатора). Кто без username — просто имя без `@`.

- **created, standard:**
  ```
  Следующий мастермайнд: DD.MM.YYYY HH:MM–HH:MM
  Ведёт: @organizer
  Адрес: X (или «не указан»)
  Цена: N ₽ (M ₽/чел)   [если price задана и > 0]
  Детали и правки: https://lumm.space/calendar/{id}
  ```
  Без `@all`.

- **cancelled (любой kind):**
  ```
  Встреча DD.MM.YYYY HH:MM–HH:MM отменена. Организатор: @organizer.
  ```

### `src/bot/scheduler.ts`

Заменяем inline-формирование сообщения на:
```ts
if (result.created) {
  await announceMeeting(result.meetingId, "created");
}
```

### UI

**`/calendar`** (CalendarClient):
- Лейблы типов: «Мастермайнд» / «Доп. встреча». В карточках («Стандартная»/«Ad-hoc» было) и в radio-кнопках формы.
- На карточках предстоящих, для `kind='ad_hoc'` — строка «Идут: N».
- Карточки предстоящих и прошедших — кликабельные (`router.push('/calendar/<id>')`), но кнопки «Редактировать», «Отменить», «Записаться» внутри — свои обработчики (stopPropagation).

**`/calendar/[id]`** (новый):
- Server component: fetch встречу+organizer+attendees (для ad_hoc) ИЛИ active members (для standard).
- Client component рисует:
  - «← К календарю».
  - Бейдж типа, бейдж статуса.
  - Блок «Когда»: дата + время + countdown.
  - Блок «Где»: адрес.
  - Блок «Сколько»: `price ₽ всего, per_person ₽/чел (делится на N активных)` — если price задана.
  - Блок «Организатор»: аватар + ник.
  - Блок «Участники»:
    - ad_hoc: «Идут N/K» + список аватаров, кнопка «Записаться»/«Отменить запись» (если `status='scheduled'`).
    - standard: «Ожидаются: @все» + список, organizer с бейджем «ведёт», без кнопок.
  - Кнопки «Редактировать»/«Отменить» на детальной **не добавляем** в MVP — они уже есть на `/calendar`, юзер возвращается в список для правок (YAGNI; в будущем можно вынести модалку в shared компонент).

**`/help`**:
- В секции 6 заменить «Стандартная» → «Мастермайнд», «Ad-hoc» → «Доп. встреча».
- Новый параграф: «У доп. встреч на странице встречи есть кнопка «Записаться» — нажми, попадёшь в список идущих. При создании доп. встречи бот автоматически пингает всех в групповом чате и даёт ссылку на страницу встречи».

### Privacy / Safety

- Все новые эндпоинты фильтруют по `user.groupId`. 404 при чужой группе (без утечки существования).
- Детальная страница — доступна только залогиненным и только в своей группе.
- `@all`-пинг в доп. встречах — только для активных членов группы.

## Тесты

**Unit (vitest):**
- `src/lib/__tests__/meetingAnnouncements.test.ts` — `composeAnnouncement`:
  - standard created: текст, корректная дата/время, organizer с @, без `@all`.
  - standard created без price — строка про цену отсутствует.
  - ad_hoc created: текст, `@all`-пинг всех с username, имена без username — без @.
  - ad_hoc created без price.
  - ad_hoc created без организатора (null) — «ещё не назначен» или опустить.
  - cancelled: текст единый для обоих kind, включает organizer.
  - cancelled без организатора.

API endpoints и UI — без юнит-тестов (thin adapters, пропатчим в ручной проверке на dev).

## Порядок работ

1. Миграция БД + schema.ts + seed.ts.
2. `src/lib/meetingAnnouncements.ts` + тесты (TDD).
3. API: `POST /api/meetings/[id]/attend`, `DELETE /api/meetings/[id]/attend`, новый `GET /api/meetings/[id]`.
4. Апдейты в `POST /api/meetings` (organizer→attendee + announce) и `PATCH` (announce on cancel).
5. Апдейт `GET /api/meetings` (attendeesCount).
6. Рефакторинг `src/bot/scheduler.ts` на `announceMeeting`.
7. Новая страница `/calendar/[id]/page.tsx` + `MeetingDetailClient.tsx`.
8. Апдейт `/calendar/CalendarClient.tsx` + `page.tsx` (термины, счётчик, клик).
9. Апдейт `/help` (термины + RSVP абзац).
10. Build + деплой (миграция, rebuild, restart обоих сервисов).

## Риски

- **Anti-spam бота:** двойное создание встречи через UI (клик-клик) → два анонса. Приемлемо (редкий случай; API не блокирует).
- **`@all`-пинг может раздражать** если доп. встречи станут частыми. Пока запустим как есть; если группа начнёт жаловаться — добавим чекбокс «не пинговать всех» в форме.
- **Синхронизация счётчика attendeesCount:** `GET /api/meetings` использует subquery count. Будет чуть медленнее, но приемлемо для <100 встреч.

## Issue tracking

Issue уже создан (см. в плане). Коммиты — с `#N`. Деплой — после мержа PR.

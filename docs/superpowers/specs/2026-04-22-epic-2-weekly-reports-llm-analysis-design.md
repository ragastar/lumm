# Эпик 2: Еженедельные отчёты через бота + LLM-анализ — Дизайн

Второй эпик v0.1 БЕТА. Telegram-бот ловит еженедельные отчёты в групповом чате, отправляет в Claude через OpenRouter, получает трёхслойный анализ (светофор + блоки + коуч), сохраняет в БД, отвечает в чат подтверждением со ссылкой на веб-страницу отчёта.

## Цели эпика

1. Участник пишет отчёт в групповом чате одним сообщением — бот принимает
2. LLM анализирует отчёт с учётом зафиксированных бизнес- и спорт-целей участника
3. Анализ сохраняется в БД и доступен в вебе на `/reports/[id]`
4. Команда видит живую ленту отчётов на `/reports` с цветами светофоров

## Решения (утверждены в брейнсторме)

| # | Решение | Вариант |
|---|---|---|
| 1 | Telegram → LUMM mapping | **A** — админ вручную вбивает `telegram_id` каждому в `/admin/members` (узнаётся через `@userinfobot`) |
| 2 | Модель LLM | **Sonnet 4.6** через OpenRouter (`anthropic/claude-sonnet-4-6`) |
| 3 | Ответ бота в группе | **A** — короткое подтверждение со ссылкой, анализ только в вебе |
| 4 | Формат LLM-вывода | **Строгий JSON** через `response_format: { type: "json_object" }`, ретрай 1 раз при парс-фейле |
| 5 | Отображение в вебе | **A** — `/reports/[id]` + простой список `/reports` |
| 6 | Нет целей у юзера | **A** — блок с просьбой заполнить, отчёт не сохраняется |
| 7 | Деплой бота | **A** — отдельный `lumm-bot.service` (независимо от `lumm.service`) |
| 8 | Триггер | **B** — гибко: `@lummbrain_bot` + «еженедельный отчёт» в любом порядке, регистронезависимо |

## Архитектура

```
┌───────────────────────────┐      ┌──────────────────────┐
│   Telegram (группа)       │◄────►│   lumm-bot.service   │
│   @lummbrain_bot …        │      │   (grammy polling)   │
└───────────────────────────┘      └──────────┬───────────┘
                                              │
                              ┌───────────────┼──────────────┐
                              │               │              │
                         check goals      save report     call OpenRouter
                              │               │              │
                              └───────────────┼──────────────┘
                                              ▼
                                     ┌────────────────┐
                                     │  SQLite (lumm) │
                                     └────────────────┘
                                              ▲
                                              │ read
                                     ┌────────┴───────┐
                                     │  lumm.service  │
                                     │  /reports/[id] │
                                     │  /reports      │
                                     └────────────────┘
```

Два независимых systemd-процесса делят один SQLite-файл `data/lumm.db`. Падение бота не роняет сайт и наоборот.

## Данные

### Существующее используем как есть

- `members.telegram_id` — уже в схеме (колонка nullable). Заполняется админом вручную.
- `members.business_goal`, `sport_goal` — из Эпика 1. Источник целей для LLM-промпта.

### Меняем в `weekly_reports`

- **ADD** `raw_text TEXT` (nullable) — полный текст отчёта от юзера. Старые поля (`businessText`, `familyText`, `personalText`, `scoreBusiness/Family/Personal`, `planText`) оставляем как есть — они nullable, пригодятся в Эпике 3 для формы веб-отчёта.

### Новая таблица `report_analyses`

```sql
CREATE TABLE report_analyses (
  id             TEXT PRIMARY KEY,
  report_id      TEXT NOT NULL REFERENCES weekly_reports(id),
  traffic_light  TEXT NOT NULL,   -- "green" | "yellow" | "red"
  did            TEXT NOT NULL,   -- что сделал к цели
  missed         TEXT NOT NULL,   -- что упустил
  next_question  TEXT NOT NULL,   -- вопрос на следующую неделю
  coach          TEXT NOT NULL,   -- коуч-рефлексия
  model          TEXT NOT NULL,   -- "anthropic/claude-sonnet-4-6"
  created_at     TEXT NOT NULL
);
```

Один отчёт — один анализ (1:1). Ретрай на уровне LLM-вызова происходит ДО записи в БД, поэтому одной успешной попытке соответствует ровно одна запись `report_analyses`. Если обе попытки упали — отчёт остаётся в `weekly_reports` без связанного анализа (см. «Обработка ошибок» ниже).

Уникальность: `UNIQUE(report_id)` — на случай багов, один отчёт не может иметь два анализа.

## Компоненты

### Backend — бот

**`src/bot/index.ts`** (переписать)
- grammy-инстанция c `TELEGRAM_BOT_TOKEN` из env
- Polling-режим
- Единственный хэндлер `bot.on("message")` → делегат в `handleReport`
- Запуск через `npm run bot` (уже в `package.json` как `npx tsx src/bot/index.ts`)

**`src/bot/trigger.ts`** (создать)
- Экспортирует `matchTrigger(text: string): string | null`
- Регекс case-insensitive, ловит случай: в тексте есть и `@lummbrain_bot`, и словосочетание «еженедельный отчёт»
- Возвращает `body` — текст отчёта с удалённым триггером и упоминанием (обрезка с обеих сторон, trim)
- Если не матчится — `null`

Примеры:
- ✅ `@lummbrain_bot Еженедельный отчёт бизнес провалил спорт тоже` → body = `бизнес провалил спорт тоже`
- ✅ `Еженедельный отчёт: закрыл сделки, пробежал 10 км. @lummbrain_bot` → body = `: закрыл сделки, пробежал 10 км.`
- ✅ `@lummbrain_bot еженедельный отчёт...` (маленькая буква) → матчится
- ❌ `@lummbrain_bot напомни завтра` → null
- ❌ `Еженедельный отчёт` без упоминания бота → null

**`src/bot/handleReport.ts`** (создать)

Оркестратор:
1. `matchTrigger(ctx.message.text)` → если null, выход
2. SELECT member WHERE telegram_id = ctx.from.id → если нет, ответ «Ты не привязан к LUMM, попроси админа»
3. Если `businessGoal` или `sportGoal` пустой → ответ «Заполни цели в /profile»
4. Вычислить `weekStart` (понедельник текущей недели ISO `YYYY-MM-DD`)
5. INSERT в `weekly_reports` (id=nanoid, memberId, weekStart, rawText=body, source='telegram')
6. `analyze({ goals: { business, sport }, reportText: body })` → JSON
7. INSERT в `report_analyses`
8. Ответ в чат: `✅ {displayName}, отчёт принят. Анализ: https://lumm.space/reports/{reportId}`

### Backend — LLM

**`src/lib/analyzer.ts`** (создать)

```typescript
type Analysis = {
  trafficLight: "green" | "yellow" | "red";
  did: string;
  missed: string;
  nextQuestion: string;
  coach: string;
  model: string;
};

type AnalyzeArgs = {
  goals: { business: string; sport: string };
  reportText: string;
};

export async function analyze(args: AnalyzeArgs): Promise<Analysis>
```

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Headers: `Authorization: Bearer ${OPENROUTER_API_KEY}`, `HTTP-Referer: https://lumm.space`, `X-Title: LUMM`
- Body:
  ```json
  {
    "model": "anthropic/claude-sonnet-4-6",
    "response_format": { "type": "json_object" },
    "max_tokens": 1200,
    "messages": [
      { "role": "system", "content": "<SYSTEM_PROMPT>" },
      { "role": "user", "content": "Бизнес-цель: ...\nСпорт-цель: ...\n\nОтчёт:\n..." }
    ]
  }
  ```
- Парс `choices[0].message.content` → `JSON.parse`
- При сбое парсинга ИЛИ если нет нужных полей → один ретрай с тем же промптом
- После второй неудачи — кидаем ошибку с текстом для отображения в чате

### Системный промпт (первая версия)

```
Ты коуч мастермайнд-группы. На входе — цели участника и его отчёт за неделю.
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
Не придумывай факты — работай только с тем, что написано в отчёте.
```

Будем подстраивать после первых 3-5 реальных отчётов.

### Веб — чтение

**`src/app/(main)/reports/page.tsx`** (переписать — сейчас заглушка)

Server Component. Список всех отчётов группы (`member.groupId` совпадает с current user's groupId), сортировка — новые сверху.

Каждый элемент:
- Дата отчёта (форматированная)
- Аватар + displayName автора (ссылка на `/members/[id]`)
- Светофор-пилюлька (🟢/🟡/🔴 + color class)
- Первая строка `coach` (truncate до 120 символов)
- Кнопка «Подробнее» → `/reports/[id]`

Пагинация на этот этап не нужна — 4-6 человек × 1 отчёт в неделю × несколько месяцев = до сотни записей.

**`src/app/(main)/reports/[id]/page.tsx`** (создать)

Server Component. Проверка что `member.groupId` совпадает с current user's groupId — иначе `notFound()`. Структура:

- Навигация: «← К ленте отчётов»
- Шапка: автор (аватар + имя), дата, светофор-бейдж
- Секция «Текст отчёта» — `raw_text` в `<pre class="whitespace-pre-wrap">`
- Секция «Цели на момент отчёта» — `member.businessGoal`, `sportGoal` (snapshot на текущий момент, не исторический)
- Секция «Анализ»:
  - «Что сделал к цели» → `did`
  - «Что упустил» → `missed`
  - «Вопрос на следующую неделю» → `next_question` (выделено визуально, акцент)
  - «Коуч» → `coach` (длинный текст)
- **Если анализ отсутствует** (LLM обе попытки упали): показать плейсхолдер «Анализ не удался — попробуем ещё раз позже» вместо блоков. Список `/reports` в таком случае отображает серую пилюльку «без анализа» вместо цветного светофора.

### Админка — маппинг Telegram

**`src/app/(main)/admin/members/MembersClient.tsx`** (расширить)

К существующим полям (сброс пароля, активация/деактивация) добавить инлайн-редактирование `telegram_id`:

- Отдельная колонка в таблице (или компактное поле под именем)
- `<input type="text" placeholder="напр. 123456789" />` + кнопка «Сохранить»
- Подсказка «как узнать: написать `@userinfobot` в Telegram, бот ответит твоим id»
- Сохранение через PATCH `/api/admin/members/[id]`

**`src/app/api/admin/members/[id]/route.ts`**

Если route не существует — создать. Если существует (для других операций) — расширить PATCH. Принимать `{ telegramId?: string | null }`. Валидация: строка из цифр (до 15 символов, числовой Telegram user_id), либо null. Уникальность **глобальная**: один Telegram-аккаунт — один LUMM-member (при попытке присвоить уже занятый id — 409 Conflict).

### Инфра — systemd unit для бота

**`/etc/systemd/system/lumm-bot.service`**

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

Активация: `systemctl daemon-reload && systemctl enable --now lumm-bot`. Логи: `journalctl -u lumm-bot -f`.

## Обработка ошибок

| Сценарий | Поведение |
|---|---|
| Триггер не матчится | Тихо игнорируем (не спамим в группе). |
| Нет member по `telegram_id` | Бот: «Ты не привязан к LUMM. Попроси админа добавить твой Telegram в `/admin/members`.» |
| Есть member, но цели пустые | Бот: «{displayName}, у тебя не заполнены цели. Зайди в https://lumm.space/profile → «Мои цели». Пришли отчёт снова после.» |
| LLM вернул невалидный JSON | Ретрай 1 раз → если опять: отчёт сохраняется, бот: «{displayName}, отчёт сохранён, но анализ не получился. Посмотри админ.» |
| OpenRouter HTTP 5xx/429 | fetch с одним повтором через 30 сек → после второй неудачи — как выше. |
| БД INSERT упал | Бот: «Что-то пошло не так, попробуй через минуту.» В логи. |
| Telegram API недоступен | `grammy` handled. Логи. Юзер повторит сам. |
| Бот упал процессом | `systemd Restart=always` поднимет через 5 сек. |

## Приватность

- `/reports` и `/reports/[id]` доступны **только членам той же группы** (фильтрация по `groupId` через join с `members`).
- Анонимусам — redirect на `/login`.
- `telegram_id` — не публичное поле, только админ видит в `/admin/members`.

## Тестирование

### Unit (vitest)

- `src/bot/__tests__/trigger.test.ts` — 6-8 кейсов: точный матч, разный регистр, упоминание в конце/середине, только упоминание без фразы, только фраза без упоминания, пустая строка, множественные пробелы/переносы, body-экстракция корректна.
- `src/lib/__tests__/analyzer.test.ts` — мокаем `fetch`:
  - корректный POST на OpenRouter с правильным телом (model, response_format, messages)
  - парсинг валидного JSON
  - ретрай при невалидном JSON
  - ретрай при HTTP 5xx
  - пробрасывание ошибки после двух неудач
- `src/bot/__tests__/handleReport.test.ts` — оркестратор с моками `db` и `analyze`. Сценарии:
  - нет member → ответ про привязку
  - есть member без целей → ответ про заполнение целей
  - успешный путь → INSERT'ы + ответ с ссылкой

### Manual smoke

1. Заполнить `telegram_id` себе в `/admin/members`
2. Написать тестовый отчёт в группу с триггером
3. Проверить:
   - бот ответил через 5-15 сек со ссылкой
   - ссылка открывает `/reports/[id]`, видны текст + анализ
   - `/reports` показывает пост в ленте
   - повторная отправка создаёт новый отчёт, не ломается

## Что не входит в эпик

- Ежемесячные/квартальные отчёты — Эпик 3
- Полноценные дашборды с графиками — Эпик 4
- Напоминания (воскресенье/четверг), cron
- История изменения целей (snapshot анализа показывает текущие цели, не те что были на момент отчёта)
- Inline-кнопки, редактирование отчёта через бота
- Поддержка хэштегов `#отчёт`/`#report` как триггеров (решено явно не делать)
- Внутренняя группировка отчётов по неделям (планы/дашборды — в Эпике 4)

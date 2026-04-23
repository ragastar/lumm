# LUMM Goal System («Wombo Combo»)

**Дата:** 2026-04-23
**Статус:** дизайн утверждён, к плану

## Контекст

Сейчас у участника в `/profile` два простых текстовых поля — `businessGoal` и `sportGoal`. Их видит группа в `/members/[id]`, бот сверяет с ними еженедельные отчёты.

Этого недостаточно для серьёзной постановки цели: SMART-подход без эмоциональной валидации, без работы с препятствиями, без проверки самосогласованности — цели не доживают до конца цикла (по опросу Mooncamp 2024 доходят 8% от поставленных в начале года). LUMM — мастермайнд-проект, и постановка цели — его ядро.

Готова методология «Wombo Combo» (артефакт React-мастера + обоснование в `why_this_system.md`): гибрид WOOP + HARD + 12 Week Year + психометрические шкалы Sheldon-Elliot (SCI) и Klein. Нужно встроить в LUMM как отдельный путь постановки цели **рядом** с существующими простыми полями — чтобы протестировать восприятие на живой группе, не ломая текущий флоу.

## Цель

Дать участнику путь «кнопка в сайдбаре/профиле → лендинг с обоснованием методологии → мастер из 9 экранов → сохранение структурной цели → публичный просмотр». Оставить существующие `businessGoal`/`sportGoal` нетронутыми.

## Решения

| Вопрос | Выбор |
|---|---|
| Стыковка с текущими простыми целями | Живёт **рядом**, не заменяет. Старые поля не трогаем. |
| Видимость структурной цели | **Всё публично** другим участникам группы (как и простые цели сейчас). |
| Жизненный цикл | **Одна активная цель на пользователя.** Перезаполнение = перезапись. Истории циклов нет. |
| Точки входа | Пункт сайдбара «🎯 Цель на 12 недель» с `NEW`-бейджем + переливающаяся CTA в `/profile`. |
| URL-неймспейс | `/goal` (лендинг), `/goal/new` (мастер), `/goal/my` (свой просмотр), `/goal/[memberId]` (чужой). |
| Редактирование | Мягкий замок — save делает read-only, но доступны «Уточнить формулировку» (открывает мастер с pre-fill) и «Отказаться от цели» (DELETE). На будущее — поле `locked` в БД для методологического контракта «12 недель фиксировано». |
| Глубина лендинга | Средний (~8 секций): hero, 4 дефекта, разбор фреймворков, 4-слойная архитектура, проверка 5+5, научная база, кому подойдёт, возражения. |
| Визуальный язык | Компромисс: лендинг `/goal` и просмотр `/goal/my` — в LUMM-палитре (dark + gold). Мастер `/goal/new` — в editorial-палитре шаблона (cream + burnt-orange, Fraunces serif). После сохранения возврат в LUMM-палитру. |
| Хранение | Гибрид: ключевые поля (`wish`, `sphere`, `sci_score`, `klein_avg`, `difficulty`, `metric_*`) — колонки; остальные ~25 полей — JSON в `data`. |
| Уникальность | `UNIQUE(member_id)` — одна цель на участника. Upsert при сохранении. |
| Автосохранение черновика | `localStorage['lumm.goal-draft.<memberId>']`, debounced. При возврате на `/goal/new` — читаем draft и восстанавливаем. |
| Quality-check блокирует save | Нет. Юзер может сохранить и «не-зелёную» цель (мастер показывает статус, но не запрещает). Если не готова к защите — предупредительная плашка. |
| Бот-интеграция в MVP | Нет. Бот пока не знает про структурную цель, не анонсирует её, не использует в анализе. Это минимальная поверхность для теста восприятия. |

## Скоуп

**Делаем:**
- Миграция + таблица `goal_plans`.
- Чистые функции в `src/lib/goalPlan.ts`: `computeSciScore`, `computeKleinAvg`, `validateGoalPlanPayload` (Zod). Юнит-тесты на них.
- API: `GET /api/goal-plans/me`, `POST /api/goal-plans` (upsert), `DELETE /api/goal-plans/me`, `GET /api/goal-plans/[memberId]`.
- Страница `/goal` — лендинг, 8 секций, LUMM-палитра, серверный компонент без клиентской логики (только `<details>` для аккордеона).
- Страница `/goal/new` — мастер. Портированный артефакт + адаптации (см. ниже). Own layout без сайдбара.
- Страница `/goal/my` — read-only просмотр заполненной цели в LUMM-палитре. Кнопки «Уточнить формулировку» / «Отказаться от цели».
- Страница `/goal/[memberId]` — публичный просмотр чужой цели (той же группы).
- В `/profile` — блок «LUMM Goal System (Wombo Combo)» с переливающейся CTA → `/goal` (если цели нет) или «Открыть мою цель» → `/goal/my` (если есть).
- В `/members/[id]` — блок «Структурная цель» если заполнена.
- Пункт сайдбара «🎯 Цель на 12 недель» с `NEW`-бейджем.
- Защита роутов в `src/proxy.ts` (`/goal*`, `/api/goal-plans/*` — только auth).
- CSS-анимация `.btn-shimmer` в `globals.css` (работает в обеих темах).

**Не делаем:**
- История циклов (только одна активная цель).
- Приватные поля (всё публично).
- Бот-триггеры / анонсы / LLM-анализ по структурной цели.
- Автоматическое перенесение `wish` в `businessGoal` при сохранении. Поля независимы.
- Принудительный quality-check на сохранение (мягкий UX-статус).
- Методологический lock на 12 недель (колонка `locked` заложена, но always 0 в MVP).
- Телеметрия поведения (кто где бросил, как часто редактирует). Смотрим вручную по `updated_at` и факту заполнения.
- E2E / визуальные тесты мастера.

## Архитектура

### Модель данных

```
goal_plans
  id            text PK                  -- uuid
  member_id     text NOT NULL UNIQUE     -- FK members(id) ON DELETE CASCADE
  wish          text NOT NULL            -- короткая фраза (WOOP wish) — для /members и карточек
  sphere        text NOT NULL            -- business|health|skills|family|creative|finance
  sci_score     integer NOT NULL         -- Sheldon-Elliot SCI, диапазон примерно -16..+16
  klein_avg     real NOT NULL            -- Klein commitment, 1.0..5.0
  difficulty    integer NOT NULL         -- 1..10
  metric_name   text NULL                -- может быть не заполнено
  metric_start  text NULL
  metric_target text NULL
  data          text NOT NULL            -- JSON: весь остальной payload мастера
  locked        integer NOT NULL DEFAULT 0  -- 0=редактируемо; 1=замок на будущее
  created_at    text NOT NULL
  updated_at    text NOT NULL
```

Миграция: `scripts/migrations/2026-04-23-goal-plans.sql` (CREATE TABLE + индекс на `member_id` через UNIQUE).

Drizzle-схема в `src/db/schema.ts`: добавить `goalPlans`.

**JSON в `data`** (shape, нормализованный из template):
```
{
  name, cycleStart, partner,
  annualGoal, cyclePosition, annualServing, plannedArc[4],
  sphereReason, baseline,
  internalReason, hiddenTest, successScene, costOfInaction, newSkills,
  outcomeExternal, outcomeInternal,
  primaryObstacle, secondaryObstacle, obstacleType,
  ifThen: [{when, then} × 3],
  leadActions: [{name, freq} × 3],
  milestone14, milestone58, milestone912,
  sciShame, sciExternal, sciIdentified, sciIntrinsic,
  klein1, klein2, klein3, klein4,
  coherenceLong, coherenceWide,
  nonGoals: [string × 5],
  confirm: [boolean × 4]
}
```

### API

Все эндпоинты защищены через `src/proxy.ts` (auth требуется).

**`GET /api/goal-plans/me`** → `GoalPlan | null`
Своя цель текущего юзера. Используется `/goal/my` (SSR в server component) и `/profile` (SSR).

**`POST /api/goal-plans`** → `{ id }`
Upsert (`INSERT ... ON CONFLICT(member_id) DO UPDATE`). Body валидируется Zod-схемой в `validateGoalPlanPayload`. Сервер пересчитывает `sci_score` и `klein_avg` из raw-полей — не доверяем клиенту.
- `400` при невалидном body + `fieldErrors` (клиент подсвечивает поля)
- `409` если `locked === 1` (MVP — не выстрелит)
- `wish` required, 20–200 символов (клиент показывает мягкий индикатор 8–18 слов из шаблона; серверная граница жёстче)
- `sphere` must be one of 6 значений

**`DELETE /api/goal-plans/me`** → `204`
Сброс цели. Confirm-диалог на клиенте.

**`GET /api/goal-plans/[memberId]`** → `GoalPlan | null`
Чужая цель. Фильтр — same `groupId` (политика как в `/api/meetings/[id]` и `/api/members/[id]`): если member в другой группе — `404`, не утекаем факт существования.

### UI

**`/goal` — лендинг (server component, LUMM dark).**
Файл: `src/app/(main)/goal/page.tsx`.
8 секций, описанных в design sec.5: hero → 4 дефекта → разбор фреймворков → 4-слойная архитектура → проверка 5+5 → научная база (таблица с цифрами) → кому подойдёт/нет → возражения (`<details>`-аккордеоны). 2 инстанса переливающейся CTA «Начать заполнение».
Если у юзера уже есть цель (SSR `GET /api/goal-plans/me`) — в hero приоритет на «Открыть мою цель» → `/goal/my`, а «Начать заполнение» становится вторичной «Заполнить заново».

**`/goal/new` — мастер (editorial).**
Файлы:
- `src/app/(main)/goal/new/layout.tsx` — own layout, перекрывает родительский `(main)/layout.tsx` (убирает сайдбар, цвет фона cream). Шрифты Fraunces + Manrope через `next/font/google`.
- `src/app/(main)/goal/new/page.tsx` — server: SSR загружает existing plan через `GET /api/goal-plans/me`, передаёт `initialData` клиентскому компоненту.
- `src/app/(main)/goal/new/GoalWizard.tsx` — client: весь код из артефакта + адаптации.

Адаптации артефакта:
1. Шрифты через `next/font`, не через `<style>{fontImports}</style>`.
2. Иконки `lucide-react` (проверить `package.json` на этапе плана; если нет — добавить).
3. `useEffect` для автосохранения draft в `localStorage['lumm.goal-draft.<memberId>']` (debounce 500мс).
4. При mount читаем draft; если есть `initialData` (edit-flow) — приоритет у initialData.
5. На шаге Summary — три кнопки: **«Сохранить и посмотреть»** (primary, POST → redirect `/goal/my`), «Скопировать markdown», «Распечатать / PDF».
6. Если не все quality-checks зелёные при попытке сохранить — `window.confirm('Цель пока не прошла проверку качества. Сохранить всё равно?')`.
7. Сплит файла: основной компонент держит state + navigation; экраны 0–8 — в `src/app/(main)/goal/new/steps/Step*.tsx`. Порог — если после сплита основной < 300 строк и каждый шаг < 250. Иначе откладываем.

**`/goal/my` — свой просмотр (LUMM dark).**
Файлы: `src/app/(main)/goal/my/page.tsx` (server, SSR plan) + `src/app/(main)/goal/my/GoalView.tsx` (presentational). Показывает те же поля что summary в мастере, но в LUMM-палитре и без кнопок копирования. Кнопки: «Уточнить формулировку» → `/goal/new?edit=1`, «Отказаться от цели» → `DELETE /api/goal-plans/me` с confirm. Если цели нет — `redirect('/goal')` на уровне server page (не 404: логика «я на свою цель, которой нет — покажи лендинг»).

**`/goal/[memberId]` — чужой просмотр (LUMM dark).**
Файлы: `src/app/(main)/goal/[memberId]/page.tsx`. Та же `GoalView`, но без admin-кнопок (read-only всем). Если чужой member в другой группе — `notFound()`.

**`/profile` — блок «LUMM Goal System».**
Добавляем в `ProfileClient.tsx` новую секцию между «Мои цели» и «Мой штурвал»:
- Если цели нет: заголовок «LUMM Goal System (Wombo Combo)», короткий pitch (2 предложения), переливающаяся CTA «Узнать и попробовать» → `/goal`.
- Если цель есть: заголовок + summary-строка `{wish}`, кнопка «Открыть мою цель» → `/goal/my`.

**`/members/[id]` — блок «Структурная цель».**
SSR `GET /api/goal-plans/[id]` в server page. Если есть — рендерим карточку с wish, метрикой (start→target), типом препятствия, SCI/Klein бейджами. Ссылка «Полный план» → `/goal/[id]`.

**Сайдбар.**
В `src/components/Sidebar.tsx` — новый пункт «🎯 Цель на 12 недель» → `/goal` с `NEW`-бейджем. Позиционируется между «Участники» и «Штурвал» (идёт от «публичных людей» к «фидбеку»).

### CSS-анимация переливающейся кнопки

В `globals.css`:
```
@keyframes lumm-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.btn-shimmer {
  background: linear-gradient(
    90deg,
    var(--lumm-gold) 0%,
    var(--lumm-gold-light) 50%,
    var(--lumm-gold) 100%
  );
  background-size: 200% 100%;
  animation: lumm-shimmer 2.4s linear infinite;
  color: var(--lumm-black);
}
@media (prefers-reduced-motion: reduce) {
  .btn-shimmer { animation: none; }
}
```
Работает в обеих темах (dark + light) — переменные уже обе определены после Эпика #21. `prefers-reduced-motion` обязателен — accessibility.

### Proxy

В `src/proxy.ts` добавить в секцию auth-required:
- `/goal`, `/goal/new`, `/goal/my`, `/goal/:memberId` (через matcher)
- `/api/goal-plans/:path*`

## Тесты

- `src/lib/goalPlan.test.ts` — юниты на `computeSciScore`, `computeKleinAvg`, `validateGoalPlanPayload`. Кейсы:
  - SCI: все 1 → min; все 9 → max; микс → корректная арифметика (`intrinsic + identified − shame − external`).
  - Klein: все 1 → 1.0; все 5 → 5.0; микс → среднее.
  - Validate: missing wish → error; wish > 200 → error; неизвестный sphere → error; неизвестный obstacleType → error; все поля валидны → pass + нормализованный payload.
- Нет E2E / визуальных тестов мастера.
- Ручная проверка: пройти мастер целиком как admin + один обычный юзер, проверить save/edit/delete/просмотр другого участника.

## Rollout

1. Issue на GitHub «Эпик 5: LUMM Goal System» + sub-issues (миграция, API, лендинг, мастер, просмотр, интеграция в profile/members/sidebar). Язык русский.
2. Ветка `epic-5-goal-system` от master.
3. Разработка сегментами с коммитами `feat(...)  (#N)`.
4. Перед мержем в master:
   - Бэкап `data/lumm.db.bak.<timestamp>`.
   - Применить миграцию `2026-04-23-goal-plans.sql`.
   - Билд + `systemctl restart lumm`.
5. `NEW`-бейдж в сайдбаре снимаем вручную через ~2-3 недели (как с «Участниками» и «Штурвалом»).
6. Обновление `/help` — раздел «8. LUMM Goal System», как это в цикле работает.

## Риски

- **Длина мастера (45–90 мин).** Высокий abandonment-риск. Смягчение: автосохранение в localStorage. Если из 4–6 тестировщиков никто не дойдёт до save за 2 недели — сигнал резать мастер (до 5–6 экранов) или разбивать на сессии.
- **Визуальный конфликт editorial ↔ LUMM dark.** Решено компромиссом C. Если на ревью будет резать глаз — тривиально перевести мастер в LUMM-палитру (стили инкапсулированы в `GoalWizard.tsx`).
- **Юзер имеет одновременно `businessGoal` (старое) и `wish` (новое).** Возможна путаница на `/members/[id]` — «какая же цель настоящая?». Решение: в `/members/[id]` чёткие заголовки «Краткие цели» (business+sport) и «Структурная цель на цикл». На ревью UI — проверить что смотрится не-конфликтно.
- **`lucide-react` bundle size.** Пакет tree-shakeable (импорт по имени = только нужные иконки). Если не установлен — добавляем; в MVP используется ~10 иконок, добавит ~5–8kb gzipped. Если окажется критично — заменим на SVG/emoji.
- **Несоответствие schema в JSON `data` и формы мастера.** При изменении мастера в будущем старые записи могут отсутствовать новые поля. Смягчение: при парсинге `data` — всегда merge с дефолтами (`{ ...emptyData, ...parsed }`). В `GoalView` — опциональный рендер: «поле не заполнено» при undefined.

## Открытые вопросы к плану (не к спеке)

- Проверить: `lucide-react` уже в `package.json`?
- Проверить: как в Next.js 16 App Router правильно override родительский layout для вложенного сегмента — через nested `layout.tsx` или через route group? (AGENTS.md: читать `node_modules/next/dist/docs/`).
- В `src/lib/analyzer.ts` — будет ли промт корректно работать, если `businessGoal` пустой, но `goal_plans.wish` заполнен? Скорее всего да (промт уже про пустые поля), но убедиться. В MVP бот про структурную цель не знает — это на постэпик.

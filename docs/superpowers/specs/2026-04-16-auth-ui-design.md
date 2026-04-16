# Auth UI + Middleware — Дизайн

Реализация фронтенд-части аутентификации. Бэкенд (API, JWT, invite system) уже готов по спеке `2026-04-03-auth-system-design.md`. Здесь описаны UI страницы и подключение middleware.

## Scope

4 новых файла:
- `src/app/login/page.tsx` — страница входа
- `src/app/invite/[token]/page.tsx` — регистрация по приглашению
- `src/app/onboard/page.tsx` — выбор никнейма после регистрации
- `src/middleware.ts` — защита роутов (на основе существующего `src/proxy.ts`)

## Страница `/login`

**Тип:** Client Component (`"use client"`)

**Layout:** Центрированная карточка на `bg-lumm-dark` фоне, без Sidebar.

**Содержимое (сверху вниз):**
1. Логотип LUMM (текстовый: "LUMM" золотом, подпись "Level Up Mastermind")
2. Telegram Login Widget — основная кнопка входа
3. Разделитель "или"
4. Форма username/password:
   - Input username (`bg-lumm-gray border border-lumm-gray-light rounded-lg`)
   - Input password (аналогично)
   - Кнопка "Войти" (`bg-lumm-gold text-lumm-dark font-medium rounded-lg`)
5. Сообщение об ошибке (красный текст, появляется при неудаче)

**Поведение:**
- POST `/api/auth/login` с `{username, password}`
- При успехе → `router.push("/")`
- При ошибке → показать текст ошибки
- Telegram Widget: callback вызывает POST `/api/auth/telegram` → редирект на `/`
- Если пользователь уже залогинен (GET `/api/auth/me` возвращает 200) → редирект на `/`

**Telegram Login Widget:**
- Используем `<script>` от Telegram (`https://telegram.org/js/telegram-widget.js`)
- `data-telegram-login` = имя бота из env (`NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`)
- `data-size="large"`, `data-radius="8"`
- `data-onauth="onTelegramAuth(user)"` — глобальная функция, вызывает POST `/api/auth/telegram`

## Страница `/invite/[token]`

**Тип:** Server Component (проверка токена) + Client Component (форма)

**Server part:**
- GET `/api/invites/[token]` для проверки валидности
- Если токен невалидный/истёк/использован → показать сообщение об ошибке, без формы

**Client part (если токен валиден):**
- Заголовок "Присоединиться к Level Up"
- Telegram Login Widget — "Зарегистрироваться через Telegram"
- Разделитель "или"
- Форма: username + password + подтверждение password
- Кнопка "Создать аккаунт"

**Поведение:**
- POST `/api/invites/[token]/claim` с `{method: "telegram", ...data}` или `{method: "password", username, password}`
- При успехе → `router.push("/onboard")`
- Валидация: password >= 6 символов, password === confirmPassword

## Страница `/onboard`

**Тип:** Client Component

**Layout:** Центрированная карточка, без Sidebar (как login).

**Содержимое:**
1. Заголовок "Добро пожаловать в LUMM"
2. Подпись "Выберите никнейм и цвет аватара"
3. Превью аватара (кружок с первой буквой имени, цвет меняется в реальном времени)
4. Input для displayName
5. Набор цветов аватара (6-8 предустановленных, клик выбирает)
6. Кнопка "Начать"

**Поведение:**
- POST `/api/auth/onboard` с `{displayName, avatarColor}`
- При успехе → `router.push("/")`
- Если пользователь не залогинен → редирект на `/login`

**Палитра цветов аватара:**
```
#c9a84c (золото — по умолчанию)
#e06c75 (красный)
#61afef (синий)
#98c379 (зелёный)
#c678dd (фиолетовый)
#e5c07b (жёлтый)
#56b6c2 (бирюзовый)
#be5046 (терракот)
```

## Middleware (`src/middleware.ts`)

**Основа:** существующая логика из `src/proxy.ts`.

**Публичные пути (без auth):**
- `/login`
- `/invite`
- `/api/auth`
- `/_next`
- `/favicon.ico`
- Статика (`.svg`, `.png`, `.jpg`, `.ico`)

**Защищённые пути:**
- Все остальные → проверка `lumm_token` cookie → verify JWT
- Если невалидный → удалить cookie, редирект `/login`

**Admin-only:**
- `/admin/*`, `/api/invites` (POST/GET) → `role === "admin"`
- Если не admin → 403

## Layout

Страницы `/login`, `/invite/*`, `/onboard` рендерятся **без Sidebar**. Используем отдельный layout или условную логику в корневом layout.

**Подход:** Создать `src/app/(auth)/layout.tsx` для auth-страниц с минимальным layout (только `bg-lumm-dark`, центрирование), и переместить login/invite/onboard туда. Основные страницы остаются в `src/app/(main)/` с Sidebar.

Структура:
```
src/app/
  (auth)/
    layout.tsx          — без Sidebar, центрированный
    login/page.tsx
    invite/[token]/page.tsx
    onboard/page.tsx
  (main)/
    layout.tsx          — с Sidebar
    page.tsx            — dashboard
    analytics/page.tsx
    ...остальные
```

## Стиль

Все элементы в существующей дизайн-системе:
- Фон: `bg-lumm-dark`
- Карточка: `bg-lumm-black border border-lumm-gray-light rounded-xl p-8`
- Inputs: `bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary`
- Кнопка primary: `bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light`
- Текст: `text-lumm-text-primary`, secondary: `text-lumm-text-secondary`

## Что НЕ входит в scope

- Telegram-бот (функциональность)
- `/api/auth/switch` endpoint
- Admin panel UI (будет отдельно)
- Изменение существующих страниц (dashboard, analytics и т.д.)
- `UserSwitcher` — пока оставляем как есть, уберём отдельным PR

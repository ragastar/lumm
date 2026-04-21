# Telegram Login via Bot — Дизайн

Заменить существующий **Telegram Login Widget** (браузерная OAuth-авторизация на `oauth.telegram.org`) на более нативный **Login via Bot Deep Link** — когда кнопка открывает сам Telegram-клиент (десктоп/мобильный), юзер подтверждает в чате с ботом, сайт авторизует.

## Почему это нужно

**Текущий Widget:**
- Требует сессию на `web.telegram.org` в том же браузере
- Иначе QR-код / телефонный номер — лишние шаги
- Особенно неудобно на мобильных — не переходит в нативное приложение

**Login via Bot:**
- Открывает нативный Telegram-клиент (через `tg://` или `https://t.me/bot?start=xxx`)
- Юзер видит знакомый Telegram-чат с ботом, жмёт одну кнопку
- UX как у многих современных сервисов (Fragment, крипто-сервисы)

## Scope

- **Добавить** новый flow Login via Bot
- **Оставить** существующий Widget как fallback (кто-то может предпочитать)
- **Затронутые страницы**: `/login` (добавить кнопку), `/invite/[token]` (добавить кнопку)
- **UserMenu "Привязать Telegram"** — можно перевести на тот же flow, но в первой итерации оставить Widget

## Архитектура

### Flow для login

```
1. Юзер: клик "Войти через Telegram" на /login
2. Frontend → POST /api/auth/telegram-login/init
   Backend: генерирует nonce "tg_abc123", записывает в БД:
     { nonce, purpose: "login", status: "pending", expires_at: now + 5min }
   Возвращает: { url: "https://t.me/lummbrain_bot?start=tg_abc123", nonce }
3. Frontend: открывает url (window.open или location.href)
   Параллельно: начинает polling GET /api/auth/telegram-login/status?nonce=tg_abc123
4. Telegram-клиент открывается, юзер кликает "START"
5. Бот получает /start tg_abc123 → handler:
   - Проверяет nonce (существует, pending, не истёк)
   - Отправляет inline-кнопку "✅ Войти в LUMM"
6. Юзер кликает кнопку → callback_query handler:
   - Ищет member с этим telegram_id
   - Если нашёл: обновляет nonce → status: "confirmed", member_id = ...
   - Если нет: отвечает "Ты не зарегистрирован в LUMM. Попроси инвайт-ссылку."
7. Frontend polling видит status: "confirmed" → POST /api/auth/telegram-login/finalize
   Backend: создаёт JWT, ставит cookie, удаляет nonce
8. Frontend → router.push("/")
```

### Flow для регистрации (invite)

```
1. Юзер: клик "Через Telegram" на /invite/[inviteToken]
2. Frontend → POST /api/auth/telegram-login/init
   body: { purpose: "invite", inviteToken }
   Backend: создаёт nonce с purpose: "invite", invite_token: inviteToken
3-5. Такой же flow как login: Telegram → /start → inline-кнопка
6. Callback handler:
   - Проверяет inviteToken (валиден, не исчерпан)
   - Проверяет что telegram_id ещё не зарегистрирован
   - Создаёт member (telegram_id, display_name из first_name)
   - Инкрементит invite.used_count
   - nonce → status: "confirmed", member_id = новый
7. Frontend polling → finalize → JWT cookie → router.push("/onboard")
```

### Nonce lifecycle

- Создаётся с TTL 5 минут
- Статусы: `pending` → `confirmed` (успех) | `expired` (TTL) | `used` (после finalize)
- После finalize nonce удаляется (или пометить `used`, но проще удалить)

## Data Schema

Новая таблица `login_nonces`:

| Column | Type | Notes |
|--------|------|-------|
| nonce | TEXT PK | `tg_<16 random chars>` |
| purpose | TEXT | `"login"` или `"invite"` |
| invite_token | TEXT nullable | Для purpose=invite |
| status | TEXT | `"pending"` / `"confirmed"` |
| member_id | TEXT FK → members, nullable | Заполняется при confirm |
| telegram_id | TEXT nullable | Telegram ID того, кто подтвердил |
| expires_at | TEXT | ISO, +5 минут от создания |
| created_at | TEXT | ISO |

Без FK на invite — инвайт может быть удалён админом пока nonce висит.

## API Endpoints

**POST /api/auth/telegram-login/init** (публичный)
- body: `{ purpose: "login" | "invite", inviteToken?: string }`
- Создаёт nonce, возвращает `{ nonce, url, expiresAt }`
- Rate-limit: 10 запросов/мин с одного IP (в первой итерации можно без)

**GET /api/auth/telegram-login/status?nonce=xxx** (публичный)
- Возвращает `{ status, memberId? }`
- Статусы: `pending`, `confirmed`, `expired`, `not_found`

**POST /api/auth/telegram-login/finalize** (публичный)
- body: `{ nonce }`
- Проверяет status === "confirmed"
- Создаёт JWT для member_id
- Ставит cookie, удаляет nonce
- Возвращает `{ ok: true, needsOnboarding: boolean }`

## Bot Handlers

Подключить к grammY боту в `src/bot/index.ts`:

**`/start <nonce>` handler:**
- Если nonce не начинается с `tg_` или не найден → обычное приветствие
- Если nonce валиден (pending, не истёк) → отправить inline-кнопку "✅ Войти в LUMM"
  - callback_data: `confirm:<nonce>`

**`callback_query` handler (`confirm:<nonce>`):**
- Проверить nonce
- По ctx.from.id определить telegram_id
- Для purpose=login: найти member с этим telegram_id
  - Если есть → update nonce: status=confirmed, member_id, telegram_id
  - Если нет → ctx.answerCallbackQuery("Вы не зарегистрированы. Получите инвайт.")
- Для purpose=invite: проверить инвайт, создать member
  - Update nonce: status=confirmed, member_id
- Отредактировать сообщение: "✅ Вы вошли. Возвращайтесь на сайт."

## Bot Deployment

Сейчас бот не запущен. Нужен systemd unit:

**`/etc/systemd/system/lumm-bot.service`:**
```
[Unit]
Description=LUMM Telegram Bot
After=network.target lumm.service

[Service]
Type=simple
WorkingDirectory=/root/lumm
ExecStart=/usr/bin/npm run bot
Restart=always
EnvironmentFile=/root/lumm/.env

[Install]
WantedBy=multi-user.target
```

- `systemctl enable --now lumm-bot`
- Логи: `journalctl -u lumm-bot`

**Проблема:** бот и Next.js читают одну SQLite базу. SQLite поддерживает concurrent reads, но writes сериализуются через WAL. В нашем случае OK (редкие записи).

## Frontend Changes

### `/login` page

Заменить текущую структуру:
```
[Telegram Widget]
-- или --
[Username/Password form]
```

На:
```
[Кнопка "Войти через Telegram" — открывает бота]
[Мелкая ссылка "Другие способы" → раскрывает:
  [Telegram Widget (fallback)]
  [Username/Password form]
]
```

### Новый компонент `TelegramBotLoginButton`

```tsx
<TelegramBotLoginButton
  purpose="login"
  onSuccess={(needsOnboarding) => router.push(needsOnboarding ? "/onboard" : "/")}
/>
```

Внутри:
- При клике: POST /init → получает url → открывает `window.open(url, "_blank")` или `location.href = url`
- Начинает polling status каждые 2 секунды (макс 5 минут)
- Показывает state: "Откройте Telegram и подтвердите вход..."
- При status=confirmed → POST /finalize → onSuccess

### `/invite/[token]` page

Заменить Telegram Widget на `<TelegramBotLoginButton purpose="invite" inviteToken={token} />`

## Edge Cases

**Юзер закрыл Telegram, не подтвердил:**
- Polling дойдёт до 5 минут → nonce истечёт
- Frontend показывает "Таймаут, попробуйте снова"

**Юзер подтвердил в Telegram, но закрыл вкладку сайта:**
- Nonce останется confirmed, но не finalized
- При TTL=5min автоматически истечёт
- Юзер начинает flow заново

**Бот упал во время клика пользователя:**
- Callback не обработается, nonce не станет confirmed
- Через 5 мин истечёт → юзер видит таймаут → пробует снова

**Юзер кликнул два раза подряд (два nonce):**
- Оба pending, юзер подтвердит один, второй истечёт
- Не проблема

## Не входит в scope

- Миграция UserMenu "Привязать Telegram" на новый flow (сейчас Widget, позже можно)
- Миграция существующего Widget (оставляем как fallback)
- Telegram Mini App (другая архитектура)
- Rate limiting на /init (в первой итерации без)
- Команды бота для отчётов (/report и т.д.) — отдельная задача Фазы 1

## Открытые вопросы

Никаких — решения приняты по тексту.

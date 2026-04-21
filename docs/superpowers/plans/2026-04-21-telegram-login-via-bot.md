# Telegram Login via Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-based Telegram Login Widget with native Telegram deep-link flow where users confirm login directly in their Telegram client (desktop/mobile).

**Architecture:** Frontend generates a nonce via backend, opens `https://t.me/lummbrain_bot?start=<nonce>` which launches native Telegram. Bot receives `/start <nonce>`, shows inline button. On confirmation, bot updates nonce status in DB. Frontend polls status endpoint and finalizes to set JWT cookie.

**Tech Stack:** Next.js 16 (API routes), grammY (Telegram bot), SQLite (Drizzle ORM), TypeScript, systemd (for bot deployment)

---

## File Structure

```
src/
  db/
    schema.ts                              — MODIFY: add login_nonces table
  lib/
    nonces.ts                              — CREATE: nonce CRUD helpers
  bot/
    index.ts                               — MODIFY: connect login handlers
    login-handlers.ts                      — CREATE: /start <nonce> + callback
  app/
    api/
      auth/
        telegram-login/
          init/route.ts                    — CREATE: POST — create nonce
          status/route.ts                  — CREATE: GET — check status
          finalize/route.ts                — CREATE: POST — set JWT cookie
  components/
    TelegramBotLogin.tsx                   — CREATE: button + polling
  app/(auth)/
    login/page.tsx                         — MODIFY: use TelegramBotLogin
    invite/[token]/InviteClient.tsx        — MODIFY: use TelegramBotLogin

/etc/systemd/system/
  lumm-bot.service                         — CREATE: systemd unit
```

---

### Task 1: Add `login_nonces` Table + Nonce Helpers

Add DB schema and a small helpers module for creating/reading/confirming/deleting nonces.

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/nonces.ts`

- [ ] **Step 1: Add schema definition**

Edit `src/db/schema.ts` — add the `loginNonces` table below the `invites` table definition:

```typescript
export const loginNonces = sqliteTable("login_nonces", {
  nonce: text("nonce").primaryKey(),
  purpose: text("purpose", { enum: ["login", "invite"] }).notNull(),
  inviteToken: text("invite_token"),
  status: text("status", { enum: ["pending", "confirmed"] }).notNull().default("pending"),
  memberId: text("member_id").references(() => members.id),
  telegramId: text("telegram_id"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Apply migration via raw SQL**

```bash
cd /root/lumm && node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/lumm.db');
db.exec(\`
  CREATE TABLE IF NOT EXISTS login_nonces (
    nonce TEXT PRIMARY KEY,
    purpose TEXT NOT NULL,
    invite_token TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    member_id TEXT REFERENCES members(id),
    telegram_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_nonces_expires ON login_nonces(expires_at);
\`);
console.log('Migration done');
console.log(db.prepare('PRAGMA table_info(login_nonces)').all().map(c => c.name + ' ' + c.type).join(', '));
"
```

Expected output includes: `nonce TEXT, purpose TEXT, invite_token TEXT, status TEXT, member_id TEXT, telegram_id TEXT, expires_at TEXT, created_at TEXT`

- [ ] **Step 3: Create nonces helper module**

Create `src/lib/nonces.ts`:

```typescript
import { db } from "@/db";
import { loginNonces } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { randomBytes } from "crypto";

export const NONCE_TTL_MS = 5 * 60 * 1000;

export type NoncePurpose = "login" | "invite";

export function generateNonce(): string {
  return "tg_" + randomBytes(12).toString("hex");
}

export async function createNonce(
  purpose: NoncePurpose,
  inviteToken: string | null = null,
): Promise<{ nonce: string; expiresAt: string }> {
  const nonce = generateNonce();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS).toISOString();

  await db.insert(loginNonces).values({
    nonce,
    purpose,
    inviteToken,
    status: "pending",
    expiresAt,
    createdAt: now.toISOString(),
  });

  return { nonce, expiresAt };
}

export async function getNonce(nonce: string) {
  const rows = await db
    .select()
    .from(loginNonces)
    .where(eq(loginNonces.nonce, nonce))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  if (new Date(row.expiresAt) < new Date()) {
    return { ...row, status: "expired" as const };
  }

  return row;
}

export async function confirmNonce(
  nonce: string,
  memberId: string,
  telegramId: string,
): Promise<boolean> {
  const result = await db
    .update(loginNonces)
    .set({ status: "confirmed", memberId, telegramId })
    .where(eq(loginNonces.nonce, nonce))
    .returning({ nonce: loginNonces.nonce });

  return result.length > 0;
}

export async function deleteNonce(nonce: string): Promise<void> {
  await db.delete(loginNonces).where(eq(loginNonces.nonce, nonce));
}

export async function cleanupExpiredNonces(): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.delete(loginNonces).where(lt(loginNonces.expiresAt, nowIso));
}
```

- [ ] **Step 4: Verify build**

```bash
cd /root/lumm && npx next build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /root/lumm && git add src/db/schema.ts src/lib/nonces.ts
git commit -m "feat: login_nonces table + nonce helpers

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `/api/auth/telegram-login/init`

Create the public endpoint that frontend calls to initiate login. Creates a nonce and returns the Telegram URL.

**Files:**
- Create: `src/app/api/auth/telegram-login/init/route.ts`

- [ ] **Step 1: Create init route**

Create `src/app/api/auth/telegram-login/init/route.ts`:

```typescript
import { createNonce } from "@/lib/nonces";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  let body: { purpose?: string; inviteToken?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const purpose = body.purpose;
  if (purpose !== "login" && purpose !== "invite") {
    return Response.json({ error: "Неверный purpose" }, { status: 400 });
  }

  let inviteToken: string | null = null;
  if (purpose === "invite") {
    if (!body.inviteToken) {
      return Response.json({ error: "inviteToken обязателен" }, { status: 400 });
    }
    inviteToken = body.inviteToken;

    // Validate invite exists and is not exhausted
    const rows = await db
      .select()
      .from(invites)
      .where(eq(invites.token, inviteToken))
      .limit(1);

    if (rows.length === 0) {
      return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
    }
    const invite = rows[0];
    if (invite.usedCount >= invite.maxUses) {
      return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return Response.json({ error: "Приглашение истекло" }, { status: 410 });
    }
  }

  const { nonce, expiresAt } = await createNonce(purpose, inviteToken);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return Response.json({ error: "Бот не настроен" }, { status: 500 });
  }

  const url = `https://t.me/${botUsername}?start=${nonce}`;

  return Response.json({ nonce, url, expiresAt });
}
```

- [ ] **Step 2: Add to proxy public paths**

Edit `src/proxy.ts` — the path `/api/auth/telegram-login/init` is already covered by `/api/auth` prefix in `publicPaths`. Verify no change needed. Read `src/proxy.ts:7` to confirm `publicPaths = ["/login", "/invite", "/api/auth"]`. No edit needed.

- [ ] **Step 3: Verify build + test**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -X POST http://127.0.0.1:3000/api/auth/telegram-login/init \
  -H "Content-Type: application/json" \
  -d '{"purpose":"login"}'
```

Expected: JSON response with `nonce`, `url` (starting with `https://t.me/lummbrain_bot?start=tg_`), `expiresAt`.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/app/api/auth/telegram-login/init/
git commit -m "feat: /api/auth/telegram-login/init — create login nonce

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `/api/auth/telegram-login/status`

Polling endpoint that frontend calls to check if user confirmed in Telegram.

**Files:**
- Create: `src/app/api/auth/telegram-login/status/route.ts`

- [ ] **Step 1: Create status route**

Create `src/app/api/auth/telegram-login/status/route.ts`:

```typescript
import { getNonce } from "@/lib/nonces";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nonce = url.searchParams.get("nonce");

  if (!nonce) {
    return Response.json({ error: "nonce обязателен" }, { status: 400 });
  }

  const row = await getNonce(nonce);

  if (!row) {
    return Response.json({ status: "not_found" });
  }

  return Response.json({
    status: row.status,
    memberId: row.memberId ?? null,
  });
}
```

- [ ] **Step 2: Verify build + test**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
# Create a nonce first
NONCE=$(curl -s -X POST http://127.0.0.1:3000/api/auth/telegram-login/init \
  -H "Content-Type: application/json" -d '{"purpose":"login"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).nonce")
echo "Nonce: $NONCE"
# Check status — should be pending
curl -s "http://127.0.0.1:3000/api/auth/telegram-login/status?nonce=$NONCE"
```

Expected: `{"status":"pending","memberId":null}`

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/app/api/auth/telegram-login/status/
git commit -m "feat: /api/auth/telegram-login/status — poll confirmation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `/api/auth/telegram-login/finalize`

After confirmation, frontend calls this to get JWT cookie set.

**Files:**
- Create: `src/app/api/auth/telegram-login/finalize/route.ts`

- [ ] **Step 1: Create finalize route**

Create `src/app/api/auth/telegram-login/finalize/route.ts`:

```typescript
import { getNonce, deleteNonce } from "@/lib/nonces";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signJWT } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  let body: { nonce?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (!body.nonce) {
    return Response.json({ error: "nonce обязателен" }, { status: 400 });
  }

  const row = await getNonce(body.nonce);

  if (!row) {
    return Response.json({ error: "Nonce не найден" }, { status: 404 });
  }

  if (row.status === "expired") {
    await deleteNonce(body.nonce);
    return Response.json({ error: "Таймаут, попробуйте снова" }, { status: 410 });
  }

  if (row.status !== "confirmed" || !row.memberId) {
    return Response.json({ error: "Ещё не подтверждено" }, { status: 425 });
  }

  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.id, row.memberId))
    .limit(1);

  if (memberRows.length === 0) {
    return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const member = memberRows[0];

  const jwt = await signJWT({ sub: member.id, role: member.role, groupId: member.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", jwt, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  await deleteNonce(body.nonce);

  const needsOnboarding = row.purpose === "invite";

  return Response.json({ ok: true, needsOnboarding });
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
# Without confirmation, finalize should return 425
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:3000/api/auth/telegram-login/finalize \
  -H "Content-Type: application/json" -d '{"nonce":"tg_nonexistent"}'
```

Expected: `404` (nonce not found). Next.js 16 redirect will not occur for API routes, so direct status code.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/app/api/auth/telegram-login/finalize/
git commit -m "feat: /api/auth/telegram-login/finalize — create JWT cookie

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Bot Login Handlers

Connect `/start <nonce>` handler and `callback_query` handler to the grammY bot.

**Files:**
- Create: `src/bot/login-handlers.ts`
- Modify: `src/bot/index.ts`

- [ ] **Step 1: Create login handlers module**

Create `src/bot/login-handlers.ts`:

```typescript
import type { Bot, Context } from "grammy";
import { db } from "@/db";
import { members, invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getNonce, confirmNonce } from "@/lib/nonces";
import { randomUUID } from "crypto";

export function registerLoginHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    const payload = ctx.match;

    if (!payload || !payload.startsWith("tg_")) {
      await ctx.reply("LUMM Bot. Чтобы войти на сайт, нажмите «Войти через Telegram» на lumm.space.");
      return;
    }

    const nonce = payload;
    const row = await getNonce(nonce);

    if (!row || row.status === "expired") {
      await ctx.reply("⏱ Ссылка устарела. Вернитесь на сайт и попробуйте снова.");
      return;
    }

    if (row.status === "confirmed") {
      await ctx.reply("Этот запрос уже подтверждён.");
      return;
    }

    await ctx.reply("Подтвердите вход в LUMM:", {
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Войти", callback_data: `confirm:${nonce}` }]],
      },
    });
  });

  bot.callbackQuery(/^confirm:(.+)$/, async (ctx) => {
    const nonce = ctx.match[1];
    const telegramId = String(ctx.from.id);

    const row = await getNonce(nonce);

    if (!row) {
      await ctx.answerCallbackQuery({ text: "Запрос не найден", show_alert: true });
      return;
    }

    if (row.status === "expired") {
      await ctx.answerCallbackQuery({ text: "Ссылка устарела", show_alert: true });
      return;
    }

    if (row.status === "confirmed") {
      await ctx.answerCallbackQuery({ text: "Уже подтверждено", show_alert: true });
      return;
    }

    let memberId: string;

    if (row.purpose === "login") {
      const memberRows = await db
        .select()
        .from(members)
        .where(eq(members.telegramId, telegramId))
        .limit(1);

      if (memberRows.length === 0) {
        await ctx.answerCallbackQuery({
          text: "Вы не зарегистрированы. Попросите админа прислать ссылку-приглашение.",
          show_alert: true,
        });
        return;
      }
      memberId = memberRows[0].id;
    } else {
      // purpose === "invite"
      if (!row.inviteToken) {
        await ctx.answerCallbackQuery({ text: "Приглашение не привязано", show_alert: true });
        return;
      }

      const inviteRows = await db
        .select()
        .from(invites)
        .where(eq(invites.token, row.inviteToken))
        .limit(1);

      if (inviteRows.length === 0) {
        await ctx.answerCallbackQuery({ text: "Приглашение не найдено", show_alert: true });
        return;
      }

      const invite = inviteRows[0];
      if (invite.usedCount >= invite.maxUses) {
        await ctx.answerCallbackQuery({ text: "Приглашение исчерпано", show_alert: true });
        return;
      }
      if (new Date(invite.expiresAt) < new Date()) {
        await ctx.answerCallbackQuery({ text: "Приглашение истекло", show_alert: true });
        return;
      }

      const existing = await db
        .select()
        .from(members)
        .where(eq(members.telegramId, telegramId))
        .limit(1);

      if (existing.length > 0) {
        await ctx.answerCallbackQuery({
          text: "Этот Telegram уже зарегистрирован",
          show_alert: true,
        });
        return;
      }

      memberId = randomUUID();
      const firstName = ctx.from.first_name || "Участник";
      const now = new Date().toISOString();

      await db.insert(members).values({
        id: memberId,
        groupId: invite.groupId,
        telegramId,
        displayName: firstName,
        role: "member",
        status: "active",
        avatarColor: "#c9a84c",
        createdAt: now,
      });

      await db
        .update(invites)
        .set({ usedCount: invite.usedCount + 1, usedBy: memberId, usedAt: now })
        .where(eq(invites.id, invite.id));
    }

    await confirmNonce(nonce, memberId, telegramId);

    await ctx.answerCallbackQuery({ text: "Готово" });
    await ctx.editMessageText("✅ Вход подтверждён. Вернитесь на сайт.");
  });
}
```

- [ ] **Step 2: Wire handlers to bot**

Replace contents of `src/bot/index.ts`:

```typescript
import { Bot } from "grammy";
import { registerLoginHandlers } from "./login-handlers";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(token);

registerLoginHandlers(bot);

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: () => console.log("LUMM Bot started (long-polling)"),
});
```

- [ ] **Step 3: Smoke test bot compiles and starts**

```bash
cd /root/lumm && timeout 5 npm run bot
```

Expected: Log `LUMM Bot started (long-polling)` before timeout kills it. No stack traces.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/bot/login-handlers.ts src/bot/index.ts
git commit -m "feat: bot login handlers (/start <nonce> + callback)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Deploy Bot as systemd Service

The bot needs to run 24/7 alongside the Next.js app.

**Files:**
- Create: `/etc/systemd/system/lumm-bot.service`

- [ ] **Step 1: Create systemd unit**

Write `/etc/systemd/system/lumm-bot.service`:

```ini
[Unit]
Description=LUMM Telegram Bot
After=network.target lumm.service

[Service]
Type=simple
WorkingDirectory=/root/lumm
ExecStart=/usr/bin/npm run bot
Restart=always
RestartSec=5
EnvironmentFile=/root/lumm/.env

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Enable and start**

```bash
systemctl daemon-reload
systemctl enable lumm-bot
systemctl start lumm-bot
sleep 3
systemctl status lumm-bot --no-pager -n 5
```

Expected: `Active: active (running)` and log contains `LUMM Bot started (long-polling)`.

- [ ] **Step 3: Sanity-check bot responds**

Manually in Telegram: open chat with `@lummbrain_bot`, send `/start`. Bot should reply "LUMM Bot. Чтобы войти на сайт..."

- [ ] **Step 4: Commit service unit to repo as reference**

The actual systemd file lives in `/etc/systemd/system/`. Add a copy to the repo for documentation/bootstrapping new environments:

```bash
mkdir -p /root/lumm/deploy
cp /etc/systemd/system/lumm-bot.service /root/lumm/deploy/lumm-bot.service
cd /root/lumm && git add deploy/lumm-bot.service
git commit -m "chore: systemd unit для lumm-bot

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Frontend Component `TelegramBotLogin`

Shared component used on both `/login` and `/invite/[token]` pages.

**Files:**
- Create: `src/components/TelegramBotLogin.tsx`

- [ ] **Step 1: Create component**

Create `src/components/TelegramBotLogin.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Purpose = "login" | "invite";

type Props = {
  purpose: Purpose;
  inviteToken?: string;
  onSuccess: (needsOnboarding: boolean) => void;
  onError?: (error: string) => void;
};

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 5 * 60 * 1000;

export function TelegramBotLogin({ purpose, inviteToken, onSuccess, onError }: Props) {
  const [state, setState] = useState<"idle" | "opening" | "waiting" | "finalizing">("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  const handleError = (message: string) => {
    stopPolling();
    setState("idle");
    setError(message);
    onError?.(message);
  };

  const start = async () => {
    setError(null);
    setState("opening");

    const initRes = await fetch("/api/auth/telegram-login/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, inviteToken }),
    });

    if (!initRes.ok) {
      const data = await initRes.json().catch(() => ({}));
      handleError(data.error || "Не удалось начать вход");
      return;
    }

    const { nonce, url } = await initRes.json();

    window.open(url, "_blank");
    setState("waiting");

    timeoutRef.current = setTimeout(() => {
      handleError("Таймаут, попробуйте снова");
    }, TIMEOUT_MS);

    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(
        `/api/auth/telegram-login/status?nonce=${encodeURIComponent(nonce)}`,
      );

      if (!statusRes.ok) return;

      const data = await statusRes.json();

      if (data.status === "confirmed") {
        stopPolling();
        setState("finalizing");

        const finalRes = await fetch("/api/auth/telegram-login/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce }),
        });

        if (finalRes.ok) {
          const finalData = await finalRes.json();
          onSuccess(finalData.needsOnboarding);
        } else {
          const finalData = await finalRes.json().catch(() => ({}));
          handleError(finalData.error || "Ошибка завершения входа");
        }
      } else if (data.status === "expired" || data.status === "not_found") {
        handleError("Таймаут, попробуйте снова");
      }
    }, POLL_INTERVAL_MS);
  };

  const label = purpose === "invite" ? "Зарегистрироваться через Telegram" : "Войти через Telegram";
  const waitingLabel =
    state === "finalizing" ? "Вход..." : "Откройте Telegram и подтвердите...";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={state !== "idle"}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#54a9eb] text-white font-medium rounded-lg hover:bg-[#4a98d8] disabled:opacity-60 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 3L2 11l7 3 2 7 3-4 6 4 3-18z" />
        </svg>
        {state === "idle" ? label : waitingLabel}
      </button>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build
```

Expected: Build succeeds (the component is not used yet, but should compile standalone).

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/components/TelegramBotLogin.tsx
git commit -m "feat: TelegramBotLogin component (button + polling)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Use `TelegramBotLogin` on `/login`

Replace the Telegram Login Widget on the login page with the new bot flow. Keep username/password form as fallback.

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Rewrite login page**

Replace contents of `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TelegramBotLogin } from "@/components/TelegramBotLogin";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (r.ok) router.replace("/");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push("/");
    } else {
      setError(data.error || "Ошибка входа");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">Level Up Mastermind</p>
        </div>

        <TelegramBotLogin
          purpose="login"
          onSuccess={(needsOnboarding) =>
            router.push(needsOnboarding ? "/onboard" : "/")
          }
          onError={(e) => setError(e)}
        />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-lumm-gray-light" />
          <span className="text-xs text-lumm-text-secondary">или логин и пароль</span>
          <div className="flex-1 h-px bg-lumm-gray-light" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login
```

Expected: `200`. Manual browser check: `https://lumm.space/login` shows blue "Войти через Telegram" button above the username/password form.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add "src/app/(auth)/login/page.tsx"
git commit -m "feat: использовать TelegramBotLogin на /login

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Use `TelegramBotLogin` on `/invite/[token]`

Replace the Telegram Widget in the invite registration flow.

**Files:**
- Modify: `src/app/(auth)/invite/[token]/InviteClient.tsx`

- [ ] **Step 1: Rewrite InviteClient**

Replace contents of `src/app/(auth)/invite/[token]/InviteClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TelegramBotLogin } from "@/components/TelegramBotLogin";

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/invites/${token}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "password", username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      router.push("/onboard");
    } else {
      setError(data.error || "Ошибка регистрации");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">Присоединиться к Level Up</p>
        </div>

        <TelegramBotLogin
          purpose="invite"
          inviteToken={token}
          onSuccess={(needsOnboarding) =>
            router.push(needsOnboarding ? "/onboard" : "/")
          }
          onError={(e) => setError(e)}
        />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-lumm-gray-light" />
          <span className="text-xs text-lumm-text-secondary">или логин и пароль</span>
          <div className="flex-1 h-px bg-lumm-gray-light" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Подтвердите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Регистрация..." : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
```

Manual check: create an invite in `/admin/invites`, open the link in another browser (incognito). Blue "Зарегистрироваться через Telegram" should appear above the password form.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add "src/app/(auth)/invite/[token]/InviteClient.tsx"
git commit -m "feat: использовать TelegramBotLogin на /invite/[token]

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: End-to-End Test

Manually verify the full flow works in production.

**Files:**
- None (testing only)

- [ ] **Step 1: Verify bot is running**

```bash
systemctl status lumm-bot --no-pager -n 3
journalctl -u lumm-bot --no-pager -n 10
```

Expected: Active running, log shows `LUMM Bot started (long-polling)`.

- [ ] **Step 2: Test login flow (existing user)**

First, ensure admin has `telegram_id` set:

```bash
cd /root/lumm && node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/lumm.db', { readonly: true });
console.log(db.prepare('SELECT username, telegram_id FROM members').all());
"
```

If admin `telegram_id` is null, link via UI: login with username/password, click avatar → "Привязать Telegram".

Then:
1. Logout from the site
2. Open `https://lumm.space/login`
3. Click "Войти через Telegram"
4. Telegram opens (new tab or app)
5. In Telegram: click "START" → bot shows "Подтвердите вход в LUMM" with button
6. Click "✅ Войти"
7. Return to browser — should redirect to `/`

- [ ] **Step 3: Test invite flow (new user)**

1. Login as admin, go to `/admin/invites`, create invite (limit 1 is fine)
2. Copy link
3. Logout, open link in incognito
4. Click "Зарегистрироваться через Telegram"
5. Telegram opens, click START, confirm
6. Return to browser — should redirect to `/onboard`
7. Fill in nickname and color → redirect to `/`

Then delete test member:

```bash
cd /root/lumm && node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/lumm.db');
const row = db.prepare('SELECT id, display_name FROM members WHERE username IS NULL AND id != ?').get('0dc86744-f96e-480b-a5ca-bb8e669b9820');
if (row) {
  console.log('Deleting test member:', row);
  db.prepare('DELETE FROM members WHERE id = ?').run(row.id);
}
"
```

- [ ] **Step 4: Test timeout behavior**

1. On `/login`, click "Войти через Telegram"
2. Do NOT open Telegram — just wait in browser
3. After 5 minutes, should see error "Таймаут, попробуйте снова"
4. Click button again — should start new flow

(For faster testing, you can temporarily set `TIMEOUT_MS = 30 * 1000` in `TelegramBotLogin.tsx`, test, then revert.)

- [ ] **Step 5: Cleanup expired nonces manually**

Verify cleanup works:

```bash
cd /root/lumm && node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/lumm.db');
console.log('Before:', db.prepare('SELECT COUNT(*) as n FROM login_nonces').get());
const now = new Date().toISOString();
db.prepare('DELETE FROM login_nonces WHERE expires_at < ?').run(now);
console.log('After:', db.prepare('SELECT COUNT(*) as n FROM login_nonces').get());
"
```

Expected: `After` count is 0 or less than `Before` (expired ones gone).

- [ ] **Step 6: No commit — this task is verification only**

If any step fails, open a follow-up task to fix. Otherwise move on.

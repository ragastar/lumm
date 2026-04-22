# LUMM Auth System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace demo cookie-based user switching with real invite-only auth (Telegram Login + password fallback, JWT sessions).

**Architecture:** Self-built auth in Next.js 16 API routes. `proxy.ts` (Next.js 16 renamed middleware → proxy) checks JWT on every request, redirects unauthenticated users to `/login`. Invite tokens are single-use, admin-created. Onboarding step lets new users pick displayName and avatar color.

**Tech Stack:** Next.js 16, Drizzle ORM + SQLite, bcrypt (bcryptjs), jose (JWT), Telegram Login Widget

**Spec:** `docs/superpowers/specs/2026-04-03-auth-system-design.md`

**Important Next.js 16 note:** Middleware is now called Proxy. File is `proxy.ts` (or `src/proxy.ts`), exports `proxy` function. See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.

---

## File Structure

### New files
- `src/lib/jwt.ts` — JWT sign/verify helpers using `jose`
- `src/lib/auth.ts` — `getCurrentUser()` helper replacing old session.ts logic
- `src/lib/telegram.ts` — Telegram Login data verification (HMAC-SHA256)
- `src/proxy.ts` — Route protection (JWT check, redirects)
- `src/app/(auth)/login/page.tsx` — Login page (server component wrapper)
- `src/app/(auth)/login/LoginClient.tsx` — Login form (client component)
- `src/app/(auth)/invite/[token]/page.tsx` — Invite registration page (server)
- `src/app/(auth)/invite/[token]/InviteClient.tsx` — Invite registration form (client)
- `src/app/(auth)/layout.tsx` — Auth layout (no sidebar)
- `src/app/api/auth/telegram/route.ts` — Telegram Login endpoint
- `src/app/api/auth/login/route.ts` — Username/password login endpoint
- `src/app/api/auth/logout/route.ts` — Logout endpoint
- `src/app/api/auth/onboard/route.ts` — Set displayName + avatarColor
- `src/app/api/invites/route.ts` — Create / list invites (admin)
- `src/app/api/invites/[token]/route.ts` — Check invite validity
- `src/app/api/invites/[token]/claim/route.ts` — Register via invite
- `src/app/admin/members/page.tsx` — Admin member management page
- `src/app/admin/members/AdminMembersClient.tsx` — Admin members client component
- `.env` — Environment variables (JWT_SECRET, TELEGRAM_BOT_TOKEN)

### Modified files
- `src/db/schema.ts` — Add `username`, `passwordHash`, `avatarUrl` to members; add `invites` table
- `src/db/seed.ts` — Replace demo seed with admin bootstrap
- `src/lib/session.ts` — Rewrite to use JWT
- `src/app/api/auth/me/route.ts` — Rewrite to use JWT
- `src/components/Sidebar.tsx` — Remove UserSwitcher, add user info + logout
- `src/app/layout.tsx` — Conditional sidebar (only for authed routes)
- `src/app/page.tsx` — Use new auth helper instead of old session
- `package.json` — Add `jose`, `bcryptjs` dependencies

### Deleted files
- `src/components/UserSwitcher.tsx`
- `src/app/api/auth/switch/route.ts`

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install jose and bcryptjs**

```bash
cd /root/lumm && npm install jose bcryptjs && npm install -D @types/bcryptjs
```

- [ ] **Step 2: Verify installation**

```bash
cd /root/lumm && node -e "require('jose'); require('bcryptjs'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add package.json package-lock.json && git commit -m "feat: добавить jose и bcryptjs для аутентификации #N"
```

---

## Task 2: Update database schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add username, passwordHash, avatarUrl to members and create invites table**

Replace the entire contents of `src/db/schema.ts` with:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  telegramChatId: text("telegram_chat_id"),
  settings: text("settings", { mode: "json" }),
  createdAt: text("created_at").notNull().default("datetime('now')"),
});

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  telegramId: text("telegram_id"),
  username: text("username"),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  realName: text("real_name"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  avatarColor: text("avatar_color").notNull().default("#c9a84c"),
  createdAt: text("created_at").notNull(),
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  token: text("token").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => members.id),
  expiresAt: text("expires_at").notNull(),
  usedBy: text("used_by").references(() => members.id),
  usedAt: text("used_at"),
});

export const weeklyReports = sqliteTable("weekly_reports", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id),
  weekStart: text("week_start").notNull(),
  businessText: text("business_text"),
  familyText: text("family_text"),
  personalText: text("personal_text"),
  scoreBusiness: integer("score_business"),
  scoreFamily: integer("score_family"),
  scorePersonal: integer("score_personal"),
  planText: text("plan_text"),
  source: text("source", { enum: ["telegram", "web"] }).notNull().default("web"),
  createdAt: text("created_at").notNull(),
});

export const monthlyFinancials = sqliteTable("monthly_financials", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id),
  month: text("month").notNull(),
  revenue: real("revenue"),
  netProfit: real("net_profit"),
  capital: real("capital"),
  scoreBusiness: integer("score_business"),
  scoreFamily: integer("score_family"),
  scorePersonal: integer("score_personal"),
  reportText: text("report_text"),
  requestText: text("request_text"),
  createdAt: text("created_at").notNull(),
});

export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  date: text("date").notNull(),
  organizerId: text("organizer_id").references(() => members.id),
  location: text("location"),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /root/lumm && npx tsc --noEmit src/db/schema.ts 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/db/schema.ts && git commit -m "feat: обновить схему — добавить invites, username, passwordHash в members #N"
```

---

## Task 3: Rewrite seed script for admin bootstrap

**Files:**
- Modify: `src/db/seed.ts`

- [ ] **Step 1: Replace seed.ts with admin bootstrap**

Replace the entire contents of `src/db/seed.ts` with:

```typescript
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "lumm.db");
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    telegram_chat_id TEXT,
    settings TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id),
    telegram_id TEXT,
    username TEXT,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    real_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    avatar_color TEXT NOT NULL DEFAULT '#c9a84c',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id),
    token TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL REFERENCES members(id),
    expires_at TEXT NOT NULL,
    used_by TEXT REFERENCES members(id),
    used_at TEXT
  );
  CREATE TABLE IF NOT EXISTS weekly_reports (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id),
    week_start TEXT NOT NULL,
    business_text TEXT,
    family_text TEXT,
    personal_text TEXT,
    score_business INTEGER,
    score_family INTEGER,
    score_personal INTEGER,
    plan_text TEXT,
    source TEXT NOT NULL DEFAULT 'web',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS monthly_financials (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id),
    month TEXT NOT NULL,
    revenue REAL,
    net_profit REAL,
    capital REAL,
    score_business INTEGER,
    score_family INTEGER,
    score_personal INTEGER,
    report_text TEXT,
    request_text TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id),
    date TEXT NOT NULL,
    organizer_id TEXT REFERENCES members(id),
    location TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT NOT NULL
  );
`);

const now = new Date().toISOString();
const groupId = randomUUID();
const adminId = randomUUID();

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "lumm2026";
const adminName = process.env.ADMIN_NAME || "Admin";

const passwordHash = bcrypt.hashSync(adminPassword, 10);

sqlite.prepare(`
  INSERT INTO groups (id, name, settings, created_at)
  VALUES (?, ?, ?, ?)
`).run(groupId, "Level Up", JSON.stringify({ fineAmount: 5000, meetingDay: "third_thursday" }), now);

sqlite.prepare(`
  INSERT INTO members (id, group_id, username, password_hash, display_name, role, status, avatar_color, created_at)
  VALUES (?, ?, ?, ?, ?, 'admin', 'active', '#c9a84c', ?)
`).run(adminId, groupId, adminUsername, passwordHash, adminName, now);

sqlite.close();
console.log("Database initialized!");
console.log(`  - 1 group (Level Up)`);
console.log(`  - 1 admin (username: ${adminUsername}, password: ${adminPassword})`);
console.log(`  Change defaults via ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME env vars.`);
```

- [ ] **Step 2: Test seed**

```bash
cd /root/lumm && npm run seed
```

Expected output:
```
Database initialized!
  - 1 group (Level Up)
  - 1 admin (username: admin, password: lumm2026)
  Change defaults via ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME env vars.
```

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/db/seed.ts && git commit -m "feat: заменить демо-сид на bootstrap с одним admin-пользователем #N"
```

---

## Task 4: Create .env and JWT/auth helpers

**Files:**
- Create: `.env`
- Create: `src/lib/jwt.ts`
- Create: `src/lib/telegram.ts`
- Modify: `src/lib/session.ts`

- [ ] **Step 1: Create .env file**

```
JWT_SECRET=lumm-dev-secret-change-in-production-abc123
TELEGRAM_BOT_TOKEN=
```

- [ ] **Step 2: Verify .env is in .gitignore**

```bash
cd /root/lumm && grep -q "^\.env" .gitignore && echo "OK" || echo ".env NOT in .gitignore"
```

Expected: `OK`. If not, add `.env` to `.gitignore`.

- [ ] **Step 3: Create src/lib/jwt.ts**

```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export type JWTPayload = {
  sub: string; // member id
  role: string;
  groupId: string;
};

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Create src/lib/telegram.ts**

```typescript
import { createHmac } from "crypto";

type TelegramLoginData = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export function verifyTelegramLogin(data: TelegramLoginData): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (hmac !== hash) return false;

  // Check auth_date is not older than 1 day
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 86400) return false;

  return true;
}
```

- [ ] **Step 5: Rewrite src/lib/session.ts**

Replace the entire contents of `src/lib/session.ts` with:

```typescript
import { cookies } from "next/headers";
import { verifyJWT, type JWTPayload } from "./jwt";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lumm_token")?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const member = await db
    .select()
    .from(members)
    .where(eq(members.id, payload.sub))
    .limit(1);

  if (member.length === 0) return null;
  if (member[0].status !== "active") return null;

  return member[0];
}

export async function getCurrentMemberId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
```

- [ ] **Step 6: Commit**

```bash
cd /root/lumm && git add .env src/lib/jwt.ts src/lib/telegram.ts src/lib/session.ts .gitignore && git commit -m "feat: добавить JWT, Telegram верификацию, переписать session.ts #N"
```

---

## Task 5: Create proxy (route protection)

**Files:**
- Create: `src/proxy.ts`

- [ ] **Step 1: Create src/proxy.ts**

In Next.js 16, middleware is called "proxy". The file goes in `src/` (same level as `app/`).

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

const publicPaths = ["/login", "/invite", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("lumm_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Admin-only routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/invites")) {
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    // Invalid token — clear it and redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("lumm_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
cd /root/lumm && git add src/proxy.ts && git commit -m "feat: добавить proxy (middleware) для защиты роутов #N"
```

---

## Task 6: Create auth API endpoints

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/telegram/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/onboard/route.ts`
- Modify: `src/app/api/auth/me/route.ts`
- Delete: `src/app/api/auth/switch/route.ts`

- [ ] **Step 1: Create POST /api/auth/login**

Create `src/app/api/auth/login/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return Response.json({ error: "Логин и пароль обязательны" }, { status: 400 });
  }

  const result = await db
    .select()
    .from(members)
    .where(eq(members.username, username))
    .limit(1);

  if (result.length === 0) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const member = result[0];

  if (!member.passwordHash || !bcrypt.compareSync(password, member.passwordHash)) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  if (member.status !== "active") {
    return Response.json({ error: "Аккаунт деактивирован" }, { status: 403 });
  }

  const token = await signJWT({ sub: member.id, role: member.role, groupId: member.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return Response.json({ ok: true, member: { id: member.id, displayName: member.displayName, role: member.role } });
}
```

- [ ] **Step 2: Create POST /api/auth/telegram**

Create `src/app/api/auth/telegram/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signJWT } from "@/lib/jwt";
import { verifyTelegramLogin } from "@/lib/telegram";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const data = await request.json();

  if (!verifyTelegramLogin(data)) {
    return Response.json({ error: "Невалидные данные Telegram" }, { status: 401 });
  }

  const telegramId = String(data.id);

  const result = await db
    .select()
    .from(members)
    .where(eq(members.telegramId, telegramId))
    .limit(1);

  if (result.length === 0) {
    // Not registered yet — return telegram data for invite flow to use
    return Response.json({ error: "Пользователь не найден", telegramId }, { status: 404 });
  }

  const member = result[0];

  if (member.status !== "active") {
    return Response.json({ error: "Аккаунт деактивирован" }, { status: 403 });
  }

  const token = await signJWT({ sub: member.id, role: member.role, groupId: member.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ ok: true, member: { id: member.id, displayName: member.displayName, role: member.role } });
}
```

- [ ] **Step 3: Create POST /api/auth/logout**

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("lumm_token");
  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Create POST /api/auth/onboard**

Create `src/app/api/auth/onboard/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { displayName, avatarColor } = await request.json();

  if (!displayName || displayName.trim().length < 2) {
    return Response.json({ error: "Имя должно быть минимум 2 символа" }, { status: 400 });
  }

  await db
    .update(members)
    .set({
      displayName: displayName.trim(),
      ...(avatarColor ? { avatarColor } : {}),
    })
    .where(eq(members.id, user.id));

  return Response.json({ ok: true });
}
```

- [ ] **Step 5: Rewrite GET /api/auth/me**

Replace the entire contents of `src/app/api/auth/me/route.ts` with:

```typescript
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  return Response.json({
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl,
    groupId: user.groupId,
  });
}
```

- [ ] **Step 6: Delete switch endpoint**

```bash
rm -rf /root/lumm/src/app/api/auth/switch
```

- [ ] **Step 7: Commit**

```bash
cd /root/lumm && git add -A && git commit -m "feat: добавить auth API (login, telegram, logout, onboard, me) #N"
```

---

## Task 7: Create invite API endpoints

**Files:**
- Create: `src/app/api/invites/route.ts`
- Create: `src/app/api/invites/[token]/route.ts`
- Create: `src/app/api/invites/[token]/claim/route.ts`

- [ ] **Step 1: Create GET/POST /api/invites**

Create `src/app/api/invites/route.ts`:

```typescript
import { db } from "@/db";
import { invites, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { randomUUID } from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const allInvites = await db
    .select({
      id: invites.id,
      token: invites.token,
      expiresAt: invites.expiresAt,
      usedBy: invites.usedBy,
      usedAt: invites.usedAt,
      createdBy: invites.createdBy,
    })
    .from(invites)
    .where(eq(invites.groupId, user.groupId))
    .orderBy(desc(invites.expiresAt));

  return Response.json(allInvites);
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(invites).values({
    id: randomUUID(),
    groupId: user.groupId,
    token,
    createdBy: user.id,
    expiresAt,
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://lumm.space"}/invite/${token}`;

  return Response.json({ token, url: inviteUrl, expiresAt }, { status: 201 });
}
```

- [ ] **Step 2: Create GET /api/invites/[token]**

Create `src/app/api/invites/[token]/route.ts`:

```typescript
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (result.length === 0) {
    return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
  }

  const invite = result[0];

  if (invite.usedBy) {
    return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: "Приглашение истекло" }, { status: 410 });
  }

  return Response.json({ valid: true, expiresAt: invite.expiresAt });
}
```

- [ ] **Step 3: Create POST /api/invites/[token]/claim**

Create `src/app/api/invites/[token]/claim/route.ts`:

```typescript
import { db } from "@/db";
import { invites, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";
import { verifyTelegramLogin } from "@/lib/telegram";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate invite
  const inviteResult = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (inviteResult.length === 0) {
    return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
  }

  const invite = inviteResult[0];

  if (invite.usedBy) {
    return Response.json({ error: "Приглашение уже использовано" }, { status: 410 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: "Приглашение истекло" }, { status: 410 });
  }

  const body = await request.json();
  const { method } = body; // "telegram" or "password"

  const memberId = randomUUID();
  const now = new Date().toISOString();

  if (method === "telegram") {
    if (!verifyTelegramLogin(body.telegramData)) {
      return Response.json({ error: "Невалидные данные Telegram" }, { status: 401 });
    }

    const telegramId = String(body.telegramData.id);

    // Check if telegram user already registered
    const existing = await db
      .select()
      .from(members)
      .where(eq(members.telegramId, telegramId))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ error: "Этот Telegram аккаунт уже зарегистрирован" }, { status: 409 });
    }

    await db.insert(members).values({
      id: memberId,
      groupId: invite.groupId,
      telegramId,
      displayName: body.telegramData.first_name || "Участник",
      role: "member",
      status: "active",
      avatarColor: "#c9a84c",
      createdAt: now,
    });
  } else if (method === "password") {
    const { username, password } = body;

    if (!username || !password || password.length < 6) {
      return Response.json({ error: "Логин и пароль (мин. 6 символов) обязательны" }, { status: 400 });
    }

    // Check if username taken
    const existing = await db
      .select()
      .from(members)
      .where(eq(members.username, username))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ error: "Этот логин уже занят" }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    await db.insert(members).values({
      id: memberId,
      groupId: invite.groupId,
      username,
      passwordHash,
      displayName: username,
      role: "member",
      status: "active",
      avatarColor: "#c9a84c",
      createdAt: now,
    });
  } else {
    return Response.json({ error: "Неверный метод регистрации" }, { status: 400 });
  }

  // Mark invite as used
  await db
    .update(invites)
    .set({ usedBy: memberId, usedAt: now })
    .where(eq(invites.id, invite.id));

  // Sign in the new user
  const jwtToken = await signJWT({ sub: memberId, role: "member", groupId: invite.groupId });

  const cookieStore = await cookies();
  cookieStore.set("lumm_token", jwtToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ ok: true, memberId, needsOnboarding: true }, { status: 201 });
}
```

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add -A && git commit -m "feat: добавить invite API (создание, проверка, регистрация) #N"
```

---

## Task 8: Create auth pages (login + invite)

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/LoginClient.tsx`
- Create: `src/app/(auth)/invite/[token]/page.tsx`
- Create: `src/app/(auth)/invite/[token]/InviteClient.tsx`

- [ ] **Step 1: Create auth layout (no sidebar)**

Create `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lumm-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">Level Up Mastermind</p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create login page (server component)**

Create `src/app/(auth)/login/page.tsx`:

```typescript
import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return <LoginClient />;
}
```

- [ ] **Step 3: Create LoginClient**

Create `src/app/(auth)/login/LoginClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginClient() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
      <h2 className="text-xl font-semibold text-lumm-text-primary mb-6">Вход</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Логин</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-lumm-gray border border-lumm-gray-light rounded-lg text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-lumm-gray border border-lumm-gray-light rounded-lg text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-lumm-gold text-lumm-dark font-semibold rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-lumm-gray-light">
        <p className="text-sm text-lumm-text-secondary text-center mb-3">Или войти через</p>
        <div id="telegram-login-container" className="flex justify-center">
          <p className="text-xs text-lumm-text-secondary">Telegram Login будет доступен после настройки бота</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create invite page (server component)**

Create `src/app/(auth)/invite/[token]/page.tsx`:

```typescript
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { InviteClient } from "./InviteClient";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const result = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (result.length === 0) {
    return (
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center">
        <p className="text-red-400 text-lg">Приглашение не найдено</p>
      </div>
    );
  }

  const invite = result[0];

  if (invite.usedBy) {
    return (
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center">
        <p className="text-red-400 text-lg">Приглашение уже использовано</p>
      </div>
    );
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 text-center">
        <p className="text-red-400 text-lg">Приглашение истекло</p>
      </div>
    );
  }

  return <InviteClient token={token} />;
}
```

- [ ] **Step 5: Create InviteClient**

Create `src/app/(auth)/invite/[token]/InviteClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = ["#c9a84c", "#4a9eff", "#ff6b6b", "#51cf66", "#cc5de8", "#ffa94d", "#20c997", "#845ef7"];

export function InviteClient({ token }: { token: string }) {
  const [step, setStep] = useState<"register" | "onboard">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/invites/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "password", username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }

      setStep("onboard");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarColor }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (step === "onboard") {
    return (
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
        <h2 className="text-xl font-semibold text-lumm-text-primary mb-2">Добро пожаловать!</h2>
        <p className="text-sm text-lumm-text-secondary mb-6">Выберите ник и цвет аватарки</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleOnboard} className="space-y-4">
          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Ваш ник</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-lumm-gray border border-lumm-gray-light rounded-lg text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              placeholder="Как вас будут видеть другие"
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-2">Цвет аватарки</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    avatarColor === color ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-lumm-dark shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {displayName ? displayName[0].toUpperCase() : "?"}
            </div>
            <p className="text-lumm-text-primary font-medium">{displayName || "Ваш ник"}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-lumm-gold text-lumm-dark font-semibold rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Начать"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8">
      <h2 className="text-xl font-semibold text-lumm-text-primary mb-2">Регистрация</h2>
      <p className="text-sm text-lumm-text-secondary mb-6">Вас пригласили в мастермайнд-группу</p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Логин</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-lumm-gray border border-lumm-gray-light rounded-lg text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-lumm-gray border border-lumm-gray-light rounded-lg text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-lumm-gold text-lumm-dark font-semibold rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
        >
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-lumm-gray-light">
        <p className="text-sm text-lumm-text-secondary text-center mb-3">Или через Telegram</p>
        <div className="flex justify-center">
          <p className="text-xs text-lumm-text-secondary">Telegram Login будет доступен после настройки бота</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd /root/lumm && git add -A && git commit -m "feat: добавить страницы login и invite с онбордингом #N"
```

---

## Task 9: Update Sidebar and layout

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Delete: `src/components/UserSwitcher.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace Sidebar.tsx**

Replace the entire contents of `src/components/Sidebar.tsx` with:

```typescript
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/reports", label: "Отчёты", icon: "◇" },
  { href: "/financials", label: "Финансы", icon: "◈" },
  { href: "/analytics", label: "Аналитика", icon: "◈" },
  { href: "/calendar", label: "Календарь", icon: "◎" },
  { href: "/budget", label: "Бюджет", icon: "◉" },
  { href: "/fines", label: "Штрафы", icon: "◫" },
  { href: "/constitution", label: "Конституция", icon: "◩" },
];

const adminNav = [
  { href: "/admin/members", label: "Участники", icon: "◆" },
];

type User = {
  id: string;
  displayName: string;
  role: string;
  avatarColor: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (r.ok) return r.json();
      return null;
    }).then(setUser);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const allNav = user?.role === "admin" ? [...nav, ...adminNav] : nav;

  const navContent = (
    <>
      <div className="p-6 border-b border-lumm-gray-light">
        <h1 className="text-2xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
        <p className="text-xs text-lumm-text-secondary mt-1">Level Up Mastermind</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {allNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/20"
                  : "text-lumm-text-secondary hover:text-lumm-text-primary hover:bg-lumm-gray/50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-lumm-gray-light">
        {user && (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-lumm-dark shrink-0"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.displayName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-lumm-text-primary truncate">{user.displayName}</p>
              <p className="text-xs text-lumm-text-secondary">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-lumm-text-secondary hover:text-red-400 transition-colors p-1"
              title="Выйти"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-lumm-black border-b border-lumm-gray-light flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-lumm-text-primary p-2"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-40 w-64 bg-lumm-black h-screen flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-lumm-black border-r border-lumm-gray-light flex-col h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Delete UserSwitcher**

```bash
rm /root/lumm/src/components/UserSwitcher.tsx
```

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add -A && git commit -m "feat: обновить Sidebar — убрать UserSwitcher, добавить logout и admin-навигацию #N"
```

---

## Task 10: Update dashboard page to use new auth

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update page.tsx to use getCurrentUser**

Replace the entire contents of `src/app/page.tsx` with:

```typescript
import { db } from "@/db";
import { weeklyReports, monthlyFinancials, meetings, members } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { DashboardClient } from "./DashboardClient";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allMembers = await db.select().from(members);

  // Fetch last 8 weekly reports
  const reports = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.memberId, user.id))
    .orderBy(desc(weeklyReports.weekStart))
    .limit(8);

  // Fetch last 6 monthly financials
  const financials = await db
    .select()
    .from(monthlyFinancials)
    .where(eq(monthlyFinancials.memberId, user.id))
    .orderBy(desc(monthlyFinancials.month))
    .limit(6);

  // Fetch next scheduled meeting
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = await db
    .select()
    .from(meetings)
    .where(gte(meetings.date, today))
    .orderBy(meetings.date)
    .limit(1);

  let nextMeeting: {
    id: string;
    date: string;
    location: string | null;
    organizerName: string | null;
  } | null = null;

  if (upcomingMeetings.length > 0) {
    const m = upcomingMeetings[0];
    let organizerName: string | null = null;
    if (m.organizerId) {
      const organizer = allMembers.find((mb) => mb.id === m.organizerId);
      organizerName = organizer?.displayName ?? null;
    }
    nextMeeting = {
      id: m.id,
      date: m.date,
      location: m.location,
      organizerName,
    };
  }

  return (
    <DashboardClient
      member={user}
      reports={reports}
      financials={financials}
      nextMeeting={nextMeeting}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /root/lumm && git add src/app/page.tsx && git commit -m "feat: обновить dashboard — использовать JWT auth вместо cookie #N"
```

---

## Task 11: Create admin members page

**Files:**
- Create: `src/app/admin/members/page.tsx`
- Create: `src/app/admin/members/AdminMembersClient.tsx`

- [ ] **Step 1: Create admin members server page**

Create `src/app/admin/members/page.tsx`:

```typescript
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminMembersClient } from "./AdminMembersClient";

export default async function AdminMembersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return <AdminMembersClient />;
}
```

- [ ] **Step 2: Create AdminMembersClient**

Create `src/app/admin/members/AdminMembersClient.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  displayName: string;
  role: string;
  status: string;
  avatarColor: string;
  username: string | null;
  telegramId: string | null;
  createdAt: string;
};

type Invite = {
  id: string;
  token: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
};

export function AdminMembersClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
    fetch("/api/invites").then((r) => r.json()).then(setInvites);
  }, []);

  const createInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invites", { method: "POST" });
      const data = await res.json();
      setNewInviteUrl(data.url);
      // Refresh invites list
      const invitesRes = await fetch("/api/invites");
      setInvites(await invitesRes.json());
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(newInviteUrl);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-lumm-text-primary">Управление участниками</h1>

      {/* Invite section */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
        <h2 className="text-lg font-semibold text-lumm-text-primary mb-4">Приглашения</h2>

        <button
          onClick={createInvite}
          disabled={loading}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-semibold rounded-lg hover:bg-lumm-gold-light transition-colors disabled:opacity-50"
        >
          {loading ? "Создание..." : "Создать приглашение"}
        </button>

        {newInviteUrl && (
          <div className="mt-4 p-4 bg-lumm-gold/10 border border-lumm-gold/20 rounded-lg">
            <p className="text-sm text-lumm-text-secondary mb-2">Ссылка-приглашение (действует 7 дней):</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={newInviteUrl}
                className="flex-1 px-3 py-2 bg-lumm-gray border border-lumm-gray-light rounded text-sm text-lumm-text-primary"
              />
              <button
                onClick={copyUrl}
                className="px-3 py-2 bg-lumm-gray border border-lumm-gray-light rounded text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
              >
                Копировать
              </button>
            </div>
          </div>
        )}

        {invites.length > 0 && (
          <div className="mt-4 space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-lumm-gray/30 rounded-lg text-sm">
                <span className="text-lumm-text-secondary font-mono truncate max-w-[200px]">
                  ...{inv.token.slice(-8)}
                </span>
                <span className={inv.usedBy ? "text-green-400" : new Date(inv.expiresAt) < new Date() ? "text-red-400" : "text-lumm-gold"}>
                  {inv.usedBy ? "Использовано" : new Date(inv.expiresAt) < new Date() ? "Истекло" : "Активно"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
        <h2 className="text-lg font-semibold text-lumm-text-primary mb-4">Участники ({members.length})</h2>

        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 py-3 px-4 bg-lumm-gray/30 rounded-lg">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-lumm-dark shrink-0"
                style={{ backgroundColor: m.avatarColor }}
              >
                {m.displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-lumm-text-primary">{m.displayName}</p>
                <p className="text-xs text-lumm-text-secondary">
                  {m.role} {m.username ? `@${m.username}` : ""} {m.telegramId ? `TG:${m.telegramId}` : ""}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${m.status === "active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {m.status === "active" ? "Активен" : "Неактивен"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add -A && git commit -m "feat: добавить админ-страницу управления участниками и приглашениями #N"
```

---

## Task 12: Build, seed, deploy

**Files:**
- No new files

- [ ] **Step 1: Re-seed the database**

```bash
cd /root/lumm && npm run seed
```

- [ ] **Step 2: Build the project**

```bash
cd /root/lumm && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Restart the service**

```bash
systemctl restart lumm && sleep 2 && systemctl status lumm | head -10
```

Expected: Active (running)

- [ ] **Step 4: Verify login page works**

```bash
curl -s -o /dev/null -w "%{http_code}" https://lumm.space/login
```

Expected: `200`

- [ ] **Step 5: Verify redirect to login for unauthenticated access**

```bash
curl -s -o /dev/null -w "%{http_code}" -L https://lumm.space/
```

Expected: Redirects to `/login` (should see `200` after following redirect)

- [ ] **Step 6: Test login API**

```bash
curl -s -X POST https://lumm.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"lumm2026"}'
```

Expected: `{"ok":true,"member":{"id":"...","displayName":"Admin","role":"admin"}}`

- [ ] **Step 7: Commit any fixes if needed, then final commit**

```bash
cd /root/lumm && git add -A && git commit -m "feat: auth система — финальная сборка и деплой #N"
```

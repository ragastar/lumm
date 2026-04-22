# Member Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "My Profile" page (edit displayName/avatarColor/password) + public "Members" pages (list + detail card), with minimal public-data exposure.

**Architecture:** Server Components for `/members` and `/members/[id]` (direct DB reads, respects group isolation). Client Component for `/profile` (form state). Two new public endpoints tighten the existing `/api/members` and `/api/members/[id]` to only return non-sensitive fields. Two new auth endpoints: update profile and change password.

**Tech Stack:** Next.js 16 App Router, SQLite (Drizzle ORM), bcryptjs, Tailwind CSS.

---

## File Structure

```
src/
  app/
    (main)/
      profile/
        page.tsx                         — CREATE: server wrapper, redirects if not auth
        ProfileClient.tsx                — CREATE: form for displayName + color + password
      members/
        page.tsx                         — CREATE: server list of members
        [id]/
          page.tsx                       — CREATE: server detail card
    api/
      members/
        route.ts                         — MODIFY: trim to public fields, filter by group
        [id]/
          route.ts                       — MODIFY: trim to public fields, filter by group
      auth/
        profile/
          route.ts                       — CREATE: PATCH displayName + avatarColor
        change-password/
          route.ts                       — CREATE: POST currentPassword + newPassword
  components/
    Sidebar.tsx                          — MODIFY: add "Участники" with NEW badge
    UserMenu.tsx                         — MODIFY: "Мой профиль" + rename admin link
```

No DB migrations required. No schema changes.

---

### Task 1: Trim `/api/members` to Public Fields

The existing endpoint returns every column, including `passwordHash`, `telegramId`, `username`, `realName`. Tighten it to only the public set and filter by current user's group.

**Files:**
- Modify: `/root/lumm/src/app/api/members/route.ts`

- [ ] **Step 1: Replace the route**

Overwrite `/root/lumm/src/app/api/members/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(asc(members.displayName));

  return Response.json(rows);
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke test with admin cookie**

```bash
cd /root/lumm && systemctl restart lumm && sleep 2
curl -s -c /tmp/c http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"lumm2026"}' > /dev/null
curl -s -b /tmp/c http://127.0.0.1:3000/api/members
```

Expected: JSON array with exactly these keys per row — `id, displayName, role, status, avatarColor, avatarUrl, createdAt`. No `passwordHash`, no `username`, no `telegramId`, no `realName`.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/app/api/members/route.ts
git commit -m "refactor: ограничить /api/members публичными полями + фильтр группы

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Trim `/api/members/[id]` to Public Fields

Same tightening for the single-member endpoint. Returns 404 if member is from a different group or inactive.

**Files:**
- Modify: `/root/lumm/src/app/api/members/[id]/route.ts`

- [ ] **Step 1: Replace the route**

Overwrite `/root/lumm/src/app/api/members/[id]/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      avatarUrl: members.avatarUrl,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(and(eq(members.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0 || rows[0].status !== "active") {
    return Response.json({ error: "Участник не найден" }, { status: 404 });
  }

  return Response.json(rows[0]);
}
```

- [ ] **Step 2: Smoke test**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -b /tmp/c http://127.0.0.1:3000/api/members/0dc86744-f96e-480b-a5ca-bb8e669b9820
```

Expected: JSON object with `id, displayName=Admin, role=admin, status=active, avatarColor, avatarUrl, createdAt`. No sensitive fields.

```bash
# Non-existent id returns 404
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c http://127.0.0.1:3000/api/members/does-not-exist
```

Expected: `404`.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add "src/app/api/members/[id]/route.ts"
git commit -m "refactor: ограничить /api/members/[id] публичными полями + 404 вне группы

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `PATCH /api/auth/profile` — Update Own Profile

Endpoint to update current user's `displayName` and/or `avatarColor`.

**Files:**
- Create: `/root/lumm/src/app/api/auth/profile/route.ts`

- [ ] **Step 1: Create the route**

Create `/root/lumm/src/app/api/auth/profile/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: { displayName?: string; avatarColor?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const updates: { displayName?: string; avatarColor?: string } = {};

  if (body.displayName !== undefined) {
    const trimmed = body.displayName.trim();
    if (trimmed.length < 2) {
      return Response.json({ error: "Никнейм должен быть минимум 2 символа" }, { status: 400 });
    }
    updates.displayName = trimmed;
  }

  if (body.avatarColor !== undefined) {
    if (!HEX_COLOR.test(body.avatarColor)) {
      return Response.json({ error: "Неверный цвет" }, { status: 400 });
    }
    updates.avatarColor = body.avatarColor;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  await db.update(members).set(updates).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Smoke test**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
# Update displayName only
curl -s -b /tmp/c -X PATCH http://127.0.0.1:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Admin Test"}'
# Check it persisted
curl -s -b /tmp/c http://127.0.0.1:3000/api/auth/me
# Revert
curl -s -b /tmp/c -X PATCH http://127.0.0.1:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Admin"}'
```

Expected: first curl returns `{"ok":true}`, second shows displayName "Admin Test", third reverts to "Admin".

- [ ] **Step 3: Validation smoke tests**

```bash
# Empty displayName → 400
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c -X PATCH http://127.0.0.1:3000/api/auth/profile \
  -H "Content-Type: application/json" -d '{"displayName":"a"}'
# Bad color → 400
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c -X PATCH http://127.0.0.1:3000/api/auth/profile \
  -H "Content-Type: application/json" -d '{"avatarColor":"not-a-hex"}'
# Empty body → 400
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c -X PATCH http://127.0.0.1:3000/api/auth/profile \
  -H "Content-Type: application/json" -d '{}'
```

Expected: all three return `400`.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/app/api/auth/profile/
git commit -m "feat: PATCH /api/auth/profile — обновить свой displayName/avatarColor

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `POST /api/auth/change-password`

Endpoint to change current user's password, verifying the old one first.

**Files:**
- Create: `/root/lumm/src/app/api/auth/change-password/route.ts`

- [ ] **Step 1: Create the route**

Create `/root/lumm/src/app/api/auth/change-password/route.ts`:

```typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: "Оба пароля обязательны" }, { status: 400 });
  }

  if (body.newPassword.length < 6) {
    return Response.json({ error: "Пароль должен быть минимум 6 символов" }, { status: 400 });
  }

  if (!user.passwordHash) {
    return Response.json({ error: "У вашего аккаунта нет пароля" }, { status: 400 });
  }

  if (!bcrypt.compareSync(body.currentPassword, user.passwordHash)) {
    return Response.json({ error: "Текущий пароль неверный" }, { status: 401 });
  }

  const passwordHash = bcrypt.hashSync(body.newPassword, 10);

  await db.update(members).set({ passwordHash }).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Smoke test**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
# Wrong current password → 401
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c -X POST http://127.0.0.1:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"wrong","newPassword":"newpass123"}'
# Short new password → 400
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c -X POST http://127.0.0.1:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"lumm2026","newPassword":"abc"}'
# Happy path: change and revert so admin password stays lumm2026
curl -s -b /tmp/c -X POST http://127.0.0.1:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"lumm2026","newPassword":"temp_lumm999"}'
# Verify new password works
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"temp_lumm999"}'
# Revert to lumm2026
curl -s -b /tmp/c -X POST http://127.0.0.1:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"temp_lumm999","newPassword":"lumm2026"}'
```

Expected: 401, 400, `{"ok":true}`, 200, `{"ok":true}`.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/app/api/auth/change-password/
git commit -m "feat: POST /api/auth/change-password — смена своего пароля

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `/profile` Page

Own profile page with inline edit form + password change section.

**Files:**
- Create: `/root/lumm/src/app/(main)/profile/page.tsx`
- Create: `/root/lumm/src/app/(main)/profile/ProfileClient.tsx`

- [ ] **Step 1: Create server wrapper**

Create `/root/lumm/src/app/(main)/profile/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileClient
      initial={{
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        role: user.role,
        hasPassword: !!user.passwordHash,
      }}
    />
  );
}
```

- [ ] **Step 2: Create ProfileClient**

Create `/root/lumm/src/app/(main)/profile/ProfileClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = [
  "#c9a84c", "#e06c75", "#61afef", "#98c379",
  "#c678dd", "#e5c07b", "#56b6c2", "#be5046",
];

type Props = {
  initial: {
    displayName: string;
    avatarColor: string;
    role: string;
    hasPassword: boolean;
  };
};

export function ProfileClient({ initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim(), avatarColor }),
    });
    setProfileLoading(false);
    if (res.ok) {
      setProfileMsg({ type: "ok", text: "Сохранено" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setProfileMsg({ type: "err", text: data.error || "Ошибка" });
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 6) {
      setPwMsg({ type: "err", text: "Новый пароль — минимум 6 символов" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "Новые пароли не совпадают" });
      return;
    }

    setPwLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPwLoading(false);
    if (res.ok) {
      setPwMsg({ type: "ok", text: "Пароль изменён" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json().catch(() => ({}));
      setPwMsg({ type: "err", text: data.error || "Ошибка" });
    }
  };

  const initial0 = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Мой профиль</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          Ваши публичные данные видны другим участникам группы
        </p>
      </div>

      <form
        onSubmit={saveProfile}
        className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5"
      >
        <h2 className="text-xl font-bold text-lumm-text-primary">Публичные данные</h2>

        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-lumm-dark transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {initial0}
          </div>
        </div>

        <div>
          <label className="block text-sm text-lumm-text-secondary mb-1">Никнейм</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="block text-sm text-lumm-text-secondary mb-2">Цвет аватара</label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`w-8 h-8 rounded-full transition-all ${
                  avatarColor === color
                    ? "ring-2 ring-lumm-text-primary ring-offset-2 ring-offset-lumm-black scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {profileMsg && (
          <p className={`text-sm ${profileMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
            {profileMsg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={profileLoading}
          className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
        >
          {profileLoading ? "Сохранение..." : "Сохранить"}
        </button>
      </form>

      {initial.hasPassword && (
        <form
          onSubmit={changePassword}
          className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-5"
        >
          <h2 className="text-xl font-bold text-lumm-text-primary">Смена пароля</h2>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Текущий пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm text-lumm-text-secondary mb-1">Подтвердите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-lumm-gray border border-lumm-gray-light rounded-lg px-3 py-2 text-lumm-text-primary focus:outline-none focus:border-lumm-gold"
              required
              minLength={6}
            />
          </div>

          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
              {pwMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
          >
            {pwLoading ? "Изменение..." : "Изменить пароль"}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c http://127.0.0.1:3000/profile
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add "src/app/(main)/profile/"
git commit -m "feat: страница /profile — редактирование своих данных + смена пароля

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `/members` Page (List)

Public list of group members as a grid of cards.

**Files:**
- Create: `/root/lumm/src/app/(main)/members/page.tsx`

- [ ] **Step 1: Create members page**

Create `/root/lumm/src/app/(main)/members/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      avatarColor: members.avatarColor,
    })
    .from(members)
    .where(and(eq(members.groupId, user.groupId), eq(members.status, "active")))
    .orderBy(asc(members.displayName));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Участники мастермайнда</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          {rows.length} {rows.length === 1 ? "активный участник" : "активных участников"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {rows.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 flex flex-col items-center gap-3 hover:border-lumm-gold transition-colors"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-lumm-dark"
              style={{ backgroundColor: m.avatarColor }}
            >
              {m.displayName[0]?.toUpperCase()}
            </div>
            <p className="text-lumm-text-primary font-medium text-center">{m.displayName}</p>
            <p className="text-xs text-lumm-text-secondary">{m.role}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c http://127.0.0.1:3000/members
```

Expected: `200`.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add "src/app/(main)/members/page.tsx"
git commit -m "feat: страница /members — сетка карточек участников

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `/members/[id]` Page (Detail Card)

Single member detail page — large avatar, nick, role, join date, back link.

**Files:**
- Create: `/root/lumm/src/app/(main)/members/[id]/page.tsx`

- [ ] **Step 1: Create detail page**

Create `/root/lumm/src/app/(main)/members/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      role: members.role,
      status: members.status,
      avatarColor: members.avatarColor,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(and(eq(members.id, id), eq(members.groupId, user.groupId)))
    .limit(1);

  if (rows.length === 0 || rows[0].status !== "active") {
    notFound();
  }

  const m = rows[0];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-lumm-text-secondary hover:text-lumm-text-primary"
      >
        ← Назад к участникам
      </Link>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-8 flex flex-col items-center gap-4">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-lumm-dark"
          style={{ backgroundColor: m.avatarColor }}
        >
          {m.displayName[0]?.toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-lumm-text-primary">{m.displayName}</h1>
        <span className="px-3 py-1 bg-lumm-gold/10 text-lumm-gold text-sm rounded-full border border-lumm-gold/20">
          {m.role}
        </span>
        <p className="text-sm text-lumm-text-secondary">Участник с {formatDate(m.createdAt)}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c http://127.0.0.1:3000/members/0dc86744-f96e-480b-a5ca-bb8e669b9820
```

Expected: `200`. And a non-existent id:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c http://127.0.0.1:3000/members/does-not-exist
```

Expected: `404`.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add "src/app/(main)/members/[id]/page.tsx"
git commit -m "feat: страница /members/[id] — карточка участника

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Sidebar — Add "Участники" with NEW Badge

Add public "Участники" link between "Календарь" and "Бюджет", with a small NEW badge.

**Files:**
- Modify: `/root/lumm/src/components/Sidebar.tsx`

- [ ] **Step 1: Update the nav array + badge rendering**

Overwrite `/root/lumm/src/components/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserMenu } from "./UserMenu";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
};

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/reports", label: "Отчёты", icon: "◇" },
  { href: "/financials", label: "Финансы", icon: "◈" },
  { href: "/analytics", label: "Аналитика", icon: "◈" },
  { href: "/calendar", label: "Календарь", icon: "◎" },
  { href: "/members", label: "Участники", icon: "◐", badge: "NEW" },
  { href: "/budget", label: "Бюджет", icon: "◉" },
  { href: "/fines", label: "Штрафы", icon: "◫" },
  { href: "/constitution", label: "Конституция", icon: "◩" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-6 border-b border-lumm-gray-light">
        <h1 className="text-2xl font-bold text-lumm-gold tracking-wider">LUMM</h1>
        <p className="text-xs text-lumm-text-secondary mt-1">Level Up Mastermind</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
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
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs bg-lumm-gold text-lumm-dark rounded font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-lumm-gray-light">
        <UserMenu />
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

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /root/lumm && git add src/components/Sidebar.tsx
git commit -m "feat: добавить пункт 'Участники' с NEW-бейджем в сайдбар

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: UserMenu — "Мой профиль" + Rename Admin Link

Add "Мой профиль" as first item (for everyone), rename admin-only "Участники" to "Управление участниками" so it doesn't collide with the public sidebar link.

**Files:**
- Modify: `/root/lumm/src/components/UserMenu.tsx`

- [ ] **Step 1: Update menu items**

Edit `/root/lumm/src/components/UserMenu.tsx` — inside the `{open && ...}` dropdown block, replace the entire buttons section with:

```tsx
          <button
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
            className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
          >
            Мой профиль
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/invites");
                }}
                className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
              >
                Приглашения
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/members");
                }}
                className="w-full text-left px-3 py-2 text-sm text-lumm-text-primary hover:bg-lumm-gray-light transition-colors"
              >
                Управление участниками
              </button>
            </>
          )}
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-lumm-gray-light transition-colors"
          >
            Выйти
          </button>
```

This replaces the existing `{isAdmin && (...)}` fragment and the existing logout button. Before the edit, the file has three buttons visible in the dropdown (Приглашения, Участники, Выйти). After the edit, the dropdown has four (Мой профиль, Приглашения, Управление участниками, Выйти) where the admin-only ones stay gated behind `isAdmin`.

- [ ] **Step 2: Verify build**

```bash
cd /root/lumm && npx next build && systemctl restart lumm && sleep 2
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/c http://127.0.0.1:3000/profile
```

Expected: `200`.

- [ ] **Step 3: Manual UI check**

Open `https://lumm.space` in browser (already logged in as admin). Click avatar in sidebar:
- Dropdown shows: **Мой профиль**, **Приглашения**, **Управление участниками**, **Выйти**
- Click "Мой профиль" → navigates to `/profile`
- Click "Управление участниками" → navigates to `/admin/members`
- In the main sidebar: new item **Участники** with gold **NEW** badge, between "Календарь" and "Бюджет"

- [ ] **Step 4: Commit**

```bash
cd /root/lumm && git add src/components/UserMenu.tsx
git commit -m "feat: 'Мой профиль' в UserMenu + переименовать админский пункт

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: End-to-End Manual Test

Verify everything works together in the browser.

**Files:**
- None (testing only)

- [ ] **Step 1: Test profile editing**

1. Open `https://lumm.space` as admin
2. Sidebar avatar → "Мой профиль" → `/profile` loads
3. Change displayName to something like "Admin Test", click Save → green "Сохранено"
4. Refresh page — displayName persists
5. Change it back to "Admin"
6. Pick a different avatar color, save — avatar in sidebar updates after refresh

- [ ] **Step 2: Test password change**

1. On `/profile`, try wrong current password → red error
2. Try new password shorter than 6 → red error
3. Try mismatched confirm → red error
4. Valid change: current=lumm2026, new=temp_lumm999 → green "Пароль изменён"
5. Logout → login with temp_lumm999 works → login with lumm2026 fails
6. On /profile, change back to lumm2026

- [ ] **Step 3: Test members pages**

1. Sidebar → "Участники" (with NEW badge) → `/members` shows grid
2. Click on admin's card → `/members/[id]` shows large card
3. Click "← Назад к участникам" → back to list

- [ ] **Step 4: Test privacy**

```bash
# Fresh session — no cookie. Listing should be 401 or redirect
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/members
# With cookie, no sensitive fields
curl -s -b /tmp/c http://127.0.0.1:3000/api/members | node -pe "
const arr = JSON.parse(require('fs').readFileSync(0));
const sensitive = ['passwordHash', 'username', 'telegramId', 'realName', 'groupId'];
for (const m of arr) {
  for (const f of sensitive) {
    if (f in m) throw new Error('Leaked: ' + f);
  }
}
'OK, ' + arr.length + ' members'
"
```

Expected: 401 (redirect to /login from proxy), then "OK, N members" with no leaked fields.

- [ ] **Step 5: Update memory file about completion**

Since we've built a significant user-facing feature, update the project memory file to reflect current state.

```bash
cat > /root/.claude/projects/-root/memory/project_lumm.md <<'EOF'
---
name: LUMM project state
description: LUMM (Level Up Mastermind) — SaaS для мастермайнд-групп, Next.js 16 + SQLite, текущий прогресс и следующие шаги
type: project
---

LUMM (Level Up Mastermind) — платформа для мастермайнд-групп. Живёт в `/root/lumm`, prod на `https://lumm.space`.

**Стек:** Next.js 16 (App Router, proxy.ts вместо middleware), SQLite (Drizzle ORM), TailwindCSS, JWT (jose), bcryptjs.

**Что сделано (Фаза 1 MVP):**
- Все основные страницы: Dashboard, analytics, financials, calendar, constitution, budget, fines, reports
- Auth: username/password, invite-ссылки с лимитом регистраций, onboarding
- Admin-панели: /admin/invites (создать/копировать/удалить), /admin/members (сброс пароля, активация)
- Личный кабинет: /profile (смена ника/цвета/пароля)
- Публичные страницы: /members (список), /members/[id] (карточка)
- Route groups (auth) и (main) с разными layouts
- Proxy защищает роуты: /login, /invite, /api/auth публичные; /api/invites/[token] и /claim публичные; /admin/* и /api/admin/* только admin

**Отменено:** Telegram авторизация (widget + bot login) — выпилена как слишком сложная. TELEGRAM_BOT_TOKEN и колонка members.telegram_id остались на будущее.

**Что осталось по Фазе 1 PRD:**
- Telegram-бот функциональность (парсер #отчет, напоминания, inline-кнопки для оценок)

**Why:** PRD в `/root/lumm/LUMM_PRD_v1.pdf`, фазовая разработка, приоритет — MVP для самой группы Level Up (4-6 человек).

**How to apply:** Перед новыми фичами проверить что уже сделано. Приватность по PRD: реальные имена скрыты, финансы видны по никам, привязка ник→человек только у самого юзера и админа.
EOF
```

- [ ] **Step 6: Commit memory update**

No git commit needed — memory files are in `/root/.claude/` outside the repo.

---

## Self-Review Summary

- Every spec section has a task: privacy API tightening (Tasks 1-2), profile API (Tasks 3-4), profile page (Task 5), members pages (Tasks 6-7), sidebar badge (Task 8), UserMenu changes (Task 9), E2E (Task 10).
- No TBD or placeholder text.
- Type consistency: `displayName`, `avatarColor`, `role`, `status` used uniformly. `hasPassword` (derived from `!!user.passwordHash`) used consistently in the Profile client.
- Privacy rules from spec enforced in Tasks 1-2.

# LUMM Authentication System Design

## Overview

Replace the demo cookie-based user switching with a real invite-only authentication system. Primary login via Telegram Login Widget, fallback via username/password. JWT for sessions.

## Decisions

- **Auth approach:** Self-built in Next.js API routes (no NextAuth — too heavy for invite-only model)
- **Primary login:** Telegram Login Widget
- **Fallback login:** Username / password (bcrypt)
- **Session:** JWT in httpOnly cookie (stateless, no session table)
- **Roles:** `admin` and `member` (expandable later)
- **Access:** Invite-only — admin generates invite link, user registers through it

## Data Schema

### members (updated)

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| groupId | TEXT FK → groups | |
| telegramId | TEXT, nullable | Filled on Telegram Login |
| username | TEXT, nullable | For fallback login |
| passwordHash | TEXT, nullable | bcrypt, only for fallback |
| displayName | TEXT | User picks during onboarding |
| avatarUrl | TEXT, nullable | Uploaded avatar or null |
| avatarColor | TEXT | Hex color, default #c9a84c |
| role | TEXT | "admin" or "member" |
| status | TEXT | "active" or "inactive" |
| createdAt | TEXT | datetime |

### invites (new)

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| groupId | TEXT FK → groups | |
| token | TEXT, unique | Random token for URL |
| createdBy | TEXT FK → members | Admin who created |
| expiresAt | TEXT | 7 days from creation |
| usedBy | TEXT FK → members, nullable | Who claimed it |
| usedAt | TEXT, nullable | When claimed |

### Unchanged tables

`groups`, `weeklyReports`, `monthlyFinancials`, `meetings` — no schema changes.

## User Flows

### Invite flow (new user)

1. Admin → admin panel → "Invite" → generates link `lumm.space/invite/{token}`
2. User opens link → system validates token (exists, not expired, not used)
3. Registration page:
   - Primary: "Login with Telegram" button (Telegram Login Widget)
   - Fallback: username/password form
4. After auth → **onboarding screen**: pick display name + avatar
5. Account created, invite marked as used → redirect to dashboard

### Returning user login

1. `lumm.space` → no JWT cookie → redirect to `/login`
2. `/login` page: Telegram Login or username/password
3. Success → JWT httpOnly cookie set → redirect to dashboard

### Route protection

- Next.js middleware checks JWT on every request
- Public routes (no auth needed): `/login`, `/invite/*`, `/api/auth/*`
- Admin-only routes: `/admin/*`, `POST /api/invites` — check `role === "admin"`
- All other routes: valid JWT required, redirect to `/login` if missing/invalid

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/telegram | Public | Verify Telegram Login data, find/create user, return JWT |
| POST | /api/auth/login | Public | Username/password login, return JWT |
| POST | /api/auth/logout | Any | Clear JWT cookie |
| GET | /api/auth/me | Any | Current user from JWT |
| POST | /api/auth/onboard | Authed | Set displayName and avatarUrl after registration |

### Invites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/invites | Admin | Create new invite |
| GET | /api/invites | Admin | List all invites |
| GET | /api/invites/[token] | Public | Check invite validity |
| POST | /api/invites/[token]/claim | Public | Register via invite |

### Existing APIs

All existing endpoints (`/api/members`, `/api/weekly-reports`, `/api/monthly-financials`, `/api/meetings`) remain unchanged but are now protected by middleware — authed users only.

## Pages

### New pages

- `/login` — Telegram Login Widget + username/password form
- `/invite/[token]` — Registration via invite (same auth options + onboarding)
- `/admin/members` — Member list, invite creation, member management (admin only)

### Modified pages

- `Sidebar.tsx` — Replace UserSwitcher with current user avatar/name + logout button
- All pages — Remove "default to first member" fallback, use JWT identity only

## Removals

- `UserSwitcher.tsx` component — delete
- `POST /api/auth/switch` endpoint — delete
- Demo seed data (5 mock members) — replace with admin bootstrap seed
- Cookie-based `lumm_member_id` logic in `session.ts` — replace with JWT verification

## First Run / Bootstrap

Seed script creates:
- One group ("Level Up" or configurable)
- One admin user with username/password (configured by deployer)
- No mock members, reports, or financials

## Security

- Telegram Login: verify data hash using bot token (HMAC-SHA256) per Telegram docs
- Passwords: bcrypt with default cost factor
- JWT: signed with server secret (env var `JWT_SECRET`), httpOnly + secure + sameSite cookie
- Invite tokens: cryptographically random (crypto.randomUUID or similar), single-use
- Middleware runs on every non-public route

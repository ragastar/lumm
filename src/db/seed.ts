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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_monthly_member_month
    ON monthly_financials(member_id, month);
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

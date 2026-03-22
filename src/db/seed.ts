import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "lumm.db");
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// Create tables
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
    display_name TEXT NOT NULL,
    real_name TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    avatar_color TEXT NOT NULL DEFAULT '#c9a84c',
    created_at TEXT NOT NULL
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

// Group
db.insert(schema.groups).values({
  id: groupId,
  name: "Level Up",
  settings: JSON.stringify({ fineAmount: 5000, meetingDay: "third_thursday" }),
  createdAt: now,
}).run();

// Members
const memberData = [
  { displayName: "Phoenix", role: "admin" as const, color: "#c9a84c" },
  { displayName: "Maverick", role: "member" as const, color: "#4a9eff" },
  { displayName: "Atlas", role: "moderator" as const, color: "#ff6b6b" },
  { displayName: "Nova", role: "treasurer" as const, color: "#51cf66" },
  { displayName: "Cipher", role: "member" as const, color: "#cc5de8" },
];

const memberIds: string[] = [];
for (const m of memberData) {
  const id = randomUUID();
  memberIds.push(id);
  db.insert(schema.members).values({
    id,
    groupId,
    displayName: m.displayName,
    role: m.role,
    status: "active",
    avatarColor: m.color,
    createdAt: now,
  }).run();
}

// Weekly reports — last 8 weeks for each member
function getMonday(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7);
  return d.toISOString().split("T")[0];
}

const businessTexts = [
  "Закрыл 3 сделки, запустил рекламу в Яндекс.Директ",
  "Провёл переговоры с крупным клиентом, подписали NDA",
  "Оптимизировал воронку продаж, конверсия +15%",
  "Нанял нового менеджера, делегировал операционку",
  "Запустил новый продукт, первые продажи пошли",
  "Рефакторил бизнес-процессы, внедрил CRM",
  "Выступил на конференции, получил 12 лидов",
  "Закрыл квартал с ростом +23% к прошлому",
];

const familyTexts = [
  "Провёл выходные с семьёй на даче",
  "Сходили с детьми в аквапарк",
  "Организовал семейный ужин, давно не собирались",
  "Начал больше времени проводить с ребёнком по вечерам",
  "Съездили в короткий отпуск на 3 дня",
  "Жена довольна — наконец разгрузил вечера от работы",
  "Записал сына на робототехнику, ходим вместе",
  "Устроил романтический вечер, давно не было",
];

const personalTexts = [
  "Начал бегать по утрам, 3 раза на этой неделе",
  "Прочитал 'Атомные привычки', внедряю",
  "Записался к коучу, первая сессия на следующей неделе",
  "Медитирую каждое утро по 10 минут",
  "Пробежал первые 5 км без остановки",
  "Начал вести дневник, помогает структурировать мысли",
  "Сходил на мастер-класс по публичным выступлениям",
  "Наладил режим сна — ложусь до 23:00",
];

for (const memberId of memberIds) {
  for (let w = 0; w < 8; w++) {
    if (Math.random() < 0.1 && w > 0) continue;

    const sb = Math.floor(Math.random() * 4) + 6;
    const sf = Math.floor(Math.random() * 5) + 5;
    const sp = Math.floor(Math.random() * 4) + 5;

    db.insert(schema.weeklyReports).values({
      id: randomUUID(),
      memberId,
      weekStart: getMonday(w),
      businessText: businessTexts[Math.floor(Math.random() * businessTexts.length)],
      familyText: familyTexts[Math.floor(Math.random() * familyTexts.length)],
      personalText: personalTexts[Math.floor(Math.random() * personalTexts.length)],
      scoreBusiness: sb,
      scoreFamily: sf,
      scorePersonal: sp,
      planText: "Финализировать КП, встреча с партнёром, закрыть задачи по проекту",
      source: Math.random() > 0.3 ? "telegram" : "web",
      createdAt: now,
    }).run();
  }
}

// Monthly financials — last 6 months
for (let mi = 0; mi < memberIds.length; mi++) {
  const baseRevenue = [2500000, 1800000, 3200000, 900000, 1500000][mi];
  const profitMargin = [0.25, 0.3, 0.2, 0.35, 0.28][mi];

  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

    const growth = 1 + (6 - m) * 0.03 + (Math.random() - 0.5) * 0.1;
    const revenue = Math.round(baseRevenue * growth);
    const netProfit = Math.round(revenue * profitMargin * (0.9 + Math.random() * 0.2));

    db.insert(schema.monthlyFinancials).values({
      id: randomUUID(),
      memberId: memberIds[mi],
      month,
      revenue,
      netProfit,
      capital: m % 3 === 0 ? Math.round(revenue * 2.5) : null,
      scoreBusiness: Math.floor(Math.random() * 3) + 7,
      scoreFamily: Math.floor(Math.random() * 4) + 6,
      scorePersonal: Math.floor(Math.random() * 3) + 6,
      reportText: "Месяц прошёл продуктивно. Основной фокус на росте выручки и оптимизации процессов.",
      createdAt: now,
    }).run();
  }
}

// Meetings — past 3 + next 3 on third Thursdays
function getThirdThursday(year: number, month: number): string {
  const d = new Date(year, month, 1);
  const firstDay = d.getDay();
  const firstThursday = firstDay <= 4 ? 4 - firstDay + 1 : 12 - firstDay;
  const thirdThursday = firstThursday + 14;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(thirdThursday).padStart(2, "0")}`;
}

const today = new Date();
for (let m = -3; m <= 2; m++) {
  const d = new Date(today.getFullYear(), today.getMonth() + m, 1);
  const meetingDate = getThirdThursday(d.getFullYear(), d.getMonth());
  const isPast = new Date(meetingDate) < today;

  db.insert(schema.meetings).values({
    id: randomUUID(),
    groupId,
    date: meetingDate,
    organizerId: memberIds[Math.abs(m + 3) % memberIds.length],
    location: isPast
      ? ["Кофейня 'Кофемания', Тверская", "Коворкинг 'Рабочая станция'", "Лофт 'Флакон'"][Math.abs(m) % 3]
      : "Коворкинг 'Рабочая станция', Красный Октябрь",
    status: isPast ? "completed" : "scheduled",
    createdAt: now,
  }).run();
}

sqlite.close();
console.log("Database seeded successfully!");
console.log(`  - 1 group`);
console.log(`  - ${memberIds.length} members`);
console.log(`  - Weekly reports for 8 weeks`);
console.log(`  - Monthly financials for 6 months`);
console.log(`  - 6 meetings (past + upcoming)`);

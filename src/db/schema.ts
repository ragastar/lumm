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
  displayName: text("display_name").notNull(),
  realName: text("real_name"),
  role: text("role", { enum: ["member", "moderator", "treasurer", "admin"] }).notNull().default("member"),
  status: text("status", { enum: ["active", "trial", "inactive"] }).notNull().default("active"),
  avatarColor: text("avatar_color").notNull().default("#c9a84c"),
  createdAt: text("created_at").notNull(),
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

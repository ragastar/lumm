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
  businessGoal: text("business_goal"),
  sportGoal: text("sport_goal"),
  avatarColor: text("avatar_color").notNull().default("#c9a84c"),
  createdAt: text("created_at").notNull(),
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  token: text("token").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => members.id),
  expiresAt: text("expires_at").notNull(),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
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
  rawText: text("raw_text"),
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

export const reportAnalyses = sqliteTable("report_analyses", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().unique().references(() => weeklyReports.id),
  trafficLight: text("traffic_light", { enum: ["green", "yellow", "red"] }).notNull(),
  did: text("did").notNull(),
  missed: text("missed").notNull(),
  nextQuestion: text("next_question").notNull(),
  coach: text("coach").notNull(),
  model: text("model").notNull(),
  createdAt: text("created_at").notNull(),
});

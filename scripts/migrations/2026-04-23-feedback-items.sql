-- scripts/migrations/2026-04-23-feedback-items.sql
-- Штурвал — таблица feedback_items

CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

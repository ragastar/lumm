-- scripts/migrations/2026-04-23-goal-plans.sql
-- Эпик 5: структурная цель (WOOP + HARD + 12WY + SCI/Klein)

BEGIN;

CREATE TABLE IF NOT EXISTS goal_plans (
  id            TEXT PRIMARY KEY NOT NULL,
  member_id     TEXT NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  wish          TEXT NOT NULL,
  sphere        TEXT NOT NULL,
  sci_score     INTEGER NOT NULL,
  klein_avg     REAL NOT NULL,
  difficulty    INTEGER NOT NULL,
  metric_name   TEXT,
  metric_start  TEXT,
  metric_target TEXT,
  data          TEXT NOT NULL,
  locked        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

COMMIT;

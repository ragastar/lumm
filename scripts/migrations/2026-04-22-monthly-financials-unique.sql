-- scripts/migrations/2026-04-22-monthly-financials-unique.sql
-- Эпик 3: UNIQUE(member_id, month) + updated_at

BEGIN;

ALTER TABLE monthly_financials
  ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';

UPDATE monthly_financials SET updated_at = created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_monthly_member_month
  ON monthly_financials(member_id, month);

COMMIT;

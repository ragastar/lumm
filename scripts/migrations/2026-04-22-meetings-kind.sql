-- scripts/migrations/2026-04-22-meetings-kind.sql
-- Эпик 4: kind на meetings (standard | ad_hoc)

ALTER TABLE meetings
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'standard';

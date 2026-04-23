-- scripts/migrations/2026-04-23-meeting-attendees.sql
-- RSVP на встречи: таблица meeting_attendees

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_meeting_member
  ON meeting_attendees(meeting_id, member_id);

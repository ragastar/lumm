-- Issue #12: реальные Telegram @handle для пингов
-- Поле nullable — админ вводит вручную в /admin/members.

ALTER TABLE members
  ADD COLUMN telegram_username TEXT;

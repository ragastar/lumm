-- Issue #14: обязательный адрес + время (start/end) + опциональная цена

BEGIN;

ALTER TABLE meetings
  ADD COLUMN time_start TEXT NOT NULL DEFAULT '19:00';

ALTER TABLE meetings
  ADD COLUMN time_end TEXT NOT NULL DEFAULT '21:00';

ALTER TABLE meetings
  ADD COLUMN price REAL;

-- Существующая встреча 21.05.2026 осталась без адреса — заполняем плейсхолдером,
-- чтобы NOT NULL constraint на API-уровне не мешал (сам столбец в БД остаётся nullable).
UPDATE meetings SET location = 'не указан' WHERE location IS NULL OR location = '';

COMMIT;

-- Issue #19: title + description на meetings (оба nullable)

ALTER TABLE meetings ADD COLUMN title TEXT;
ALTER TABLE meetings ADD COLUMN description TEXT;

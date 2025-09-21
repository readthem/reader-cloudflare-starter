-- Per-user reading progress (one row per user+book)
CREATE TABLE IF NOT EXISTS reading_progress (
  user_id    TEXT NOT NULL,
  book_id    TEXT NOT NULL,
  cfi        TEXT,                -- EPUB location (CFI) if applicable
  percent    REAL,                -- 0..100 or 0..1 (your choice; we’ll store as REAL)
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, book_id)
);

-- Per-user annotations (highlights/notes)
CREATE TABLE IF NOT EXISTS annotations (
  id         TEXT PRIMARY KEY,    -- uuid
  user_id    TEXT NOT NULL,
  book_id    TEXT NOT NULL,
  cfi_range  TEXT,                -- start..end CFI or pdf locator
  note       TEXT,                -- freeform text / JSON
  color      TEXT,                -- optional highlight color
  tags       TEXT,                -- optional CSV or JSON tags
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Handy view for debugging (optional)
-- CREATE VIEW IF NOT EXISTS v_ann AS
--   SELECT id, user_id, book_id, substr(note,1,40) AS note_snip, updated_at FROM annotations;

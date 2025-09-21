-- Users
CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,
  email     TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Sessions (sid cookie -> user)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);

-- Books you already have, but just in case:
CREATE TABLE IF NOT EXISTS books (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  title     TEXT,
  author    TEXT,
  r2_key    TEXT NOT NULL,
  type      TEXT NOT NULL, -- 'epub'|'pdf'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS books_user ON books(user_id);

-- Reading progress (one row per user + book)
CREATE TABLE IF NOT EXISTS reading_progress (
  user_id    TEXT NOT NULL,
  book_id    TEXT NOT NULL,
  cfi        TEXT,
  percent    REAL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, book_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Annotations
CREATE TABLE IF NOT EXISTS annotations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  book_id    TEXT NOT NULL,
  kind       TEXT NOT NULL, -- 'hl' | 'gloss' | 'note'
  color      TEXT,          -- for highlights
  payload    TEXT,          -- JSON blob (section src, offsets, snippet, etc.)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS annotations_user_book ON annotations(user_id, book_id);

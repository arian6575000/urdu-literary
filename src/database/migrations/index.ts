// Migrations are applied in order; PRAGMA user_version stores how many have run.
export const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE writing_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE writings (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category_id TEXT NOT NULL DEFAULT 'free' REFERENCES writing_categories(id),
    author TEXT NOT NULL DEFAULT '',
    original_transcript TEXT NOT NULL DEFAULT '',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_writings_updated ON writings(updated_at DESC);
  CREATE INDEX idx_writings_cat ON writings(category_id);
  CREATE INDEX idx_writings_fav ON writings(is_favorite);

  CREATE TABLE writing_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    writing_id TEXT NOT NULL REFERENCES writings(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_versions_writing ON writing_versions(writing_id, created_at DESC);

  CREATE TABLE voice_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    writing_id TEXT REFERENCES writings(id) ON DELETE SET NULL,
    engine TEXT NOT NULL DEFAULT 'device',
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE voice_transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL DEFAULT '',
    edited_text TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_transcripts_session ON voice_transcripts(session_id);

  CREATE TABLE custom_dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    note TEXT NOT NULL DEFAULT '',
    wrong_forms TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE favorites (
    writing_id TEXT PRIMARY KEY NOT NULL REFERENCES writings(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE export_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    writing_ids TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

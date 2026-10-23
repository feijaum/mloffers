-- Observatório ML — banco exclusivo. NÃO utilizar o banco da automação original.
CREATE TABLE IF NOT EXISTS instagram_webhook_events (
  event_hash TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processed','ignored','failed')),
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_instagram_events_status ON instagram_webhook_events(status,received_at);
CREATE TABLE IF NOT EXISTS instagram_posts (
  media_id TEXT PRIMARY KEY,
  caption TEXT,
  affiliate_url TEXT,
  keyword TEXT NOT NULL DEFAULT 'EU QUERO',
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS instagram_comment_actions (
  comment_id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

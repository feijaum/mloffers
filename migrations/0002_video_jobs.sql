-- Tabelas do gerador Veo, separadas da automação do Instagram.
CREATE TABLE IF NOT EXISTS video_jobs (
 id TEXT PRIMARY KEY,
 model TEXT NOT NULL,
 prompt TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('requesting','processing','ready','failed')),
 operation TEXT,
 video_uri TEXT,
 error TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created ON video_jobs(created_at);
CREATE TABLE IF NOT EXISTS video_login_attempts (
 ip_hash TEXT NOT NULL,
 hour_bucket INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(ip_hash,hour_bucket)
);

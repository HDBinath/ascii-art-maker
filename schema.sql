-- Orbit Cyber Studio Gallery Schema for Cloudflare D1
CREATE TABLE IF NOT EXISTS gallery_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL,           -- 'ascii', 'dither', 'hybrid'
  image_key TEXT NOT NULL,      -- R2 object key (e.g., posts/xyz.png)
  thumbnail_key TEXT,           -- R2 thumbnail key
  plain_text TEXT,              -- Plain text representation if ASCII/Hybrid
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  unit_name TEXT NOT NULL,      -- 'CHARS', 'PIXELS', 'CELLS'
  options_json TEXT,            -- Serialized AppOptions for 'Remix in Studio'
  likes_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON gallery_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON gallery_posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_mode ON gallery_posts(mode);

PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  recovery_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX sessions_account_idx ON sessions(account_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE saves (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE daily_scores (
  day TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100000000),
  display_name TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (day, account_id)
);

CREATE INDEX daily_scores_board_idx ON daily_scores(day, score DESC, updated_at ASC);

-- Deliberately aggregated: no account, IP address, user agent, message, or stack.
CREATE TABLE crash_aggregates (
  day TEXT NOT NULL,
  signature TEXT NOT NULL,
  release TEXT NOT NULL,
  platform TEXT NOT NULL,
  category TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (day, signature, release, platform, category)
);

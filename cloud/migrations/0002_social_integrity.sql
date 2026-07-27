PRAGMA foreign_keys = ON;

-- Friend codes are random public locators, not authentication credentials.
CREATE TABLE social_profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  friend_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (length(friend_code) = 8)
);

CREATE TABLE friendships (
  account_low TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  account_high TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (account_low, account_high),
  CHECK (account_low < account_high),
  CHECK (created_by = account_low OR created_by = account_high)
);

CREATE INDEX friendships_high_idx ON friendships(account_high);

-- Only a peppered nonce digest is retained. A successful score consumes it.
CREATE TABLE score_challenges (
  nonce_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX score_challenges_account_idx
  ON score_challenges(account_id, scope, expires_at);

CREATE TABLE ghost_duels (
  id TEXT PRIMARY KEY,
  challenger_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  challenger_score INTEGER NOT NULL CHECK (challenger_score BETWEEN 0 AND 100000000),
  challenger_replay TEXT NOT NULL,
  challenger_checksum TEXT NOT NULL,
  target_score INTEGER CHECK (target_score BETWEEN 0 AND 100000000),
  target_replay TEXT,
  target_checksum TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  CHECK (challenger_id <> target_id),
  CHECK (
    (status = 'pending' AND target_score IS NULL AND completed_at IS NULL)
    OR
    (status = 'completed' AND target_score IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE INDEX ghost_duels_challenger_idx
  ON ghost_duels(challenger_id, created_at DESC);
CREATE INDEX ghost_duels_target_idx
  ON ghost_duels(target_id, status, created_at DESC);

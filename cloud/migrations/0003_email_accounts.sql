-- Email/password accounts alongside anonymous recovery codes.
ALTER TABLE accounts ADD COLUMN email TEXT;
ALTER TABLE accounts ADD COLUMN password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_idx ON accounts(email) WHERE email IS NOT NULL;

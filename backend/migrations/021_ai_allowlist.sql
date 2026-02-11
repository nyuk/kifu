ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_allowlisted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_ai_allowlisted_true
ON users (ai_allowlisted)
WHERE ai_allowlisted = true;

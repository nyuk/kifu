ALTER TABLE subscriptions
  ADD COLUMN ai_quota_limit INTEGER;

UPDATE subscriptions
  SET ai_quota_limit = ai_quota_remaining
  WHERE ai_quota_limit IS NULL;

ALTER TABLE subscriptions
  ALTER COLUMN ai_quota_limit SET NOT NULL,
  ALTER COLUMN ai_quota_limit SET DEFAULT 200;

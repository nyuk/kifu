-- Normalize AI provider metadata for invocation adapter routing.
-- This migration is idempotent and safe to re-run.

UPDATE ai_providers
SET
  provider_type = CASE
    WHEN lower(name) = 'openai' THEN 'openai'
    WHEN lower(name) = 'claude' THEN 'anthropic'
    WHEN lower(name) = 'gemini' THEN 'google'
    ELSE provider_type
  END,
  base_url = CASE
    WHEN lower(name) = 'openai' THEN 'https://api.openai.com/v1'
    WHEN lower(name) = 'claude' THEN 'https://api.anthropic.com'
    WHEN lower(name) = 'gemini' THEN 'https://generativelanguage.googleapis.com/v1beta'
    ELSE base_url
  END
WHERE lower(name) IN ('openai', 'claude', 'gemini');


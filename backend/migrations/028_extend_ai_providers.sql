-- Migration: Extend ai_providers table with connection metadata
-- Adds provider_type, base_url, default_endpoint, timeout_seconds, retry_policy, responses_api_enabled

ALTER TABLE ai_providers
ADD COLUMN provider_type VARCHAR(50) DEFAULT 'openai-compatible',
ADD COLUMN base_url VARCHAR(255) DEFAULT 'https://api.openai.com/v1',
ADD COLUMN default_endpoint VARCHAR(100) DEFAULT 'chat/completions',
ADD COLUMN timeout_seconds INT DEFAULT 0,
ADD COLUMN retry_policy JSONB DEFAULT '{"max_retries": 3, "base_backoff_ms": 500, "max_backoff_ms": 10000}',
ADD COLUMN responses_api_enabled BOOLEAN DEFAULT false;

-- Create index on enabled and is_default for faster lookups
CREATE INDEX idx_ai_providers_enabled_default ON ai_providers(enabled, is_default);

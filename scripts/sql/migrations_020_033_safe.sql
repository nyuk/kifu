CREATE TABLE IF NOT EXISTS guided_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, review_date)
);

CREATE TABLE IF NOT EXISTS guided_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES guided_reviews(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    bundle_key VARCHAR(100),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10),
    pnl NUMERIC,
    trade_count INT NOT NULL DEFAULT 1,
    intent VARCHAR(50),
    emotions JSONB,
    pattern_match VARCHAR(50),
    memo TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_review_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guided_reviews_user_date ON guided_reviews(user_id, review_date DESC);
CREATE INDEX IF NOT EXISTS idx_guided_review_items_review ON guided_review_items(review_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ai_allowlisted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_ai_allowlisted_true
    ON users (ai_allowlisted)
    WHERE ai_allowlisted = true;

CREATE TABLE IF NOT EXISTS runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_type VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_user_started_at ON runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_user_status ON runs(user_id, status);

CREATE TABLE IF NOT EXISTS summary_packs (
    pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    range VARCHAR(20) NOT NULL,
    schema_version VARCHAR(30) NOT NULL,
    calc_version VARCHAR(30) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    reconciliation_status VARCHAR(20) NOT NULL,
    missing_suspects_count INTEGER NOT NULL DEFAULT 0,
    duplicate_suspects_count INTEGER NOT NULL DEFAULT 0,
    normalization_warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT summary_packs_reconciliation_status_check CHECK (reconciliation_status IN ('ok', 'warning', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_summary_packs_user_created_at ON summary_packs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summary_packs_user_range_created_at ON summary_packs(user_id, range, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summary_packs_user_source_run ON summary_packs(user_id, source_run_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_admin_true
    ON users (is_admin)
    WHERE is_admin = true;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    action_target TEXT NOT NULL DEFAULT 'user',
    action_resource TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at_desc
    ON admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id
    ON admin_audit_logs (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id
    ON admin_audit_logs (target_user_id);

CREATE TABLE IF NOT EXISTS admin_policies (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_policies_updated_at_desc
    ON admin_policies (updated_at DESC);

INSERT INTO admin_policies (key, value, description)
VALUES
    ('admin_user_signup_enabled', 'true'::jsonb, 'Allow admin users to create or invite users from administrative workflows.'),
    ('maintenance_mode', 'false'::jsonb, 'When true, non-admin user access to public endpoints is blocked for emergency maintenance.'),
    ('notification_delivery_enabled', 'true'::jsonb, 'Global switch to enable notification-related background deliveries.')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description
WHERE admin_policies.description = '';

INSERT INTO admin_policies (key, value, description)
VALUES (
    'agent_service_poller_enabled',
    'true'::jsonb,
    'Master switch for background exchange poller agent service.'
) ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description
WHERE admin_policies.description = '';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider_email ON user_identities(provider, email);

ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS provider_type VARCHAR(50) DEFAULT 'openai-compatible';

ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS base_url VARCHAR(255) DEFAULT 'https://api.openai.com/v1';

ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS default_endpoint VARCHAR(100) DEFAULT 'chat/completions';

ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS timeout_seconds INT DEFAULT 0;

ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS retry_policy JSONB DEFAULT '{"max_retries": 3, "base_backoff_ms": 500, "max_backoff_ms": 10000}';

ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS responses_api_enabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled_default ON ai_providers(enabled, is_default);

INSERT INTO admin_policies (key, value, description)
VALUES
    ('ai_provider_toggle', 'false'::jsonb, 'Master switch to enable or disable AI provider operations.'),
    ('ai_run_telemetry', 'false'::jsonb, 'Enable telemetry capture for AI run execution events.'),
    ('ai_local_gateway', 'false'::jsonb, 'Enable local gateway routing for AI provider requests.')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS domain_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL,
    domain VARCHAR(50) NOT NULL DEFAULT 'kifu',
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    owner_id UUID NOT NULL REFERENCES users(id),
    context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_contexts_owner_scope ON domain_contexts(owner_id, scope);

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

CREATE TABLE IF NOT EXISTS trade_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    alert_id UUID REFERENCES alerts(id),
    symbol VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    reason VARCHAR(50),
    reason_text TEXT,
    stop_loss VARCHAR(50),
    entry_price VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    matched_trade_id UUID REFERENCES trades(id),
    plan_pnl_percent VARCHAR(20),
    chat_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trade_plans_user_id ON trade_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_plans_status ON trade_plans(status);
CREATE INDEX IF NOT EXISTS idx_trade_plans_chat_id ON trade_plans(chat_id);
CREATE INDEX IF NOT EXISTS idx_trade_plans_symbol_created ON trade_plans(symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS monthly_reports (
    report_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_user_date
    ON monthly_reports(user_id, year DESC, month DESC);

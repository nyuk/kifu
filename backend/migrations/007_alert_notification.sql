-- Alert Rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN ('price_change', 'ma_cross', 'price_level', 'volatility_spike')),
    config JSONB NOT NULL,
    cooldown_minutes INT NOT NULL DEFAULT 60,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    last_check_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_active ON alert_rules(user_id, enabled) WHERE enabled = true;

-- Alerts (triggered instances)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    trigger_price NUMERIC(18,8) NOT NULL,
    trigger_reason TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'briefed', 'decided', 'expired')),
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- AI Briefings for alerts
CREATE TABLE alert_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_briefings_alert ON alert_briefings(alert_id);

-- User decisions on alerts
CREATE TABLE alert_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('buy', 'sell', 'hold', 'close', 'reduce', 'add', 'ignore')),
    memo TEXT,
    confidence VARCHAR(10) CHECK (confidence IN ('high', 'medium', 'low')),
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id)
);

-- Decision outcome tracking
CREATE TABLE alert_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES alert_decisions(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL CHECK (period IN ('1h', '4h', '1d')),
    reference_price NUMERIC(18,8) NOT NULL,
    outcome_price NUMERIC(18,8) NOT NULL,
    pnl_percent NUMERIC(18,8) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, period)
);

-- Notification channels
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('telegram', 'web_push')),
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, channel_type)
);

-- Telegram verification codes
CREATE TABLE telegram_verify_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_verify_code ON telegram_verify_codes(code) WHERE used = false;

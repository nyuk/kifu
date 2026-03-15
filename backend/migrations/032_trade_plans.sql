-- Trade Plans: pre-trade intent recording via Telegram bot
CREATE TABLE IF NOT EXISTS trade_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    alert_id UUID REFERENCES alerts(id),
    symbol VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,       -- 'buy' | 'skip'
    reason VARCHAR(50),                -- 'indicator' | 'twitter' | 'fomo' | 'custom'
    reason_text TEXT,                   -- custom reason text
    stop_loss VARCHAR(50),             -- stop-loss price as string
    entry_price VARCHAR(50),           -- price at time of plan
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'complete' | 'expired'
    matched_trade_id UUID REFERENCES trades(id),
    plan_pnl_percent VARCHAR(20),      -- outcome vs plan
    chat_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ
);

CREATE INDEX idx_trade_plans_user_id ON trade_plans(user_id);
CREATE INDEX idx_trade_plans_status ON trade_plans(status);
CREATE INDEX idx_trade_plans_chat_id ON trade_plans(chat_id);
CREATE INDEX idx_trade_plans_symbol_created ON trade_plans(symbol, created_at DESC);

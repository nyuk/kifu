-- Manual positions: user-defined current positions for AI context
CREATE TABLE IF NOT EXISTS manual_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(40) NOT NULL,
    asset_class VARCHAR(10) NOT NULL CHECK (asset_class IN ('crypto', 'stock')),
    venue VARCHAR(30),
    position_side VARCHAR(10) NOT NULL CHECK (position_side IN ('long', 'short')),
    size NUMERIC(30, 10),
    entry_price NUMERIC(30, 10),
    stop_loss NUMERIC(30, 10),
    take_profit NUMERIC(30, 10),
    leverage NUMERIC(10, 2),
    strategy TEXT,
    memo TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_positions_user_status ON manual_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_manual_positions_user_symbol ON manual_positions(user_id, symbol);

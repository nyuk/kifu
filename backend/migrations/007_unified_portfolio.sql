-- Unified portfolio data model (CEX/DEX/Stocks)

-- Table: venues
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    venue_type VARCHAR(10) NOT NULL CHECK (venue_type IN ('cex', 'dex', 'broker')),
    display_name VARCHAR(60) NOT NULL,
    chain VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    label VARCHAR(60) NOT NULL,
    address VARCHAR(120),
    source VARCHAR(10) NOT NULL CHECK (source IN ('csv', 'api', 'wallet')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, venue_id, label)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_venue ON accounts(venue_id);

-- Table: instruments
CREATE TABLE instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_class VARCHAR(10) NOT NULL CHECK (asset_class IN ('crypto', 'stock')),
    base_asset VARCHAR(20) NOT NULL,
    quote_asset VARCHAR(20) NOT NULL,
    symbol VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(asset_class, symbol)
);

CREATE INDEX idx_instruments_asset_class ON instruments(asset_class);

-- Table: instrument_mappings
-- Map venue-specific symbols to a normalized instrument
CREATE TABLE instrument_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    venue_symbol VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(venue_id, venue_symbol)
);

CREATE INDEX idx_instrument_mappings_instrument ON instrument_mappings(instrument_id);
CREATE INDEX idx_instrument_mappings_venue ON instrument_mappings(venue_id);

-- Table: trade_events
CREATE TABLE trade_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
    asset_class VARCHAR(10) NOT NULL CHECK (asset_class IN ('crypto', 'stock')),
    venue_type VARCHAR(10) NOT NULL CHECK (venue_type IN ('cex', 'dex', 'broker')),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('spot_trade', 'perp_trade', 'dex_swap', 'lp_add', 'lp_remove', 'transfer', 'fee')),
    side VARCHAR(10) CHECK (side IN ('buy', 'sell')),
    qty NUMERIC(30, 10),
    price NUMERIC(30, 10),
    fee NUMERIC(30, 10),
    fee_asset VARCHAR(20),
    executed_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(10) NOT NULL CHECK (source IN ('csv', 'api', 'wallet')),
    external_id VARCHAR(120),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_events_user_time ON trade_events(user_id, executed_at DESC);
CREATE INDEX idx_trade_events_user_asset ON trade_events(user_id, asset_class);
CREATE INDEX idx_trade_events_user_venue ON trade_events(user_id, venue_id);
CREATE INDEX idx_trade_events_instrument ON trade_events(instrument_id);
CREATE INDEX idx_trade_events_external_id ON trade_events(venue_id, external_id);

-- Table: positions
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')),
    size NUMERIC(30, 10) NOT NULL DEFAULT 0,
    avg_entry NUMERIC(30, 10),
    avg_exit NUMERIC(30, 10),
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    realized_pnl_usdt NUMERIC(30, 10),
    realized_pnl_krw NUMERIC(30, 10),
    fees_usdt NUMERIC(30, 10),
    fees_krw NUMERIC(30, 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_positions_user_status ON positions(user_id, status);
CREATE INDEX idx_positions_instrument ON positions(instrument_id);

-- Table: position_events
CREATE TABLE position_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    trade_event_id UUID NOT NULL REFERENCES trade_events(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('open', 'add', 'reduce', 'close')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(position_id, trade_event_id)
);

-- Table: fx_rates
CREATE TABLE fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base VARCHAR(10) NOT NULL,
    quote VARCHAR(10) NOT NULL,
    rate NUMERIC(20, 8) NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(base, quote, captured_at)
);

CREATE INDEX idx_fx_rates_pair_time ON fx_rates(base, quote, captured_at DESC);

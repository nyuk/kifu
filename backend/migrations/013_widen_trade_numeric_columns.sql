-- Widen numeric precision for real-world spot trade imports (e.g. large-quantity KRW altcoin fills).
ALTER TABLE trades
    ALTER COLUMN quantity TYPE NUMERIC(30, 10) USING quantity::NUMERIC(30, 10),
    ALTER COLUMN price TYPE NUMERIC(30, 10) USING price::NUMERIC(30, 10),
    ALTER COLUMN realized_pnl TYPE NUMERIC(30, 10) USING realized_pnl::NUMERIC(30, 10);

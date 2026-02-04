-- Remove strict precision caps to avoid overflow on extreme exchange fills.
ALTER TABLE trades
    ALTER COLUMN quantity TYPE NUMERIC USING quantity::NUMERIC,
    ALTER COLUMN price TYPE NUMERIC USING price::NUMERIC,
    ALTER COLUMN realized_pnl TYPE NUMERIC USING realized_pnl::NUMERIC;

ALTER TABLE bubbles
    ALTER COLUMN price TYPE NUMERIC USING price::NUMERIC;

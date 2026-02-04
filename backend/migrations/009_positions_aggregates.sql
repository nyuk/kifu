-- Add aggregate columns to positions for faster summaries

ALTER TABLE positions
  ADD COLUMN buy_qty NUMERIC(30, 10),
  ADD COLUMN sell_qty NUMERIC(30, 10),
  ADD COLUMN buy_notional NUMERIC(30, 10),
  ADD COLUMN sell_notional NUMERIC(30, 10),
  ADD COLUMN last_executed_at TIMESTAMPTZ;

CREATE INDEX idx_positions_user_last_executed
  ON positions(user_id, last_executed_at DESC);

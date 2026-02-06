ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS position_side VARCHAR(10),
  ADD COLUMN IF NOT EXISTS open_close VARCHAR(10),
  ADD COLUMN IF NOT EXISTS reduce_only BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_trades_position_side ON trades(position_side);
CREATE INDEX IF NOT EXISTS idx_trades_open_close ON trades(open_close);

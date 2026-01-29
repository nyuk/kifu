ALTER TABLE trade_sync_state
  ADD COLUMN exchange VARCHAR(30) NOT NULL DEFAULT 'binance_futures';

ALTER TABLE trade_sync_state
  DROP CONSTRAINT IF EXISTS trade_sync_state_user_id_symbol_key;

CREATE UNIQUE INDEX idx_trade_sync_state_unique
  ON trade_sync_state(user_id, exchange, symbol);

UPDATE trade_sync_state
SET exchange = 'binance_futures'
WHERE exchange IS NULL OR exchange = '';

ALTER TABLE trades
  ADD COLUMN exchange VARCHAR(30) NOT NULL DEFAULT 'binance_futures';

CREATE INDEX idx_trades_exchange ON trades(exchange);

ALTER TABLE trades
  DROP CONSTRAINT IF EXISTS trades_user_id_symbol_binance_trade_id_key;

CREATE UNIQUE INDEX idx_trades_unique_exchange
  ON trades(user_id, exchange, symbol, binance_trade_id);

UPDATE trades
SET exchange = 'binance_futures'
WHERE exchange IS NULL OR exchange = '';

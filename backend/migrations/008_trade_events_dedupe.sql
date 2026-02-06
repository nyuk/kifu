-- Add dedupe key for trade_events to prevent duplicate imports

ALTER TABLE trade_events
  ADD COLUMN dedupe_key VARCHAR(64);

CREATE UNIQUE INDEX idx_trade_events_dedupe
  ON trade_events(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

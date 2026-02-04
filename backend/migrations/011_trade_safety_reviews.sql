-- Trade safety review labels for daily quick-check flow
CREATE TABLE trade_safety_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
    trade_event_id UUID REFERENCES trade_events(id) ON DELETE CASCADE,
    verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('intended', 'mistake', 'unsure')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
      (trade_id IS NOT NULL AND trade_event_id IS NULL)
      OR
      (trade_id IS NULL AND trade_event_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX ux_trade_safety_reviews_trade
  ON trade_safety_reviews(user_id, trade_id)
  WHERE trade_id IS NOT NULL;

CREATE UNIQUE INDEX ux_trade_safety_reviews_trade_event
  ON trade_safety_reviews(user_id, trade_event_id)
  WHERE trade_event_id IS NOT NULL;

CREATE INDEX idx_trade_safety_reviews_user_updated
  ON trade_safety_reviews(user_id, updated_at DESC);

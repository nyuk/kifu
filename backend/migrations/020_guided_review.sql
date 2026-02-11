CREATE TABLE guided_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, review_date)
);

CREATE TABLE guided_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES guided_reviews(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  bundle_key VARCHAR(100),
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10),
  pnl NUMERIC,
  trade_count INT NOT NULL DEFAULT 1,
  intent VARCHAR(50),
  emotions JSONB,
  pattern_match VARCHAR(50),
  memo TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_review_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guided_reviews_user_date ON guided_reviews(user_id, review_date DESC);
CREATE INDEX idx_guided_review_items_review ON guided_review_items(review_id);

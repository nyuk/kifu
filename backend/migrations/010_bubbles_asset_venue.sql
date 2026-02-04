ALTER TABLE bubbles
  ADD COLUMN IF NOT EXISTS asset_class VARCHAR(20),
  ADD COLUMN IF NOT EXISTS venue_name VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_bubbles_asset_class ON bubbles(asset_class);
CREATE INDEX IF NOT EXISTS idx_bubbles_venue_name ON bubbles(venue_name);

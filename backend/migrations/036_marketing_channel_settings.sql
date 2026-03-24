CREATE TABLE IF NOT EXISTS marketing_channel_settings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_key TEXT NOT NULL,
    channel TEXT NOT NULL,
    publication_name TEXT NOT NULL DEFAULT '',
    publication_url TEXT,
    default_category TEXT NOT NULL DEFAULT '',
    primary_audience TEXT NOT NULL DEFAULT '',
    tone_guide TEXT NOT NULL DEFAULT '',
    default_cta TEXT NOT NULL DEFAULT '',
    proof_points TEXT NOT NULL DEFAULT '',
    reference_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_channel_settings_user_product_channel
    ON marketing_channel_settings(user_id, product_key, channel);

CREATE INDEX IF NOT EXISTS idx_marketing_channel_settings_user_product_updated
    ON marketing_channel_settings(user_id, product_key, updated_at DESC);

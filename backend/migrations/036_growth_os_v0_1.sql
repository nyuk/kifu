CREATE TABLE IF NOT EXISTS growth_funnel_events (
    id                UUID PRIMARY KEY,
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_session_id  TEXT,
    event_name        TEXT NOT NULL,
    source_path       TEXT,
    referrer          TEXT,
    metadata          JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_funnel_events_occurred
    ON growth_funnel_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_funnel_events_name_occurred
    ON growth_funnel_events(event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_funnel_events_user_occurred
    ON growth_funnel_events(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS growth_feedback_items (
    id             UUID PRIMARY KEY,
    product_key    TEXT NOT NULL DEFAULT 'kifu',
    source_type    TEXT NOT NULL,
    bucket         TEXT NOT NULL,
    title          TEXT NOT NULL,
    body           TEXT NOT NULL,
    source_url     TEXT,
    metadata       JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_feedback_items_bucket_updated
    ON growth_feedback_items(product_key, bucket, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_feedback_items_source_created
    ON growth_feedback_items(source_type, created_at DESC);

CREATE TABLE IF NOT EXISTS growth_daily_reports (
    id                   UUID PRIMARY KEY,
    report_date          DATE NOT NULL UNIQUE,
    status               TEXT NOT NULL DEFAULT 'ready',
    payload              JSONB NOT NULL DEFAULT '{}'::JSONB,
    content_drafts_count INTEGER NOT NULL DEFAULT 0,
    issues_count         INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_daily_reports_date
    ON growth_daily_reports(report_date DESC);

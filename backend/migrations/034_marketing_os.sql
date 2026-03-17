CREATE TABLE IF NOT EXISTS marketing_ideas (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_key     TEXT NOT NULL,
    title           TEXT NOT NULL,
    raw_note        TEXT NOT NULL,
    angle_type      TEXT NOT NULL,
    message_pillar  TEXT NOT NULL,
    channels        TEXT[] NOT NULL DEFAULT '{}',
    source_link     TEXT,
    status          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_ideas_user_product_updated
    ON marketing_ideas(user_id, product_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS marketing_drafts (
    id            UUID PRIMARY KEY,
    idea_id       UUID NOT NULL REFERENCES marketing_ideas(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_key   TEXT NOT NULL,
    channel       TEXT NOT NULL,
    tone          TEXT NOT NULL,
    version       INTEGER NOT NULL DEFAULT 1,
    title         TEXT NOT NULL,
    content       TEXT NOT NULL,
    risk_flags    TEXT[] NOT NULL DEFAULT '{}',
    status        TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_user_product_updated
    ON marketing_drafts(user_id, product_key, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_drafts_idea_channel_version
    ON marketing_drafts(idea_id, channel, version);

CREATE TABLE IF NOT EXISTS marketing_publications (
    id                UUID PRIMARY KEY,
    draft_id          UUID NOT NULL REFERENCES marketing_drafts(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_key       TEXT NOT NULL,
    channel           TEXT NOT NULL,
    publish_status    TEXT NOT NULL,
    external_url      TEXT,
    metrics_snapshot  JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_publications_user_product_created
    ON marketing_publications(user_id, product_key, created_at DESC);

CREATE TABLE IF NOT EXISTS domain_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL,
    domain VARCHAR(50) NOT NULL DEFAULT 'kifu',
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    owner_id UUID NOT NULL REFERENCES users(id),
    context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_contexts_owner_scope ON domain_contexts (owner_id, scope);

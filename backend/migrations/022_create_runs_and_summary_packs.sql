-- Lightweight run tracking for sync/import workflows
CREATE TABLE IF NOT EXISTS runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_type VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_user_started_at ON runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_user_status ON runs(user_id, status);

CREATE TABLE IF NOT EXISTS summary_packs (
    pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    range VARCHAR(20) NOT NULL,
    schema_version VARCHAR(30) NOT NULL,
    calc_version VARCHAR(30) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    reconciliation_status VARCHAR(20) NOT NULL,
    missing_suspects_count INTEGER NOT NULL DEFAULT 0,
    duplicate_suspects_count INTEGER NOT NULL DEFAULT 0,
    normalization_warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT summary_packs_reconciliation_status_check CHECK (reconciliation_status IN ('ok', 'warning', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_summary_packs_user_created_at ON summary_packs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summary_packs_user_range_created_at ON summary_packs(user_id, range, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summary_packs_user_source_run ON summary_packs(user_id, source_run_id);

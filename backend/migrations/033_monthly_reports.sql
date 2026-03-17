-- Monthly auto-generated reports: trading summary + decision quality + AI accuracy + month-over-month comparison
CREATE TABLE IF NOT EXISTS monthly_reports (
    report_id   UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id),
    year        INTEGER NOT NULL,
    month       INTEGER NOT NULL,  -- 1-12
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, year, month)
);

CREATE INDEX idx_monthly_reports_user_date ON monthly_reports(user_id, year DESC, month DESC);

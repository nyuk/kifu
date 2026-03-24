ALTER TABLE marketing_ideas
    ADD COLUMN IF NOT EXISTS content_intent TEXT,
    ADD COLUMN IF NOT EXISTS evidence_source TEXT,
    ADD COLUMN IF NOT EXISTS format_style TEXT;

UPDATE marketing_ideas
SET content_intent = COALESCE(NULLIF(content_intent, ''), 'soft_promo'),
    evidence_source = COALESCE(NULLIF(evidence_source, ''), 'personal_note'),
    format_style = COALESCE(NULLIF(format_style, ''), 'reflection');

ALTER TABLE marketing_ideas
    ALTER COLUMN content_intent SET DEFAULT 'soft_promo',
    ALTER COLUMN evidence_source SET DEFAULT 'personal_note',
    ALTER COLUMN format_style SET DEFAULT 'reflection';

ALTER TABLE marketing_ideas
    ALTER COLUMN content_intent SET NOT NULL,
    ALTER COLUMN evidence_source SET NOT NULL,
    ALTER COLUMN format_style SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_ideas_user_product_intent_updated
    ON marketing_ideas(user_id, product_key, content_intent, updated_at DESC);

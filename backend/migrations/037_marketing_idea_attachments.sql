ALTER TABLE marketing_ideas
    ADD COLUMN IF NOT EXISTS attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb;

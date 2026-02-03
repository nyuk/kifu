-- Review Notes table for trading journal notes
CREATE TABLE IF NOT EXISTS review_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    lesson_learned TEXT,
    emotion VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_notes_user_id ON review_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_notes_bubble_id ON review_notes(bubble_id);
CREATE INDEX IF NOT EXISTS idx_review_notes_created_at ON review_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_notes_tags ON review_notes USING GIN(tags);

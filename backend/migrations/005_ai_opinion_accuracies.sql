-- AI Opinion Accuracies table for tracking AI prediction accuracy
CREATE TABLE IF NOT EXISTS ai_opinion_accuracies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opinion_id UUID NOT NULL REFERENCES ai_opinions(id) ON DELETE CASCADE,
    outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE,
    bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    period VARCHAR(10) NOT NULL,
    predicted_direction VARCHAR(10) NOT NULL,
    actual_direction VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(opinion_id, outcome_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_opinion_accuracies_bubble_id ON ai_opinion_accuracies(bubble_id);
CREATE INDEX IF NOT EXISTS idx_ai_opinion_accuracies_provider ON ai_opinion_accuracies(provider);
CREATE INDEX IF NOT EXISTS idx_ai_opinion_accuracies_period ON ai_opinion_accuracies(period);
CREATE INDEX IF NOT EXISTS idx_ai_opinion_accuracies_is_correct ON ai_opinion_accuracies(is_correct);
CREATE INDEX IF NOT EXISTS idx_ai_opinion_accuracies_created_at ON ai_opinion_accuracies(created_at);

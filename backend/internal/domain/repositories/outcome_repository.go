package repositories

import (
    "context"
    "time"

    "github.com/google/uuid"
    "github.com/moneyvessel/kifu/internal/domain/entities"
)

type OutcomeRepository interface {
    CreateIfNotExists(ctx context.Context, outcome *entities.Outcome) (bool, error)
    ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Outcome, error)
    ListPending(ctx context.Context, period string, cutoff time.Time, limit int) ([]*PendingOutcomeBubble, error)
}

type PendingOutcomeBubble struct {
    BubbleID   uuid.UUID
    Symbol     string
    CandleTime time.Time
    Price      string
}

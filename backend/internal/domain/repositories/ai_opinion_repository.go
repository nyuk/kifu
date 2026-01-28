package repositories

import (
    "context"

    "github.com/google/uuid"
    "github.com/moneyvessel/kifu/internal/domain/entities"
)

type AIOpinionRepository interface {
    Create(ctx context.Context, opinion *entities.AIOpinion) error
    ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinion, error)
}

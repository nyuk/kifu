package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ReviewNoteRepository interface {
	Create(ctx context.Context, note *entities.ReviewNote) error
	Update(ctx context.Context, note *entities.ReviewNote) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ReviewNote, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.ReviewNote, int, error)
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.ReviewNote, error)
	PruneAIGeneratedByUser(ctx context.Context, userID uuid.UUID, keep int) error
}

package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type BubbleRepository interface {
	Create(ctx context.Context, bubble *entities.Bubble) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Bubble, error)
	ListByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]*entities.Bubble, error)
	Update(ctx context.Context, bubble *entities.Bubble) error
	Delete(ctx context.Context, id uuid.UUID) error
}

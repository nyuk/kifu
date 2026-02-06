package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ManualPositionFilter struct {
	Status string
}

type ManualPositionRepository interface {
	List(ctx context.Context, userID uuid.UUID, filter ManualPositionFilter) ([]*entities.ManualPosition, error)
	Create(ctx context.Context, position *entities.ManualPosition) error
	Update(ctx context.Context, position *entities.ManualPosition) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ManualPosition, error)
}

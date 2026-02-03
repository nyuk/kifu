package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserAIKeyRepository interface {
	Upsert(ctx context.Context, key *entities.UserAIKey) error
	GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (*entities.UserAIKey, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserAIKey, error)
	DeleteByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (bool, error)
}

package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type SubscriptionRepository interface {
	Create(ctx context.Context, sub *entities.Subscription) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*entities.Subscription, error)
	ListAll(ctx context.Context) ([]*entities.Subscription, error)
	DecrementQuota(ctx context.Context, userID uuid.UUID, amount int) (bool, error)
	Update(ctx context.Context, sub *entities.Subscription) error
	Delete(ctx context.Context, id uuid.UUID) error
}

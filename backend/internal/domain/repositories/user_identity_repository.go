package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserIdentityRepository interface {
	Create(ctx context.Context, identity *entities.UserIdentity) error
	GetByProviderUserID(ctx context.Context, provider string, providerUserID string) (*entities.UserIdentity, error)
	GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (*entities.UserIdentity, error)
}

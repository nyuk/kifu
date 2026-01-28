package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ExchangeCredentialRepository interface {
	Create(ctx context.Context, cred *entities.ExchangeCredential) error
	GetByUserAndExchange(ctx context.Context, userID uuid.UUID, exchange string) (*entities.ExchangeCredential, error)
	Update(ctx context.Context, cred *entities.ExchangeCredential) error
	Delete(ctx context.Context, id uuid.UUID) error
}

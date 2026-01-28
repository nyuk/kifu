package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ExchangeCredentialRepository interface {
	Create(ctx context.Context, cred *entities.ExchangeCredential) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.ExchangeCredential, error)
	GetByUserAndExchange(ctx context.Context, userID uuid.UUID, exchange string) (*entities.ExchangeCredential, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.ExchangeCredential, error)
	ListValid(ctx context.Context, exchange string) ([]*entities.ExchangeCredential, error)
	Update(ctx context.Context, cred *entities.ExchangeCredential) error
	DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error)
}

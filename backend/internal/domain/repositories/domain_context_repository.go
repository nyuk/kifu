package repositories

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type DomainContextRepository interface {
	Create(ctx context.Context, dc *entities.DomainContext) (*entities.DomainContext, error)
	GetByID(ctx context.Context, id uuid.UUID) (*entities.DomainContext, error)
	ListByScope(ctx context.Context, ownerID uuid.UUID, scope string) ([]*entities.DomainContext, error)
	Update(ctx context.Context, id uuid.UUID, ownerID uuid.UUID, contextData json.RawMessage) error
	Delete(ctx context.Context, id uuid.UUID, ownerID uuid.UUID) error
}

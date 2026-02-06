package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AlertRuleRepository interface {
	Create(ctx context.Context, rule *entities.AlertRule) error
	Update(ctx context.Context, rule *entities.AlertRule) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.AlertRule, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.AlertRule, error)
	ListActiveBySymbol(ctx context.Context, symbol string) ([]*entities.AlertRule, error)
	ListAllActive(ctx context.Context) ([]*entities.AlertRule, error)
	SetEnabled(ctx context.Context, id, userID uuid.UUID, enabled bool) error
	UpdateLastTriggered(ctx context.Context, id uuid.UUID, checkState []byte) error
	UpdateCheckState(ctx context.Context, id uuid.UUID, checkState []byte) error
}

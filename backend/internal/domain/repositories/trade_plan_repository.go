package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TradePlanRepository interface {
	Create(ctx context.Context, plan *entities.TradePlan) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.TradePlan, error)
	Update(ctx context.Context, plan *entities.TradePlan) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.TradePlan, error)
	ListBySymbol(ctx context.Context, userID uuid.UUID, symbol string, limit int) ([]*entities.TradePlan, error)
	ListPending(ctx context.Context) ([]*entities.TradePlan, error)
	GetLatestByChatID(ctx context.Context, chatID int64, status entities.PlanStatus) (*entities.TradePlan, error)
}

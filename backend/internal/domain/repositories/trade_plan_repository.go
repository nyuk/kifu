package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

// PlanMatchResult holds a matched plan + trade pair from a batch JOIN query.
type PlanMatchResult struct {
	Plan       *entities.TradePlan
	TradeID    uuid.UUID
	TradePrice string
}

type TradePlanRepository interface {
	Create(ctx context.Context, plan *entities.TradePlan) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.TradePlan, error)
	Update(ctx context.Context, plan *entities.TradePlan) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.TradePlan, error)
	ListBySymbol(ctx context.Context, userID uuid.UUID, symbol string, limit int) ([]*entities.TradePlan, error)
	ListPending(ctx context.Context) ([]*entities.TradePlan, error)
	ListUnmatched(ctx context.Context, limit int) ([]*entities.TradePlan, error)
	MatchWithTrades(ctx context.Context, limit int) ([]*PlanMatchResult, error)
	ExpireOld(ctx context.Context, olderThan time.Duration) (int64, error)
	GetLatestByChatID(ctx context.Context, chatID int64, status entities.PlanStatus) (*entities.TradePlan, error)
}

package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TradeRepository interface {
	Create(ctx context.Context, trade *entities.Trade) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Trade, error)
	ListByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]*entities.Trade, error)
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Trade, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

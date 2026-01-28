package repositories

import (
    "context"

    "github.com/google/uuid"
    "github.com/moneyvessel/kifu/internal/domain/entities"
)

type TradeSyncStateRepository interface {
    GetByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) (*entities.TradeSyncState, error)
    Upsert(ctx context.Context, state *entities.TradeSyncState) error
}

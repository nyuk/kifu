package repositories

import (
    "context"

    "github.com/google/uuid"
    "github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserSymbolRepository interface {
    Create(ctx context.Context, symbol *entities.UserSymbol) error
    ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserSymbol, error)
    ReplaceByUser(ctx context.Context, userID uuid.UUID, symbols []*entities.UserSymbol) error
}

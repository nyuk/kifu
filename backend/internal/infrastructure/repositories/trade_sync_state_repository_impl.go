package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradeSyncStateRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradeSyncStateRepository(pool *pgxpool.Pool) repositories.TradeSyncStateRepository {
	return &TradeSyncStateRepositoryImpl{pool: pool}
}

func (r *TradeSyncStateRepositoryImpl) GetByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) (*entities.TradeSyncState, error) {
	query := `
		SELECT id, user_id, symbol, last_trade_id, last_sync_at
		FROM trade_sync_state
		WHERE user_id = $1 AND symbol = $2
	`
	var state entities.TradeSyncState
	err := r.pool.QueryRow(ctx, query, userID, symbol).Scan(
		&state.ID, &state.UserID, &state.Symbol, &state.LastTradeID, &state.LastSyncAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &state, nil
}

func (r *TradeSyncStateRepositoryImpl) Upsert(ctx context.Context, state *entities.TradeSyncState) error {
	query := `
		INSERT INTO trade_sync_state (id, user_id, symbol, last_trade_id, last_sync_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, symbol)
		DO UPDATE SET last_trade_id = EXCLUDED.last_trade_id, last_sync_at = EXCLUDED.last_sync_at
	`
	_, err := r.pool.Exec(ctx, query,
		state.ID, state.UserID, state.Symbol, state.LastTradeID, state.LastSyncAt)
	return err
}

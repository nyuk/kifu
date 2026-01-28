package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserSymbolRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserSymbolRepository(pool *pgxpool.Pool) repositories.UserSymbolRepository {
	return &UserSymbolRepositoryImpl{pool: pool}
}

func (r *UserSymbolRepositoryImpl) Create(ctx context.Context, symbol *entities.UserSymbol) error {
	query := `
		INSERT INTO user_symbols (id, user_id, symbol, timeframe_default, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.pool.Exec(ctx, query,
		symbol.ID, symbol.UserID, symbol.Symbol, symbol.TimeframeDefault, symbol.CreatedAt)
	return err
}

func (r *UserSymbolRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserSymbol, error) {
	query := `
		SELECT id, user_id, symbol, timeframe_default, created_at
		FROM user_symbols
		WHERE user_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var symbols []*entities.UserSymbol
	for rows.Next() {
		var symbol entities.UserSymbol
		err := rows.Scan(
			&symbol.ID, &symbol.UserID, &symbol.Symbol, &symbol.TimeframeDefault, &symbol.CreatedAt)
		if err != nil {
			return nil, err
		}
		symbols = append(symbols, &symbol)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return symbols, nil
}

func (r *UserSymbolRepositoryImpl) ReplaceByUser(ctx context.Context, userID uuid.UUID, symbols []*entities.UserSymbol) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	deleteQuery := `DELETE FROM user_symbols WHERE user_id = $1`
	if _, err = tx.Exec(ctx, deleteQuery, userID); err != nil {
		return err
	}

	insertQuery := `
		INSERT INTO user_symbols (id, user_id, symbol, timeframe_default, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	for _, symbol := range symbols {
		_, err = tx.Exec(ctx, insertQuery,
			symbol.ID, symbol.UserID, symbol.Symbol, symbol.TimeframeDefault, symbol.CreatedAt)
		if err != nil {
			return err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

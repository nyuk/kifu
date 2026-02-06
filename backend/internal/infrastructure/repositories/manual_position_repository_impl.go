package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ManualPositionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewManualPositionRepository(pool *pgxpool.Pool) repositories.ManualPositionRepository {
	return &ManualPositionRepositoryImpl{pool: pool}
}

func (r *ManualPositionRepositoryImpl) List(ctx context.Context, userID uuid.UUID, filter repositories.ManualPositionFilter) ([]*entities.ManualPosition, error) {
	query := `
		SELECT id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
			stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at,
			created_at, updated_at
		FROM manual_positions
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	if filter.Status != "" && filter.Status != "all" {
		query += " AND status = $2"
		args = append(args, filter.Status)
	}
	query += " ORDER BY updated_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	positions := make([]*entities.ManualPosition, 0)
	for rows.Next() {
		var item entities.ManualPosition
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Symbol,
			&item.AssetClass,
			&item.Venue,
			&item.PositionSide,
			&item.Size,
			&item.EntryPrice,
			&item.StopLoss,
			&item.TakeProfit,
			&item.Leverage,
			&item.Strategy,
			&item.Memo,
			&item.Status,
			&item.OpenedAt,
			&item.ClosedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		positions = append(positions, &item)
	}
	return positions, rows.Err()
}

func (r *ManualPositionRepositoryImpl) GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ManualPosition, error) {
	query := `
		SELECT id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
			stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at,
			created_at, updated_at
		FROM manual_positions
		WHERE id = $1 AND user_id = $2
	`
	var item entities.ManualPosition
	if err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&item.ID,
		&item.UserID,
		&item.Symbol,
		&item.AssetClass,
		&item.Venue,
		&item.PositionSide,
		&item.Size,
		&item.EntryPrice,
		&item.StopLoss,
		&item.TakeProfit,
		&item.Leverage,
		&item.Strategy,
		&item.Memo,
		&item.Status,
		&item.OpenedAt,
		&item.ClosedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *ManualPositionRepositoryImpl) Create(ctx context.Context, position *entities.ManualPosition) error {
	position.ID = uuid.New()
	position.CreatedAt = time.Now().UTC()
	position.UpdatedAt = position.CreatedAt

	query := `
		INSERT INTO manual_positions (
			id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
			stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
		)
	`
	_, err := r.pool.Exec(ctx, query,
		position.ID,
		position.UserID,
		position.Symbol,
		position.AssetClass,
		position.Venue,
		position.PositionSide,
		position.Size,
		position.EntryPrice,
		position.StopLoss,
		position.TakeProfit,
		position.Leverage,
		position.Strategy,
		position.Memo,
		position.Status,
		position.OpenedAt,
		position.ClosedAt,
		position.CreatedAt,
		position.UpdatedAt,
	)
	return err
}

func (r *ManualPositionRepositoryImpl) Update(ctx context.Context, position *entities.ManualPosition) error {
	position.UpdatedAt = time.Now().UTC()
	query := `
		UPDATE manual_positions
		SET symbol=$1, asset_class=$2, venue=$3, position_side=$4, size=$5, entry_price=$6,
			stop_loss=$7, take_profit=$8, leverage=$9, strategy=$10, memo=$11, status=$12,
			opened_at=$13, closed_at=$14, updated_at=$15
		WHERE id=$16 AND user_id=$17
	`
	_, err := r.pool.Exec(ctx, query,
		position.Symbol,
		position.AssetClass,
		position.Venue,
		position.PositionSide,
		position.Size,
		position.EntryPrice,
		position.StopLoss,
		position.TakeProfit,
		position.Leverage,
		position.Strategy,
		position.Memo,
		position.Status,
		position.OpenedAt,
		position.ClosedAt,
		position.UpdatedAt,
		position.ID,
		position.UserID,
	)
	return err
}

func (r *ManualPositionRepositoryImpl) Delete(ctx context.Context, id, userID uuid.UUID) error {
	query := `DELETE FROM manual_positions WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, id, userID)
	return err
}

package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type OutcomeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewOutcomeRepository(pool *pgxpool.Pool) repositories.OutcomeRepository {
	return &OutcomeRepositoryImpl{pool: pool}
}

func (r *OutcomeRepositoryImpl) CreateIfNotExists(ctx context.Context, outcome *entities.Outcome) (bool, error) {
	query := `
        INSERT INTO outcomes (id, bubble_id, period, reference_price, outcome_price, pnl_percent, calculated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bubble_id, period) DO NOTHING
    `
	result, err := r.pool.Exec(ctx, query,
		outcome.ID, outcome.BubbleID, outcome.Period, outcome.ReferencePrice, outcome.OutcomePrice, outcome.PnLPercent, outcome.CalculatedAt)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (r *OutcomeRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Outcome, error) {
	query := `
        SELECT id, bubble_id, period, reference_price, outcome_price, pnl_percent, calculated_at
        FROM outcomes
        WHERE bubble_id = $1
        ORDER BY calculated_at DESC
    `
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.Outcome
	for rows.Next() {
		var outcome entities.Outcome
		if err := rows.Scan(
			&outcome.ID, &outcome.BubbleID, &outcome.Period, &outcome.ReferencePrice, &outcome.OutcomePrice, &outcome.PnLPercent, &outcome.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &outcome)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return outcomes, nil
}

func (r *OutcomeRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.Outcome, error) {
	query := `
        SELECT o.id, o.bubble_id, o.period, o.reference_price, o.outcome_price, o.pnl_percent, o.calculated_at
        FROM outcomes o
        JOIN bubbles b ON b.id = o.bubble_id
        WHERE b.user_id = $1
        ORDER BY o.calculated_at DESC
        LIMIT 1000
    `
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.Outcome
	for rows.Next() {
		var outcome entities.Outcome
		if err := rows.Scan(
			&outcome.ID, &outcome.BubbleID, &outcome.Period, &outcome.ReferencePrice, &outcome.OutcomePrice, &outcome.PnLPercent, &outcome.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &outcome)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return outcomes, nil
}

func (r *OutcomeRepositoryImpl) ListPending(ctx context.Context, period string, cutoff time.Time, limit int) ([]*repositories.PendingOutcomeBubble, error) {
	query := `
        SELECT b.id, b.symbol, b.candle_time, b.price
        FROM bubbles b
        WHERE b.candle_time <= $1
          AND NOT EXISTS (
            SELECT 1 FROM outcomes o
            WHERE o.bubble_id = b.id AND o.period = $2
          )
        ORDER BY b.candle_time ASC
        LIMIT $3
    `
	rows, err := r.pool.Query(ctx, query, cutoff, period, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []*repositories.PendingOutcomeBubble
	for rows.Next() {
		var item repositories.PendingOutcomeBubble
		if err := rows.Scan(&item.BubbleID, &item.Symbol, &item.CandleTime, &item.Price); err != nil {
			return nil, err
		}
		pending = append(pending, &item)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return pending, nil
}

func (r *OutcomeRepositoryImpl) ListRecentWithoutAccuracy(ctx context.Context, since time.Time, limit int) ([]*entities.Outcome, error) {
	query := `
		SELECT o.id, o.bubble_id, o.period, o.reference_price, o.outcome_price, o.pnl_percent, o.calculated_at
		FROM outcomes o
		WHERE o.calculated_at >= $1
		  AND NOT EXISTS (
			SELECT 1 FROM ai_opinion_accuracies a
			WHERE a.outcome_id = o.id
		  )
		  AND EXISTS (
			SELECT 1 FROM ai_opinions ao
			WHERE ao.bubble_id = o.bubble_id
		  )
		ORDER BY o.calculated_at ASC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.Outcome
	for rows.Next() {
		var outcome entities.Outcome
		if err := rows.Scan(
			&outcome.ID, &outcome.BubbleID, &outcome.Period, &outcome.ReferencePrice,
			&outcome.OutcomePrice, &outcome.PnLPercent, &outcome.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &outcome)
	}

	return outcomes, rows.Err()
}

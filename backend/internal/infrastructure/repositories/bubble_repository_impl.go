package repositories

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type BubbleRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewBubbleRepository(pool *pgxpool.Pool) repositories.BubbleRepository {
	return &BubbleRepositoryImpl{pool: pool}
}

func (r *BubbleRepositoryImpl) Create(ctx context.Context, bubble *entities.Bubble) error {
	query := `
		INSERT INTO bubbles (id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(ctx, query,
		bubble.ID, bubble.UserID, bubble.Symbol, bubble.Timeframe, bubble.CandleTime, bubble.Price, bubble.BubbleType, bubble.Memo, bubble.Tags, bubble.CreatedAt)
	return err
}

func (r *BubbleRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Bubble, error) {
	query := `
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at
		FROM bubbles
		WHERE id = $1
	`
	var bubble entities.Bubble
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &bubble, nil
}

func (r *BubbleRepositoryImpl) List(ctx context.Context, userID uuid.UUID, filter repositories.BubbleFilter) ([]*entities.Bubble, int, error) {
	conditions := []string{"user_id = $1"}
	args := []interface{}{userID}

	argIndex := 2
	if filter.Symbol != "" {
		conditions = append(conditions, fmt.Sprintf("symbol = $%d", argIndex))
		args = append(args, filter.Symbol)
		argIndex++
	}
	if len(filter.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argIndex))
		args = append(args, filter.Tags)
		argIndex++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("candle_time >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("candle_time <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	sortClause := "ORDER BY candle_time DESC"
	if filter.Sort == "asc" {
		sortClause = "ORDER BY candle_time ASC"
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM bubbles %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := fmt.Sprintf(`
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at
		FROM bubbles
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortClause, argIndex, argIndex+1)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var bubbles []*entities.Bubble
	for rows.Next() {
		var bubble entities.Bubble
		err := rows.Scan(
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
		if err != nil {
			return nil, 0, err
		}
		bubbles = append(bubbles, &bubble)
	}

	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}

	return bubbles, total, nil
}

func (r *BubbleRepositoryImpl) Update(ctx context.Context, bubble *entities.Bubble) error {
	query := `
		UPDATE bubbles
		SET memo = $2, tags = $3
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, bubble.ID, bubble.Memo, bubble.Tags)
	return err
}

func (r *BubbleRepositoryImpl) DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error) {
	query := `DELETE FROM bubbles WHERE id = $1 AND user_id = $2`
	commandTag, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return false, err
	}
	return commandTag.RowsAffected() > 0, nil
}

func (r *BubbleRepositoryImpl) ListSimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string, limit int, offset int) ([]*repositories.BubbleWithOutcome, int, error) {
	conditions := []string{"b.user_id = $1", "b.symbol = $2", "b.tags && $3"}
	args := []interface{}{userID, symbol, tags}
	argIndex := 4
	if excludeID != nil {
		conditions = append(conditions, fmt.Sprintf("b.id <> $%d", argIndex))
		args = append(args, *excludeID)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM bubbles b %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := fmt.Sprintf(`
		SELECT b.id, b.user_id, b.symbol, b.timeframe, b.candle_time, b.price, b.bubble_type, b.memo, b.tags, b.created_at,
		       o.period, o.reference_price, o.outcome_price, o.pnl_percent, o.calculated_at
		FROM bubbles b
		LEFT JOIN outcomes o ON o.bubble_id = b.id AND o.period = $%d
		%s
		ORDER BY b.candle_time DESC
		LIMIT $%d OFFSET $%d
	`, argIndex, whereClause, argIndex+1, argIndex+2)
	args = append(args, period, limit, offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []*repositories.BubbleWithOutcome
	for rows.Next() {
		var bubble entities.Bubble
		var outcomePeriod *string
		var referencePrice *string
		var outcomePrice *string
		var pnlPercent *string
		var calculatedAt *time.Time
		err := rows.Scan(
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt,
			&outcomePeriod, &referencePrice, &outcomePrice, &pnlPercent, &calculatedAt)
		if err != nil {
			return nil, 0, err
		}

		var outcome *entities.Outcome
		if outcomePeriod != nil {
			outcome = &entities.Outcome{
				ID:             uuid.Nil,
				BubbleID:       bubble.ID,
				Period:         *outcomePeriod,
				ReferencePrice: safeString(referencePrice),
				OutcomePrice:   safeString(outcomePrice),
				PnLPercent:     safeString(pnlPercent),
				CalculatedAt:   safeTime(calculatedAt),
			}
		}

		results = append(results, &repositories.BubbleWithOutcome{
			Bubble:  &bubble,
			Outcome: outcome,
		})
	}

	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}

	return results, total, nil
}

func (r *BubbleRepositoryImpl) SummarySimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string) (*repositories.SimilarSummary, error) {
	conditions := []string{"b.user_id = $1", "b.symbol = $2", "b.tags && $3", "o.period = $4"}
	args := []interface{}{userID, symbol, tags, period}
	argIndex := 5
	if excludeID != nil {
		conditions = append(conditions, fmt.Sprintf("b.id <> $%d", argIndex))
		args = append(args, *excludeID)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`
		SELECT o.pnl_percent
		FROM outcomes o
		JOIN bubbles b ON b.id = o.bubble_id
		%s
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wins int
	var losses int
	count := 0
	sum := new(big.Rat)
	for rows.Next() {
		var pnlStr string
		if err := rows.Scan(&pnlStr); err != nil {
			return nil, err
		}
		pnl, ok := parseDecimal(pnlStr)
		if !ok {
			continue
		}
		if pnl.Sign() > 0 {
			wins++
		} else if pnl.Sign() < 0 {
			losses++
		}
		sum.Add(sum, pnl)
		count++
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	var avgPtr *string
	if count > 0 {
		avg := new(big.Rat).Quo(sum, big.NewRat(int64(count), 1))
		formatted := formatDecimal(avg, 8)
		avgPtr = &formatted
	}

	return &repositories.SimilarSummary{
		Wins:   wins,
		Losses: losses,
		AvgPnL: avgPtr,
	}, nil
}

func parseDecimal(value string) (*big.Rat, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, false
	}
	rat := new(big.Rat)
	if _, ok := rat.SetString(value); !ok {
		return nil, false
	}
	return rat, true
}

func formatDecimal(value *big.Rat, scale int) string {
	if value == nil {
		return ""
	}
	formatted := value.FloatString(scale)
	formatted = strings.TrimRight(formatted, "0")
	formatted = strings.TrimRight(formatted, ".")
	if formatted == "" || formatted == "-" {
		return "0"
	}
	return formatted
}

func safeString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func safeTime(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

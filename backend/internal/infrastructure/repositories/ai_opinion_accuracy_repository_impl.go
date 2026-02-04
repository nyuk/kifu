package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AIOpinionAccuracyRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAIOpinionAccuracyRepository(pool *pgxpool.Pool) repositories.AIOpinionAccuracyRepository {
	return &AIOpinionAccuracyRepositoryImpl{pool: pool}
}

func (r *AIOpinionAccuracyRepositoryImpl) Create(ctx context.Context, accuracy *entities.AIOpinionAccuracy) error {
	query := `
		INSERT INTO ai_opinion_accuracies (id, opinion_id, outcome_id, bubble_id, provider, period, predicted_direction, actual_direction, is_correct, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(ctx, query,
		accuracy.ID, accuracy.OpinionID, accuracy.OutcomeID, accuracy.BubbleID,
		accuracy.Provider, accuracy.Period, accuracy.PredictedDirection,
		accuracy.ActualDirection, accuracy.IsCorrect, accuracy.CreatedAt)
	return err
}

func (r *AIOpinionAccuracyRepositoryImpl) GetByBubbleID(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinionAccuracy, error) {
	query := `
		SELECT id, opinion_id, outcome_id, bubble_id, provider, period, predicted_direction, actual_direction, is_correct, created_at
		FROM ai_opinion_accuracies
		WHERE bubble_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accuracies []*entities.AIOpinionAccuracy
	for rows.Next() {
		var acc entities.AIOpinionAccuracy
		if err := rows.Scan(
			&acc.ID, &acc.OpinionID, &acc.OutcomeID, &acc.BubbleID,
			&acc.Provider, &acc.Period, &acc.PredictedDirection,
			&acc.ActualDirection, &acc.IsCorrect, &acc.CreatedAt); err != nil {
			return nil, err
		}
		accuracies = append(accuracies, &acc)
	}

	return accuracies, rows.Err()
}

func (r *AIOpinionAccuracyRepositoryImpl) GetByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (*entities.AIOpinionAccuracy, error) {
	query := `
		SELECT id, opinion_id, outcome_id, bubble_id, provider, period, predicted_direction, actual_direction, is_correct, created_at
		FROM ai_opinion_accuracies
		WHERE opinion_id = $1 AND outcome_id = $2
	`
	var acc entities.AIOpinionAccuracy
	err := r.pool.QueryRow(ctx, query, opinionID, outcomeID).Scan(
		&acc.ID, &acc.OpinionID, &acc.OutcomeID, &acc.BubbleID,
		&acc.Provider, &acc.Period, &acc.PredictedDirection,
		&acc.ActualDirection, &acc.IsCorrect, &acc.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &acc, nil
}

func (r *AIOpinionAccuracyRepositoryImpl) ExistsByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM ai_opinion_accuracies WHERE opinion_id = $1 AND outcome_id = $2)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, opinionID, outcomeID).Scan(&exists)
	return exists, err
}

func (r *AIOpinionAccuracyRepositoryImpl) GetProviderStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (map[string]*repositories.ProviderAccuracyStats, error) {
	// Calculate date range
	var since time.Time
	switch period {
	case "7d":
		since = time.Now().AddDate(0, 0, -7)
	case "30d":
		since = time.Now().AddDate(0, 0, -30)
	default:
		since = time.Time{}
	}

	conditions := []string{"b.user_id = $1", "a.period = $2", "($3::timestamptz IS NULL OR b.candle_time >= $3)"}
	args := []interface{}{userID, outcomePeriod, nil}
	if !since.IsZero() {
		args[2] = since
	}
	argIndex := 4
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("b.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}
	if venueName != "" {
		conditions = append(conditions, fmt.Sprintf("b.venue_name = $%d", argIndex))
		args = append(args, venueName)
		argIndex++
	}
	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf(`
		SELECT
			a.provider,
			a.predicted_direction,
			COUNT(*) as total,
			SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct
		FROM ai_opinion_accuracies a
		JOIN bubbles b ON a.bubble_id = b.id
		WHERE %s
		GROUP BY a.provider, a.predicted_direction
		ORDER BY a.provider, a.predicted_direction
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := make(map[string]*repositories.ProviderAccuracyStats)

	for rows.Next() {
		var provider string
		var direction string
		var total, correct int

		if err := rows.Scan(&provider, &direction, &total, &correct); err != nil {
			return nil, err
		}

		if _, ok := stats[provider]; !ok {
			stats[provider] = &repositories.ProviderAccuracyStats{
				Provider:    provider,
				ByDirection: make(map[entities.Direction]repositories.DirectionStats),
			}
		}

		ps := stats[provider]
		ps.Total += total
		ps.Correct += correct
		ps.Evaluated += total

		accuracy := 0.0
		if total > 0 {
			accuracy = float64(correct) / float64(total) * 100
		}

		ps.ByDirection[entities.Direction(direction)] = repositories.DirectionStats{
			Predicted: total,
			Correct:   correct,
			Accuracy:  accuracy,
		}
	}

	// Calculate overall accuracy for each provider
	for _, ps := range stats {
		if ps.Evaluated > 0 {
			ps.Accuracy = float64(ps.Correct) / float64(ps.Evaluated) * 100
		}
	}

	return stats, rows.Err()
}

func (r *AIOpinionAccuracyRepositoryImpl) GetTotalStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (total int, evaluated int, err error) {
	var since time.Time
	switch period {
	case "7d":
		since = time.Now().AddDate(0, 0, -7)
	case "30d":
		since = time.Now().AddDate(0, 0, -30)
	default:
		since = time.Time{}
	}

	conditions := []string{"b.user_id = $1", "($2::timestamptz IS NULL OR b.candle_time >= $2)"}
	args := []interface{}{userID, nil}
	if !since.IsZero() {
		args[1] = since
	}
	argIndex := 3
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("b.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}
	if venueName != "" {
		conditions = append(conditions, fmt.Sprintf("b.venue_name = $%d", argIndex))
		args = append(args, venueName)
		argIndex++
	}
	whereClause := strings.Join(conditions, " AND ")

	// Total opinions count
	totalQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT ao.id)
		FROM ai_opinions ao
		JOIN bubbles b ON ao.bubble_id = b.id
		WHERE %s
	`, whereClause)

	// Evaluated (has accuracy record)
	evaluatedQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT a.opinion_id)
		FROM ai_opinion_accuracies a
		JOIN bubbles b ON a.bubble_id = b.id
		WHERE %s
		AND a.period = $%d
	`, whereClause, argIndex)

	evaluatedArgs := append([]interface{}{}, args...)
	evaluatedArgs = append(evaluatedArgs, outcomePeriod)

	if err = r.pool.QueryRow(ctx, totalQuery, args...).Scan(&total); err != nil {
		return
	}
	err = r.pool.QueryRow(ctx, evaluatedQuery, evaluatedArgs...).Scan(&evaluated)
	return
}

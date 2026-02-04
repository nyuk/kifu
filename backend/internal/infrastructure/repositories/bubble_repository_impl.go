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
		INSERT INTO bubbles (id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.pool.Exec(ctx, query,
		bubble.ID, bubble.UserID, bubble.Symbol, bubble.Timeframe, bubble.CandleTime, bubble.Price, bubble.BubbleType, bubble.AssetClass, bubble.VenueName, bubble.Memo, bubble.Tags, bubble.CreatedAt)
	return err
}

func (r *BubbleRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Bubble, error) {
	query := `
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		FROM bubbles
		WHERE id = $1
	`
	var bubble entities.Bubble
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
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
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
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
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
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

func (r *BubbleRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*entities.Bubble, int, error) {
	countQuery := `SELECT COUNT(*) FROM bubbles WHERE user_id = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		FROM bubbles
		WHERE user_id = $1
		ORDER BY candle_time DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var bubbles []*entities.Bubble
	for rows.Next() {
		var bubble entities.Bubble
		err := rows.Scan(
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
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
		SET memo = $2, tags = $3, asset_class = $4, venue_name = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, bubble.ID, bubble.Memo, bubble.Tags, bubble.AssetClass, bubble.VenueName)
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
		SELECT b.id, b.user_id, b.symbol, b.timeframe, b.candle_time, b.price, b.bubble_type, b.asset_class, b.venue_name, b.memo, b.tags, b.created_at,
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
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt,
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

func (r *BubbleRepositoryImpl) GetReviewStats(ctx context.Context, userID uuid.UUID, period string, symbol string, tag string, assetClass string, venueName string) (*repositories.ReviewStats, error) {
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

	// Build base conditions
	conditions := []string{"b.user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if !since.IsZero() {
		conditions = append(conditions, fmt.Sprintf("b.candle_time >= $%d", argIndex))
		args = append(args, since)
		argIndex++
	}
	if symbol != "" {
		conditions = append(conditions, fmt.Sprintf("b.symbol = $%d", argIndex))
		args = append(args, symbol)
		argIndex++
	}
	if tag != "" {
		conditions = append(conditions, fmt.Sprintf("$%d = ANY(b.tags)", argIndex))
		args = append(args, tag)
		argIndex++
	}
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

	// Total bubbles count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM bubbles b WHERE %s", whereClause)
	var totalBubbles int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalBubbles); err != nil {
		return nil, err
	}

	// Bubbles with outcome count
	outcomeCountQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT b.id)
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id
		WHERE %s
	`, whereClause)
	var bubblesWithOutcome int
	if err := r.pool.QueryRow(ctx, outcomeCountQuery, args...).Scan(&bubblesWithOutcome); err != nil {
		return nil, err
	}

	// Overall stats (using 1h period as default)
	overallQuery := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COALESCE(SUM(CAST(o.pnl_percent AS DECIMAL)), 0) as total_pnl,
			COALESCE(MAX(CAST(o.pnl_percent AS DECIMAL)), 0) as max_gain,
			COALESCE(MIN(CAST(o.pnl_percent AS DECIMAL)), 0) as max_loss
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
	`, whereClause)

	var wins, losses int
	var avgPnL, totalPnL, maxGain, maxLoss float64
	if err := r.pool.QueryRow(ctx, overallQuery, args...).Scan(&wins, &losses, &avgPnL, &totalPnL, &maxGain, &maxLoss); err != nil {
		return nil, err
	}

	winRate := 0.0
	if wins+losses > 0 {
		winRate = float64(wins) / float64(wins+losses) * 100
	}

	// Stats by period
	periodQuery := fmt.Sprintf(`
		SELECT
			o.period,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COUNT(*) as count
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id
		WHERE %s
		GROUP BY o.period
	`, whereClause)

	periodRows, err := r.pool.Query(ctx, periodQuery, args...)
	if err != nil {
		return nil, err
	}
	defer periodRows.Close()

	byPeriod := make(map[string]repositories.PeriodStats)
	for periodRows.Next() {
		var p string
		var pWins, pLosses, pCount int
		var pAvgPnL float64
		if err := periodRows.Scan(&p, &pWins, &pLosses, &pAvgPnL, &pCount); err != nil {
			return nil, err
		}
		pWinRate := 0.0
		if pWins+pLosses > 0 {
			pWinRate = float64(pWins) / float64(pWins+pLosses) * 100
		}
		byPeriod[p] = repositories.PeriodStats{
			WinRate: pWinRate,
			AvgPnL:  fmt.Sprintf("%.4f", pAvgPnL),
			Count:   pCount,
		}
	}

	// Stats by tag
	tagQuery := fmt.Sprintf(`
		SELECT
			unnest(b.tags) as tag,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COUNT(*) as count
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
		GROUP BY unnest(b.tags)
	`, whereClause)

	tagRows, err := r.pool.Query(ctx, tagQuery, args...)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()

	byTag := make(map[string]repositories.TagStats)
	for tagRows.Next() {
		var t string
		var tWins, tLosses, tCount int
		var tAvgPnL float64
		if err := tagRows.Scan(&t, &tWins, &tLosses, &tAvgPnL, &tCount); err != nil {
			return nil, err
		}
		tWinRate := 0.0
		if tWins+tLosses > 0 {
			tWinRate = float64(tWins) / float64(tWins+tLosses) * 100
		}
		byTag[t] = repositories.TagStats{
			Count:   tCount,
			WinRate: tWinRate,
			AvgPnL:  fmt.Sprintf("%.4f", tAvgPnL),
		}
	}

	// Stats by symbol
	symbolQuery := fmt.Sprintf(`
		SELECT
			b.symbol,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COUNT(*) as count
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
		GROUP BY b.symbol
	`, whereClause)

	symbolRows, err := r.pool.Query(ctx, symbolQuery, args...)
	if err != nil {
		return nil, err
	}
	defer symbolRows.Close()

	bySymbol := make(map[string]repositories.SymbolStats)
	for symbolRows.Next() {
		var s string
		var sWins, sLosses, sCount int
		var sAvgPnL float64
		if err := symbolRows.Scan(&s, &sWins, &sLosses, &sAvgPnL, &sCount); err != nil {
			return nil, err
		}
		sWinRate := 0.0
		if sWins+sLosses > 0 {
			sWinRate = float64(sWins) / float64(sWins+sLosses) * 100
		}
		bySymbol[s] = repositories.SymbolStats{
			Count:   sCount,
			WinRate: sWinRate,
			AvgPnL:  fmt.Sprintf("%.4f", sAvgPnL),
		}
	}

	return &repositories.ReviewStats{
		Period:             period,
		TotalBubbles:       totalBubbles,
		BubblesWithOutcome: bubblesWithOutcome,
		Overall: repositories.OverallReviewStats{
			WinRate:  winRate,
			AvgPnL:   fmt.Sprintf("%.4f", avgPnL),
			TotalPnL: fmt.Sprintf("%.4f", totalPnL),
			MaxGain:  fmt.Sprintf("%.4f", maxGain),
			MaxLoss:  fmt.Sprintf("%.4f", maxLoss),
		},
		ByPeriod: byPeriod,
		ByTag:    byTag,
		BySymbol: bySymbol,
	}, nil
}

func (r *BubbleRepositoryImpl) GetCalendarData(ctx context.Context, userID uuid.UUID, from time.Time, to time.Time, assetClass string, venueName string) (map[string]repositories.CalendarDay, error) {
	conditions := []string{"b.user_id = $1", "b.candle_time >= $2", "b.candle_time < $3"}
	args := []interface{}{userID, from, to.AddDate(0, 0, 1)}
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
			DATE(b.candle_time) as date,
			COUNT(DISTINCT b.id) as bubble_count,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as win_count,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as loss_count,
			COALESCE(SUM(CAST(o.pnl_percent AS DECIMAL)), 0) as total_pnl
		FROM bubbles b
		LEFT JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
		GROUP BY DATE(b.candle_time)
		ORDER BY date
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]repositories.CalendarDay)
	for rows.Next() {
		var date time.Time
		var bubbleCount, winCount, lossCount int
		var totalPnL float64
		if err := rows.Scan(&date, &bubbleCount, &winCount, &lossCount, &totalPnL); err != nil {
			return nil, err
		}
		result[date.Format("2006-01-02")] = repositories.CalendarDay{
			BubbleCount: bubbleCount,
			WinCount:    winCount,
			LossCount:   lossCount,
			TotalPnL:    fmt.Sprintf("%.4f", totalPnL),
		}
	}

	return result, rows.Err()
}

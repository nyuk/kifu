package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradeSafetyReviewRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradeSafetyReviewRepository(pool *pgxpool.Pool) repositories.TradeSafetyReviewRepository {
	return &TradeSafetyReviewRepositoryImpl{pool: pool}
}

func (r *TradeSafetyReviewRepositoryImpl) ListDaily(
	ctx context.Context,
	userID uuid.UUID,
	filter repositories.DailySafetyFilter,
) ([]repositories.DailySafetyItem, repositories.DailySafetySummary, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 20
	}

	baseArgs := []interface{}{userID, filter.From, filter.To}

	countArgs := append([]interface{}{}, baseArgs...)
	countWhere, countArgs, _ := buildDailySafetyWhere(filter, false, 4, countArgs)
	countQuery := dailySafetyBaseQuery + `
		SELECT
			COUNT(*)::int,
			COUNT(r.id)::int
		FROM daily d
		LEFT JOIN trade_safety_reviews r
			ON r.user_id = $1
			AND (
				(d.trade_id IS NOT NULL AND r.trade_id = d.trade_id::uuid)
				OR (d.trade_event_id IS NOT NULL AND r.trade_event_id = d.trade_event_id::uuid)
			)
		` + countWhere

	var total int
	var reviewed int
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total, &reviewed); err != nil {
		return nil, repositories.DailySafetySummary{}, err
	}

	listArgs := append([]interface{}{}, baseArgs...)
	listWhere, listArgs, nextArg := buildDailySafetyWhere(filter, true, 4, listArgs)
	listQuery := dailySafetyBaseQuery + `
		SELECT
			d.target_type,
			d.trade_id,
			d.trade_event_id,
			d.executed_at,
			d.asset_class,
			d.venue,
			d.venue_name,
			d.symbol,
			d.side,
			d.qty,
			d.price,
			d.source,
			r.verdict,
			r.note,
			r.updated_at
		FROM daily d
		LEFT JOIN trade_safety_reviews r
			ON r.user_id = $1
			AND (
				(d.trade_id IS NOT NULL AND r.trade_id = d.trade_id::uuid)
				OR (d.trade_event_id IS NOT NULL AND r.trade_event_id = d.trade_event_id::uuid)
			)
		` + listWhere + fmt.Sprintf(`
		ORDER BY d.executed_at DESC, d.symbol ASC
		LIMIT $%d
	`, nextArg)
	listArgs = append(listArgs, limit)

	rows, err := r.pool.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, repositories.DailySafetySummary{}, err
	}
	defer rows.Close()

	items := make([]repositories.DailySafetyItem, 0, limit)
	for rows.Next() {
		var item repositories.DailySafetyItem
		var tradeIDText pgtype.Text
		var tradeEventIDText pgtype.Text
		var sideText pgtype.Text
		var qtyText pgtype.Text
		var priceText pgtype.Text
		var verdictText pgtype.Text
		var noteText pgtype.Text
		var reviewedAt pgtype.Timestamptz

		if err := rows.Scan(
			&item.TargetType,
			&tradeIDText,
			&tradeEventIDText,
			&item.ExecutedAt,
			&item.AssetClass,
			&item.Venue,
			&item.VenueName,
			&item.Symbol,
			&sideText,
			&qtyText,
			&priceText,
			&item.Source,
			&verdictText,
			&noteText,
			&reviewedAt,
		); err != nil {
			return nil, repositories.DailySafetySummary{}, err
		}

		if sideText.Valid {
			side := sideText.String
			item.Side = &side
		}
		if qtyText.Valid {
			qty := qtyText.String
			item.Qty = &qty
		}
		if priceText.Valid {
			price := priceText.String
			item.Price = &price
		}
		if verdictText.Valid {
			verdict := verdictText.String
			item.Verdict = &verdict
		}
		if noteText.Valid {
			note := noteText.String
			item.Note = &note
		}
		if reviewedAt.Valid {
			timeValue := reviewedAt.Time
			item.ReviewedAt = &timeValue
		}

		targetID, parseErr := parseDailySafetyTargetID(item.TargetType, tradeIDText, tradeEventIDText)
		if parseErr != nil {
			return nil, repositories.DailySafetySummary{}, parseErr
		}
		item.TargetID = targetID

		items = append(items, item)
	}

	if rows.Err() != nil {
		return nil, repositories.DailySafetySummary{}, rows.Err()
	}

	summary := repositories.DailySafetySummary{
		Total:    total,
		Reviewed: reviewed,
		Pending:  total - reviewed,
	}
	if summary.Pending < 0 {
		summary.Pending = 0
	}

	return items, summary, nil
}

func (r *TradeSafetyReviewRepositoryImpl) Upsert(
	ctx context.Context,
	userID uuid.UUID,
	input repositories.UpsertSafetyReviewInput,
) (*entities.TradeSafetyReview, error) {
	normalizedType := strings.ToLower(strings.TrimSpace(input.TargetType))
	if normalizedType != "trade" && normalizedType != "trade_event" {
		return nil, repositories.ErrSafetyTargetNotFound
	}

	note := normalizeOptionalNote(input.Note)

	if normalizedType == "trade" {
		var exists bool
		err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM trades WHERE id = $1 AND user_id = $2)`, input.TargetID, userID).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, repositories.ErrSafetyTargetNotFound
		}

		query := `
			INSERT INTO trade_safety_reviews (id, user_id, trade_id, verdict, note, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (user_id, trade_id)
			WHERE trade_id IS NOT NULL
			DO UPDATE
			SET verdict = EXCLUDED.verdict,
				note = EXCLUDED.note,
				updated_at = NOW()
			RETURNING id, user_id, COALESCE(trade_id::text, ''), COALESCE(trade_event_id::text, ''), verdict, note, created_at, updated_at
		`
		return scanSafetyReview(r.pool.QueryRow(ctx, query, userID, input.TargetID, input.Verdict, note))
	}

	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM trade_events WHERE id = $1 AND user_id = $2)`, input.TargetID, userID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, repositories.ErrSafetyTargetNotFound
	}

	query := `
		INSERT INTO trade_safety_reviews (id, user_id, trade_event_id, verdict, note, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (user_id, trade_event_id)
		WHERE trade_event_id IS NOT NULL
		DO UPDATE
		SET verdict = EXCLUDED.verdict,
			note = EXCLUDED.note,
			updated_at = NOW()
		RETURNING id, user_id, COALESCE(trade_id::text, ''), COALESCE(trade_event_id::text, ''), verdict, note, created_at, updated_at
	`
	return scanSafetyReview(r.pool.QueryRow(ctx, query, userID, input.TargetID, input.Verdict, note))
}

const dailySafetyBaseQuery = `
	WITH daily AS (
		SELECT
			'trade'::text AS target_type,
			t.id::text AS trade_id,
			NULL::text AS trade_event_id,
			t.trade_time AS executed_at,
			'crypto'::text AS asset_class,
			LOWER(COALESCE(NULLIF(t.exchange, ''), 'legacy')) AS venue,
			COALESCE(NULLIF(t.exchange, ''), 'Legacy') AS venue_name,
			t.symbol AS symbol,
			LOWER(t.side) AS side,
			t.quantity::text AS qty,
			t.price::text AS price,
			'api'::text AS source
		FROM trades t
		WHERE t.user_id = $1
			AND t.trade_time >= $2
			AND t.trade_time < $3

		UNION ALL

		SELECT
			'trade_event'::text AS target_type,
			NULL::text AS trade_id,
			e.id::text AS trade_event_id,
			e.executed_at,
			e.asset_class,
			LOWER(COALESCE(v.code, 'unknown')) AS venue,
			COALESCE(v.display_name, v.code, e.venue_type) AS venue_name,
			COALESCE(i.symbol, '-') AS symbol,
			e.side,
			e.qty::text,
			e.price::text,
			e.source
		FROM trade_events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN instruments i ON e.instrument_id = i.id
		WHERE e.user_id = $1
			AND e.executed_at >= $2
			AND e.executed_at < $3
			AND e.event_type IN ('spot_trade', 'perp_trade', 'dex_swap')
	)
`

func buildDailySafetyWhere(
	filter repositories.DailySafetyFilter,
	includeOnlyPending bool,
	argIndex int,
	args []interface{},
) (string, []interface{}, int) {
	conditions := make([]string, 0, 3)

	assetClass := strings.ToLower(strings.TrimSpace(filter.AssetClass))
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("d.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}

	venue := strings.ToLower(strings.TrimSpace(filter.Venue))
	if venue != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(d.venue) = $%d OR LOWER(d.venue_name) = $%d)", argIndex, argIndex))
		args = append(args, venue)
		argIndex++
	}

	if includeOnlyPending && filter.OnlyPending {
		conditions = append(conditions, "r.id IS NULL")
	}

	if len(conditions) == 0 {
		return "", args, argIndex
	}

	return " WHERE " + strings.Join(conditions, " AND "), args, argIndex
}

func parseDailySafetyTargetID(targetType string, tradeID pgtype.Text, tradeEventID pgtype.Text) (uuid.UUID, error) {
	if targetType == "trade" {
		if !tradeID.Valid {
			return uuid.Nil, fmt.Errorf("trade target is missing id")
		}
		return uuid.Parse(tradeID.String)
	}

	if targetType == "trade_event" {
		if !tradeEventID.Valid {
			return uuid.Nil, fmt.Errorf("trade_event target is missing id")
		}
		return uuid.Parse(tradeEventID.String)
	}

	return uuid.Nil, fmt.Errorf("unsupported target type: %s", targetType)
}

func scanSafetyReview(row interface {
	Scan(dest ...interface{}) error
}) (*entities.TradeSafetyReview, error) {
	var review entities.TradeSafetyReview
	var tradeIDRaw string
	var tradeEventIDRaw string
	var verdict string
	var noteText pgtype.Text

	if err := row.Scan(
		&review.ID,
		&review.UserID,
		&tradeIDRaw,
		&tradeEventIDRaw,
		&verdict,
		&noteText,
		&review.CreatedAt,
		&review.UpdatedAt,
	); err != nil {
		return nil, err
	}

	if tradeIDRaw != "" {
		parsed, err := uuid.Parse(tradeIDRaw)
		if err != nil {
			return nil, err
		}
		review.TradeID = &parsed
	}
	if tradeEventIDRaw != "" {
		parsed, err := uuid.Parse(tradeEventIDRaw)
		if err != nil {
			return nil, err
		}
		review.TradeEventID = &parsed
	}

	review.Verdict = entities.TradeSafetyVerdict(verdict)
	if noteText.Valid {
		note := noteText.String
		review.Note = &note
	}

	return &review, nil
}

func normalizeOptionalNote(note *string) *string {
	if note == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*note)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > 300 {
		trimmed = trimmed[:300]
	}
	return &trimmed
}

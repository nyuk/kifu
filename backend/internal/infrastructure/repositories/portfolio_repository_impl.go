package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PortfolioRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewPortfolioRepository(pool *pgxpool.Pool) repositories.PortfolioRepository {
	return &PortfolioRepositoryImpl{pool: pool}
}

func (r *PortfolioRepositoryImpl) UpsertVenue(ctx context.Context, code string, venueType string, displayName string, chain string) (uuid.UUID, error) {
	query := `
		INSERT INTO venues (code, venue_type, display_name, chain)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (code) DO UPDATE
		SET venue_type = EXCLUDED.venue_type,
			display_name = EXCLUDED.display_name,
			chain = COALESCE(EXCLUDED.chain, venues.chain)
		RETURNING id
	`
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, query, code, venueType, displayName, nullIfEmpty(chain)).Scan(&id)
	return id, err
}

func (r *PortfolioRepositoryImpl) UpsertAccount(ctx context.Context, userID uuid.UUID, venueID uuid.UUID, label string, address *string, source string) (uuid.UUID, error) {
	query := `
		INSERT INTO accounts (user_id, venue_id, label, address, source)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, venue_id, label) DO UPDATE
		SET address = COALESCE(EXCLUDED.address, accounts.address),
			source = EXCLUDED.source
		RETURNING id
	`
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, query, userID, venueID, label, address, source).Scan(&id)
	return id, err
}

func (r *PortfolioRepositoryImpl) UpsertInstrument(ctx context.Context, assetClass string, baseAsset string, quoteAsset string, symbol string) (uuid.UUID, error) {
	query := `
		INSERT INTO instruments (asset_class, base_asset, quote_asset, symbol)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (asset_class, symbol) DO UPDATE
		SET base_asset = EXCLUDED.base_asset,
			quote_asset = EXCLUDED.quote_asset
		RETURNING id
	`
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, query, assetClass, baseAsset, quoteAsset, symbol).Scan(&id)
	return id, err
}

func (r *PortfolioRepositoryImpl) UpsertInstrumentMapping(ctx context.Context, instrumentID uuid.UUID, venueID uuid.UUID, venueSymbol string) error {
	query := `
		INSERT INTO instrument_mappings (instrument_id, venue_id, venue_symbol)
		VALUES ($1, $2, $3)
		ON CONFLICT (venue_id, venue_symbol) DO UPDATE
		SET instrument_id = EXCLUDED.instrument_id
	`
	_, err := r.pool.Exec(ctx, query, instrumentID, venueID, venueSymbol)
	return err
}

func (r *PortfolioRepositoryImpl) CreateTradeEvent(ctx context.Context, event *entities.TradeEvent) error {
	query := `
		INSERT INTO trade_events (
			id, user_id, account_id, venue_id, instrument_id, asset_class, venue_type, event_type,
			side, qty, price, fee, fee_asset, executed_at, source, external_id, metadata, dedupe_key
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)
	`
	_, err := r.pool.Exec(
		ctx,
		query,
		event.ID,
		event.UserID,
		event.AccountID,
		event.VenueID,
		event.InstrumentID,
		event.AssetClass,
		event.VenueType,
		event.EventType,
		event.Side,
		event.Qty,
		event.Price,
		event.Fee,
		event.FeeAsset,
		event.ExecutedAt,
		event.Source,
		event.ExternalID,
		event.Metadata,
		event.DedupeKey,
	)
	return err
}

func (r *PortfolioRepositoryImpl) ListTimeline(ctx context.Context, userID uuid.UUID, filter repositories.TimelineFilter) ([]repositories.TimelineEvent, error) {
	conditions := []string{"e.user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("e.executed_at >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("e.executed_at <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}
	if len(filter.AssetClasses) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.asset_class = ANY($%d)", argIndex))
		args = append(args, filter.AssetClasses)
		argIndex++
	}
	if len(filter.Venues) > 0 {
		conditions = append(conditions, fmt.Sprintf("v.code = ANY($%d)", argIndex))
		args = append(args, filter.Venues)
		argIndex++
	}
	if len(filter.Sources) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.source = ANY($%d)", argIndex))
		args = append(args, filter.Sources)
		argIndex++
	}
	if len(filter.EventTypes) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.event_type = ANY($%d)", argIndex))
		args = append(args, filter.EventTypes)
		argIndex++
	}
	if filter.Cursor != nil {
		conditions = append(conditions, fmt.Sprintf("(e.executed_at, e.id) < ($%d, $%d)", argIndex, argIndex+1))
		args = append(args, filter.Cursor.Time, filter.Cursor.ID)
		argIndex += 2
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	query := fmt.Sprintf(`
		SELECT
			e.id,
			e.executed_at,
			e.asset_class,
			e.venue_type,
			COALESCE(v.code, '') as venue_code,
			COALESCE(v.display_name, '') as venue_name,
			COALESCE(i.symbol, '') as instrument_symbol,
			e.event_type,
			e.side,
			e.qty,
			e.price,
			e.fee,
			e.fee_asset,
			e.source,
			e.external_id,
			e.metadata,
			a.label
		FROM trade_events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN instruments i ON e.instrument_id = i.id
		LEFT JOIN accounts a ON e.account_id = a.id
		%s
		ORDER BY e.executed_at DESC, e.id DESC
		LIMIT $%d
	`, whereClause, argIndex)

	args = append(args, limit)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]repositories.TimelineEvent, 0)
	for rows.Next() {
		var event repositories.TimelineEvent
		var metadata []byte
		if err := rows.Scan(
			&event.ID,
			&event.ExecutedAt,
			&event.AssetClass,
			&event.VenueType,
			&event.VenueCode,
			&event.VenueName,
			&event.Instrument,
			&event.EventType,
			&event.Side,
			&event.Qty,
			&event.Price,
			&event.Fee,
			&event.FeeAsset,
			&event.Source,
			&event.ExternalID,
			&metadata,
			&event.AccountLabel,
		); err != nil {
			return nil, err
		}

		if metadata != nil {
			raw := json.RawMessage(metadata)
			event.Metadata = &raw
		}

		events = append(events, event)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return events, nil
}

func (r *PortfolioRepositoryImpl) ListPositions(ctx context.Context, userID uuid.UUID, filter repositories.PositionFilter) ([]repositories.PositionSummary, error) {
	conditions := []string{"p.user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if filter.Status != "" && filter.Status != "all" {
		conditions = append(conditions, fmt.Sprintf("p.status = $%d", argIndex))
		args = append(args, filter.Status)
		argIndex++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("COALESCE(p.last_executed_at, p.opened_at) >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("COALESCE(p.last_executed_at, p.opened_at) <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}
	if len(filter.AssetClasses) > 0 {
		conditions = append(conditions, fmt.Sprintf("i.asset_class = ANY($%d)", argIndex))
		args = append(args, filter.AssetClasses)
		argIndex++
	}
	if len(filter.Venues) > 0 {
		conditions = append(conditions, fmt.Sprintf("v.code = ANY($%d)", argIndex))
		args = append(args, filter.Venues)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	query := fmt.Sprintf(`
		SELECT
			COALESCE(i.symbol, '') as instrument_symbol,
			COALESCE(v.code, '') as venue_code,
			COALESCE(v.display_name, '') as venue_name,
			COALESCE(i.asset_class, '') as asset_class,
			COALESCE(v.venue_type, '') as venue_type,
			COALESCE(p.size, 0)::text as net_qty,
			COALESCE(p.avg_entry, 0)::text as avg_entry,
			p.status,
			COALESCE(p.buy_qty, 0)::text as buy_qty,
			COALESCE(p.sell_qty, 0)::text as sell_qty,
			COALESCE(p.buy_notional, 0)::text as buy_notional,
			COALESCE(p.sell_notional, 0)::text as sell_notional,
			COALESCE(p.last_executed_at, p.opened_at) as last_executed_at
		FROM positions p
		LEFT JOIN instruments i ON p.instrument_id = i.id
		LEFT JOIN venues v ON p.venue_id = v.id
		%s
		ORDER BY last_executed_at DESC NULLS LAST
		LIMIT $%d
	`, whereClause, argIndex)

	args = append(args, limit)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]repositories.PositionSummary, 0)
	for rows.Next() {
		var summary repositories.PositionSummary
		if err := rows.Scan(
			&summary.Instrument,
			&summary.VenueCode,
			&summary.VenueName,
			&summary.AssetClass,
			&summary.VenueType,
			&summary.NetQty,
			&summary.AvgEntry,
			&summary.Status,
			&summary.BuyQty,
			&summary.SellQty,
			&summary.BuyNotional,
			&summary.SellNotional,
			&summary.LastExecutedAt,
		); err != nil {
			return nil, err
		}

		summaries = append(summaries, summary)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return summaries, nil
}

func (r *PortfolioRepositoryImpl) RebuildPositions(ctx context.Context, userID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM positions WHERE user_id = $1", userID); err != nil {
		return err
	}

	query := `
		WITH aggregates AS (
			SELECT
				e.user_id,
				e.venue_id,
				e.instrument_id,
				SUM(CASE WHEN e.side = 'buy' THEN e.qty::numeric ELSE -e.qty::numeric END) AS net_qty,
				SUM(CASE WHEN e.side = 'buy' THEN e.qty::numeric ELSE 0 END) AS buy_qty,
				SUM(CASE WHEN e.side = 'buy' THEN e.qty::numeric * e.price::numeric ELSE 0 END) AS buy_notional,
				SUM(CASE WHEN e.side = 'sell' THEN e.qty::numeric ELSE 0 END) AS sell_qty,
				SUM(CASE WHEN e.side = 'sell' THEN e.qty::numeric * e.price::numeric ELSE 0 END) AS sell_notional,
				MIN(e.executed_at) AS opened_at,
				MAX(e.executed_at) AS last_executed_at
			FROM trade_events e
			WHERE e.user_id = $1
			AND e.event_type IN ('spot_trade', 'perp_trade', 'dex_swap')
			AND e.side IN ('buy', 'sell')
			GROUP BY e.user_id, e.venue_id, e.instrument_id
		)
		INSERT INTO positions (
			id,
			user_id,
			venue_id,
			instrument_id,
			status,
			size,
			avg_entry,
			opened_at,
			closed_at,
			buy_qty,
			sell_qty,
			buy_notional,
			sell_notional,
			last_executed_at,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			user_id,
			venue_id,
			instrument_id,
			CASE WHEN net_qty = 0 THEN 'closed' ELSE 'open' END,
			net_qty,
			CASE
				WHEN net_qty > 0 AND buy_qty > 0 THEN buy_notional / NULLIF(buy_qty, 0)
				WHEN net_qty < 0 AND sell_qty > 0 THEN sell_notional / NULLIF(sell_qty, 0)
				ELSE NULL
			END,
			opened_at,
			CASE WHEN net_qty = 0 THEN last_executed_at ELSE NULL END,
			buy_qty,
			sell_qty,
			buy_notional,
			sell_notional,
			last_executed_at,
			NOW(),
			NOW()
		FROM aggregates
	`

	if _, err := tx.Exec(ctx, query, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PortfolioRepositoryImpl) ListUsersWithEvents(ctx context.Context, limit int) ([]uuid.UUID, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}

	query := `
		SELECT user_id
		FROM (
			SELECT user_id, MAX(executed_at) AS last_event
			FROM trade_events
			GROUP BY user_id
		) t
		ORDER BY last_event DESC
		LIMIT $1
	`

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		users = append(users, id)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return users, nil
}

func (r *PortfolioRepositoryImpl) BackfillBubblesFromEvents(ctx context.Context, userID uuid.UUID) (int64, error) {
	query := `
		INSERT INTO bubbles (
			id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		)
		SELECT
			gen_random_uuid(),
			e.user_id,
			i.symbol,
			'1h' as timeframe,
			e.executed_at as candle_time,
			e.price,
			'auto' as bubble_type,
			e.asset_class,
			COALESCE(v.display_name, v.code) as venue_name,
			CONCAT('Event sync: ', i.symbol, ' ', UPPER(COALESCE(e.side, '')), ' @ ', e.price),
			CASE
				WHEN e.side IS NULL THEN NULL
				ELSE ARRAY[e.side]
			END,
			NOW()
		FROM trade_events e
		LEFT JOIN instruments i ON e.instrument_id = i.id
		LEFT JOIN venues v ON e.venue_id = v.id
		WHERE e.user_id = $1
		AND e.event_type IN ('spot_trade', 'perp_trade', 'dex_swap')
		AND e.price IS NOT NULL
		AND i.symbol IS NOT NULL
		AND i.symbol <> ''
		AND NOT EXISTS (
			SELECT 1
			FROM bubbles b
			WHERE b.user_id = e.user_id
			AND b.symbol = i.symbol
			AND b.candle_time = e.executed_at
			AND b.price = e.price
			AND b.bubble_type = 'auto'
		)
	`
	result, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func nullIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

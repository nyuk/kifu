package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradeRepository(pool *pgxpool.Pool) repositories.TradeRepository {
	return &TradeRepositoryImpl{pool: pool}
}

func (r *TradeRepositoryImpl) Create(ctx context.Context, trade *entities.Trade) error {
	query := `
    INSERT INTO trades (id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `
	_, err := r.pool.Exec(ctx, query,
		trade.ID, trade.UserID, trade.BubbleID, trade.BinanceTradeID, trade.Exchange, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.RealizedPnL, trade.TradeTime)
	return err
}

func (r *TradeRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE id = $1
  `
	var trade entities.Trade
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &trade, nil
}

func (r *TradeRepositoryImpl) ListByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE user_id = $1 AND symbol = $2
    ORDER BY trade_time DESC
  `
	rows, err := r.pool.Query(ctx, query, userID, symbol)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE bubble_id = $1
    ORDER BY trade_time DESC
  `
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM trades WHERE id = $1", id)
	return err
}

func (r *TradeRepositoryImpl) List(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]*entities.Trade, int, error) {
	whereClause, args, argIndex := buildTradeWhere(userID, filter)

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM trades %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortClause := "ORDER BY trade_time DESC"
	if filter.Sort == "asc" {
		sortClause = "ORDER BY trade_time ASC"
	}

	listQuery := fmt.Sprintf(`
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time
    FROM trades
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

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, 0, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}
	return trades, total, nil
}

func (r *TradeRepositoryImpl) Summary(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) (repositories.TradeSummary, []repositories.TradeSideSummary, []repositories.TradeSymbolSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	summaryQuery := fmt.Sprintf(`
    SELECT
      COUNT(*)::int,
      COALESCE(SUM(realized_pnl), 0)::text,
      COALESCE(SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END), 0)::int,
      COALESCE(SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END), 0)::int,
      COALESCE(SUM(CASE WHEN realized_pnl = 0 THEN 1 ELSE 0 END), 0)::int
    FROM trades
    %s
  `, whereClause)

	var summary repositories.TradeSummary
	if err := r.pool.QueryRow(ctx, summaryQuery, args...).Scan(
		&summary.TotalTrades, &summary.RealizedPnLTotal, &summary.Wins, &summary.Losses, &summary.Breakeven); err != nil {
		return repositories.TradeSummary{}, nil, nil, err
	}

	sideQuery := fmt.Sprintf(`
    SELECT side, COUNT(*)::int, COALESCE(SUM(realized_pnl), 0)::text
    FROM trades
    %s
    GROUP BY side
    ORDER BY side ASC
  `, whereClause)

	sideRows, err := r.pool.Query(ctx, sideQuery, args...)
	if err != nil {
		return repositories.TradeSummary{}, nil, nil, err
	}
	defer sideRows.Close()

	var sides []repositories.TradeSideSummary
	for sideRows.Next() {
		var side repositories.TradeSideSummary
		if err := sideRows.Scan(&side.Side, &side.TotalTrades, &side.RealizedPnLTotal); err != nil {
			return repositories.TradeSummary{}, nil, nil, err
		}
		sides = append(sides, side)
	}
	if sideRows.Err() != nil {
		return repositories.TradeSummary{}, nil, nil, sideRows.Err()
	}

	symbolQuery := fmt.Sprintf(`
    SELECT symbol,
      COUNT(*)::int,
      COALESCE(SUM(realized_pnl), 0)::text,
      COALESCE(SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END), 0)::int,
      COALESCE(SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END), 0)::int
    FROM trades
    %s
    GROUP BY symbol
    ORDER BY COUNT(*) DESC, symbol ASC
    LIMIT 20
  `, whereClause)

	symbolRows, err := r.pool.Query(ctx, symbolQuery, args...)
	if err != nil {
		return repositories.TradeSummary{}, nil, nil, err
	}
	defer symbolRows.Close()

	var symbols []repositories.TradeSymbolSummary
	for symbolRows.Next() {
		var item repositories.TradeSymbolSummary
		if err := symbolRows.Scan(&item.Symbol, &item.TotalTrades, &item.RealizedPnLTotal, &item.Wins, &item.Losses); err != nil {
			return repositories.TradeSummary{}, nil, nil, err
		}
		symbols = append(symbols, item)
	}
	if symbolRows.Err() != nil {
		return repositories.TradeSummary{}, nil, nil, symbolRows.Err()
	}

	return summary, sides, symbols, nil
}

func (r *TradeRepositoryImpl) SummaryByExchange(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]repositories.TradeExchangeSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	query := fmt.Sprintf(`
		SELECT exchange,
			COUNT(*)::int,
			COALESCE(SUM(realized_pnl), 0)::text
		FROM trades
		%s
		GROUP BY exchange
		ORDER BY exchange ASC
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []repositories.TradeExchangeSummary
	for rows.Next() {
		var item repositories.TradeExchangeSummary
		if err := rows.Scan(&item.Exchange, &item.TotalTrades, &item.RealizedPnLTotal); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *TradeRepositoryImpl) SummaryBySide(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]*repositories.TradeSideSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	query := fmt.Sprintf(`
		SELECT side,
			COUNT(*)::int,
			COUNT(*)::int,
			COALESCE(SUM(quantity), 0)::text,
			COALESCE(SUM(realized_pnl), 0)::text
		FROM trades
		%s
		GROUP BY side
		ORDER BY side ASC
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*repositories.TradeSideSummary
	for rows.Next() {
		var item repositories.TradeSideSummary
		if err := rows.Scan(&item.Side, &item.TradeCount, &item.TotalTrades, &item.TotalVolume, &item.RealizedPnLTotal); err != nil {
			return nil, err
		}
		items = append(items, &item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *TradeRepositoryImpl) SummaryBySymbol(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]*repositories.TradeSymbolSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	query := fmt.Sprintf(`
		SELECT symbol,
			COUNT(*)::int,
			COUNT(*)::int,
			SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END)::int,
			SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END)::int,
			COALESCE(SUM(quantity), 0)::text,
			COALESCE(SUM(realized_pnl), 0)::text,
			SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END)::int,
			SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END)::int
		FROM trades
		%s
		GROUP BY symbol
		ORDER BY COUNT(*) DESC, symbol ASC
		LIMIT 20
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*repositories.TradeSymbolSummary
	for rows.Next() {
		var item repositories.TradeSymbolSummary
		if err := rows.Scan(&item.Symbol, &item.TradeCount, &item.TotalTrades, &item.BuyCount, &item.SellCount, &item.TotalVolume, &item.RealizedPnLTotal, &item.Wins, &item.Losses); err != nil {
			return nil, err
		}
		items = append(items, &item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *TradeRepositoryImpl) ListUnlinked(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.Trade, error) {
	if limit <= 0 {
		limit = 500
	}
	query := `
		SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time
		FROM trades
		WHERE user_id = $1 AND bubble_id IS NULL
		ORDER BY trade_time ASC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) UpdateBubbleID(ctx context.Context, tradeID uuid.UUID, bubbleID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "UPDATE trades SET bubble_id = $2 WHERE id = $1", tradeID, bubbleID)
	return err
}

func (r *TradeRepositoryImpl) ClearBubbleID(ctx context.Context, tradeID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "UPDATE trades SET bubble_id = NULL WHERE id = $1", tradeID)
	return err
}

func buildTradeWhere(userID uuid.UUID, filter repositories.TradeFilter) (string, []interface{}, int) {
	conditions := []string{"user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if filter.Exchange != "" {
		conditions = append(conditions, fmt.Sprintf("exchange = $%d", argIndex))
		args = append(args, filter.Exchange)
		argIndex++
	}
	if filter.Symbol != "" {
		conditions = append(conditions, fmt.Sprintf("symbol = $%d", argIndex))
		args = append(args, filter.Symbol)
		argIndex++
	}
	if filter.Side != "" {
		conditions = append(conditions, fmt.Sprintf("side = $%d", argIndex))
		args = append(args, filter.Side)
		argIndex++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("trade_time >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("trade_time <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	return whereClause, args, argIndex
}

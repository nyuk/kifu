package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradePlanRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradePlanRepository(pool *pgxpool.Pool) *TradePlanRepositoryImpl {
	return &TradePlanRepositoryImpl{pool: pool}
}

func (r *TradePlanRepositoryImpl) Create(ctx context.Context, plan *entities.TradePlan) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO trade_plans (id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price, status, chat_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		plan.ID, plan.UserID, plan.AlertID, plan.Symbol, plan.Action,
		plan.Reason, plan.ReasonText, plan.StopLoss, plan.EntryPrice,
		plan.Status, plan.ChatID, plan.CreatedAt,
	)
	return err
}

func (r *TradePlanRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.TradePlan, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price,
			   status, matched_trade_id, plan_pnl_percent, chat_id, created_at, completed_at, matched_at
		FROM trade_plans WHERE id = $1`, id)
	return scanTradePlan(row)
}

func (r *TradePlanRepositoryImpl) Update(ctx context.Context, plan *entities.TradePlan) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE trade_plans SET
			action = $2, reason = $3, reason_text = $4, stop_loss = $5,
			entry_price = $6, status = $7, matched_trade_id = $8,
			plan_pnl_percent = $9, completed_at = $10, matched_at = $11
		WHERE id = $1`,
		plan.ID, plan.Action, plan.Reason, plan.ReasonText, plan.StopLoss,
		plan.EntryPrice, plan.Status, plan.MatchedTradeID,
		plan.PlanPnLPercent, plan.CompletedAt, plan.MatchedAt,
	)
	return err
}

func (r *TradePlanRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.TradePlan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price,
			   status, matched_trade_id, plan_pnl_percent, chat_id, created_at, completed_at, matched_at
		FROM trade_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*entities.TradePlan
	for rows.Next() {
		p, err := scanTradePlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *TradePlanRepositoryImpl) ListBySymbol(ctx context.Context, userID uuid.UUID, symbol string, limit int) ([]*entities.TradePlan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price,
			   status, matched_trade_id, plan_pnl_percent, chat_id, created_at, completed_at, matched_at
		FROM trade_plans WHERE user_id = $1 AND symbol = $2 ORDER BY created_at DESC LIMIT $3`, userID, symbol, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*entities.TradePlan
	for rows.Next() {
		p, err := scanTradePlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *TradePlanRepositoryImpl) ListUnmatched(ctx context.Context, limit int) ([]*entities.TradePlan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price,
			   status, matched_trade_id, plan_pnl_percent, chat_id, created_at, completed_at, matched_at
		FROM trade_plans
		WHERE status = 'complete' AND action = 'buy' AND matched_trade_id IS NULL
		ORDER BY created_at ASC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*entities.TradePlan
	for rows.Next() {
		p, err := scanTradePlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *TradePlanRepositoryImpl) ListPending(ctx context.Context) ([]*entities.TradePlan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price,
			   status, matched_trade_id, plan_pnl_percent, chat_id, created_at, completed_at, matched_at
		FROM trade_plans WHERE status = 'pending' ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*entities.TradePlan
	for rows.Next() {
		p, err := scanTradePlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *TradePlanRepositoryImpl) MatchWithTrades(ctx context.Context, limit int) ([]*repositories.PlanMatchResult, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT ON (p.id)
			p.id, p.user_id, p.alert_id, p.symbol, p.action, p.reason, p.reason_text,
			p.stop_loss, p.entry_price, p.status, p.matched_trade_id, p.plan_pnl_percent,
			p.chat_id, p.created_at, p.completed_at, p.matched_at,
			t.id AS trade_id, t.price AS trade_price
		FROM trade_plans p
		JOIN trades t ON t.user_id = p.user_id
			AND t.symbol = p.symbol
			AND t.side = 'BUY'
			AND t.trade_time >= p.created_at
			AND t.trade_time <= p.created_at + INTERVAL '24 hours'
		WHERE p.status = 'complete'
			AND p.action = 'buy'
			AND p.matched_trade_id IS NULL
		ORDER BY p.id, t.trade_time ASC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*repositories.PlanMatchResult
	for rows.Next() {
		var p entities.TradePlan
		var tradeID uuid.UUID
		var tradePrice string
		err := rows.Scan(
			&p.ID, &p.UserID, &p.AlertID, &p.Symbol, &p.Action,
			&p.Reason, &p.ReasonText, &p.StopLoss, &p.EntryPrice,
			&p.Status, &p.MatchedTradeID, &p.PlanPnLPercent,
			&p.ChatID, &p.CreatedAt, &p.CompletedAt, &p.MatchedAt,
			&tradeID, &tradePrice,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, &repositories.PlanMatchResult{
			Plan:       &p,
			TradeID:    tradeID,
			TradePrice: tradePrice,
		})
	}
	return results, nil
}

func (r *TradePlanRepositoryImpl) ExpireOld(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().UTC().Add(-olderThan)
	tag, err := r.pool.Exec(ctx, `
		UPDATE trade_plans
		SET status = 'expired', completed_at = NOW()
		WHERE status = 'complete'
			AND action = 'buy'
			AND matched_trade_id IS NULL
			AND created_at < $1`, cutoff)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *TradePlanRepositoryImpl) GetLatestByChatID(ctx context.Context, chatID int64, status entities.PlanStatus) (*entities.TradePlan, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, alert_id, symbol, action, reason, reason_text, stop_loss, entry_price,
			   status, matched_trade_id, plan_pnl_percent, chat_id, created_at, completed_at, matched_at
		FROM trade_plans WHERE chat_id = $1 AND status = $2
		ORDER BY created_at DESC LIMIT 1`, chatID, status)
	return scanTradePlan(row)
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanTradePlan(row scannable) (*entities.TradePlan, error) {
	var p entities.TradePlan
	err := row.Scan(
		&p.ID, &p.UserID, &p.AlertID, &p.Symbol, &p.Action,
		&p.Reason, &p.ReasonText, &p.StopLoss, &p.EntryPrice,
		&p.Status, &p.MatchedTradeID, &p.PlanPnLPercent,
		&p.ChatID, &p.CreatedAt, &p.CompletedAt, &p.MatchedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

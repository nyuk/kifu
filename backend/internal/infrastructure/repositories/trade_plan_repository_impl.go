package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
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

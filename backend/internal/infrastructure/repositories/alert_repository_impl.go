package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

// --- Alert ---

type AlertRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertRepository(pool *pgxpool.Pool) repositories.AlertRepository {
	return &AlertRepositoryImpl{pool: pool}
}

func (r *AlertRepositoryImpl) Create(ctx context.Context, alert *entities.Alert) error {
	query := `
		INSERT INTO alerts (id, user_id, rule_id, symbol, trigger_price, trigger_reason, severity, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.pool.Exec(ctx, query,
		alert.ID, alert.UserID, alert.RuleID, alert.Symbol,
		alert.TriggerPrice, alert.TriggerReason, alert.Severity, alert.Status, alert.CreatedAt)
	return err
}

func (r *AlertRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Alert, error) {
	query := `
		SELECT id, user_id, rule_id, symbol, trigger_price, trigger_reason, severity, status, notified_at, created_at
		FROM alerts WHERE id = $1
	`
	var a entities.Alert
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.UserID, &a.RuleID, &a.Symbol,
		&a.TriggerPrice, &a.TriggerReason, &a.Severity, &a.Status, &a.NotifiedAt, &a.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *AlertRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, status *entities.AlertStatus, limit, offset int) ([]*entities.Alert, int, error) {
	countQuery := `SELECT COUNT(*) FROM alerts WHERE user_id = $1`
	args := []interface{}{userID}
	if status != nil {
		countQuery += ` AND status = $2`
		args = append(args, *status)
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, rule_id, symbol, trigger_price, trigger_reason, severity, status, notified_at, created_at
		FROM alerts WHERE user_id = $1
	`
	queryArgs := []interface{}{userID}
	paramIdx := 2
	if status != nil {
		query += ` AND status = $2`
		queryArgs = append(queryArgs, *status)
		paramIdx = 3
	}
	query += ` ORDER BY created_at DESC LIMIT $` + itoa(paramIdx) + ` OFFSET $` + itoa(paramIdx+1)
	queryArgs = append(queryArgs, limit, offset)

	rows, err := r.pool.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var alerts []*entities.Alert
	for rows.Next() {
		var a entities.Alert
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.RuleID, &a.Symbol,
			&a.TriggerPrice, &a.TriggerReason, &a.Severity, &a.Status, &a.NotifiedAt, &a.CreatedAt); err != nil {
			return nil, 0, err
		}
		alerts = append(alerts, &a)
	}
	return alerts, total, rows.Err()
}

func (r *AlertRepositoryImpl) UpdateStatus(ctx context.Context, id uuid.UUID, status entities.AlertStatus) error {
	_, err := r.pool.Exec(ctx, `UPDATE alerts SET status = $1 WHERE id = $2`, status, id)
	return err
}

func (r *AlertRepositoryImpl) SetNotified(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE alerts SET notified_at = $1 WHERE id = $2`, time.Now().UTC(), id)
	return err
}

func (r *AlertRepositoryImpl) ExpireOlderThan(ctx context.Context, before time.Time) (int, error) {
	result, err := r.pool.Exec(ctx,
		`UPDATE alerts SET status = 'expired' WHERE status IN ('pending', 'briefed') AND created_at < $1`, before)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// --- AlertBriefing ---

type AlertBriefingRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertBriefingRepository(pool *pgxpool.Pool) repositories.AlertBriefingRepository {
	return &AlertBriefingRepositoryImpl{pool: pool}
}

func (r *AlertBriefingRepositoryImpl) Create(ctx context.Context, b *entities.AlertBriefing) error {
	query := `
		INSERT INTO alert_briefings (id, alert_id, provider, model, prompt, response, tokens_used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		b.ID, b.AlertID, b.Provider, b.Model, b.Prompt, b.Response, b.TokensUsed, b.CreatedAt)
	return err
}

func (r *AlertBriefingRepositoryImpl) ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertBriefing, error) {
	query := `
		SELECT id, alert_id, provider, model, prompt, response, tokens_used, created_at
		FROM alert_briefings WHERE alert_id = $1 ORDER BY created_at
	`
	rows, err := r.pool.Query(ctx, query, alertID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var briefings []*entities.AlertBriefing
	for rows.Next() {
		var b entities.AlertBriefing
		if err := rows.Scan(&b.ID, &b.AlertID, &b.Provider, &b.Model, &b.Prompt, &b.Response, &b.TokensUsed, &b.CreatedAt); err != nil {
			return nil, err
		}
		briefings = append(briefings, &b)
	}
	return briefings, rows.Err()
}

// --- AlertDecision ---

type AlertDecisionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertDecisionRepository(pool *pgxpool.Pool) repositories.AlertDecisionRepository {
	return &AlertDecisionRepositoryImpl{pool: pool}
}

func (r *AlertDecisionRepositoryImpl) Create(ctx context.Context, d *entities.AlertDecision) error {
	query := `
		INSERT INTO alert_decisions (id, alert_id, user_id, action, memo, confidence, executed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		d.ID, d.AlertID, d.UserID, d.Action, d.Memo, d.Confidence, d.ExecutedAt, d.CreatedAt)
	return err
}

func (r *AlertDecisionRepositoryImpl) GetByAlert(ctx context.Context, alertID uuid.UUID) (*entities.AlertDecision, error) {
	query := `
		SELECT id, alert_id, user_id, action, memo, confidence, executed_at, created_at
		FROM alert_decisions WHERE alert_id = $1
	`
	var d entities.AlertDecision
	err := r.pool.QueryRow(ctx, query, alertID).Scan(
		&d.ID, &d.AlertID, &d.UserID, &d.Action, &d.Memo, &d.Confidence, &d.ExecutedAt, &d.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// --- AlertOutcome ---

type AlertOutcomeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertOutcomeRepository(pool *pgxpool.Pool) repositories.AlertOutcomeRepository {
	return &AlertOutcomeRepositoryImpl{pool: pool}
}

func (r *AlertOutcomeRepositoryImpl) CreateIfNotExists(ctx context.Context, o *entities.AlertOutcome) (bool, error) {
	query := `
		INSERT INTO alert_outcomes (id, alert_id, decision_id, period, reference_price, outcome_price, pnl_percent, calculated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (alert_id, period) DO NOTHING
	`
	result, err := r.pool.Exec(ctx, query,
		o.ID, o.AlertID, o.DecisionID, o.Period, o.ReferencePrice, o.OutcomePrice, o.PnLPercent, o.CalculatedAt)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (r *AlertOutcomeRepositoryImpl) ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertOutcome, error) {
	query := `
		SELECT id, alert_id, decision_id, period, reference_price, outcome_price, pnl_percent, calculated_at
		FROM alert_outcomes WHERE alert_id = $1 ORDER BY period
	`
	rows, err := r.pool.Query(ctx, query, alertID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.AlertOutcome
	for rows.Next() {
		var o entities.AlertOutcome
		if err := rows.Scan(&o.ID, &o.AlertID, &o.DecisionID, &o.Period,
			&o.ReferencePrice, &o.OutcomePrice, &o.PnLPercent, &o.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &o)
	}
	return outcomes, rows.Err()
}

func (r *AlertOutcomeRepositoryImpl) ListPendingDecisions(ctx context.Context, period string, cutoff time.Time, limit int) ([]*repositories.PendingAlertDecision, error) {
	query := `
		SELECT a.id, d.id, a.symbol, a.trigger_price, d.created_at
		FROM alerts a
		JOIN alert_decisions d ON d.alert_id = a.id
		LEFT JOIN alert_outcomes o ON o.alert_id = a.id AND o.period = $1
		WHERE a.status = 'decided' AND o.id IS NULL AND d.created_at <= $2
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, period, cutoff, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []*repositories.PendingAlertDecision
	for rows.Next() {
		var p repositories.PendingAlertDecision
		if err := rows.Scan(&p.AlertID, &p.DecisionID, &p.Symbol, &p.TriggerPrice, &p.DecisionTime); err != nil {
			return nil, err
		}
		pending = append(pending, &p)
	}
	return pending, rows.Err()
}

func itoa(n int) string {
	return fmt.Sprintf("%d", n)
}

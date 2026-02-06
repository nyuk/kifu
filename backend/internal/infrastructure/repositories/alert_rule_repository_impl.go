package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertRuleRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertRuleRepository(pool *pgxpool.Pool) repositories.AlertRuleRepository {
	return &AlertRuleRepositoryImpl{pool: pool}
}

func (r *AlertRuleRepositoryImpl) Create(ctx context.Context, rule *entities.AlertRule) error {
	query := `
		INSERT INTO alert_rules (id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	rule.ID = uuid.New()
	now := time.Now().UTC()
	rule.CreatedAt = now
	rule.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		rule.ID, rule.UserID, rule.Name, rule.Symbol, rule.RuleType,
		rule.Config, rule.CooldownMinutes, rule.Enabled, rule.CreatedAt, rule.UpdatedAt)
	return err
}

func (r *AlertRuleRepositoryImpl) Update(ctx context.Context, rule *entities.AlertRule) error {
	query := `
		UPDATE alert_rules
		SET name = $1, symbol = $2, rule_type = $3, config = $4, cooldown_minutes = $5, enabled = $6, updated_at = $7
		WHERE id = $8 AND user_id = $9
	`
	rule.UpdatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx, query,
		rule.Name, rule.Symbol, rule.RuleType, rule.Config,
		rule.CooldownMinutes, rule.Enabled, rule.UpdatedAt, rule.ID, rule.UserID)
	return err
}

func (r *AlertRuleRepositoryImpl) Delete(ctx context.Context, id, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM alert_rules WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *AlertRuleRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE id = $1
	`
	return r.scanRule(r.pool.QueryRow(ctx, query, id))
}

func (r *AlertRuleRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE user_id = $1 ORDER BY created_at DESC
	`
	return r.scanRules(ctx, query, userID)
}

func (r *AlertRuleRepositoryImpl) ListActiveBySymbol(ctx context.Context, symbol string) ([]*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE symbol = $1 AND enabled = true
	`
	return r.scanRules(ctx, query, symbol)
}

func (r *AlertRuleRepositoryImpl) ListAllActive(ctx context.Context) ([]*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE enabled = true
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*entities.AlertRule
	for rows.Next() {
		rule, err := r.scanRuleFromRows(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *AlertRuleRepositoryImpl) SetEnabled(ctx context.Context, id, userID uuid.UUID, enabled bool) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE alert_rules SET enabled = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`,
		enabled, time.Now().UTC(), id, userID)
	return err
}

func (r *AlertRuleRepositoryImpl) UpdateLastTriggered(ctx context.Context, id uuid.UUID, checkState []byte) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE alert_rules SET last_triggered_at = $1, last_check_state = $2 WHERE id = $3`,
		time.Now().UTC(), checkState, id)
	return err
}

func (r *AlertRuleRepositoryImpl) UpdateCheckState(ctx context.Context, id uuid.UUID, checkState []byte) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE alert_rules SET last_check_state = $1 WHERE id = $2`,
		checkState, id)
	return err
}

func (r *AlertRuleRepositoryImpl) scanRules(ctx context.Context, query string, args ...interface{}) ([]*entities.AlertRule, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*entities.AlertRule
	for rows.Next() {
		rule, err := r.scanRuleFromRows(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *AlertRuleRepositoryImpl) scanRuleFromRows(rows pgx.Rows) (*entities.AlertRule, error) {
	var rule entities.AlertRule
	err := rows.Scan(
		&rule.ID, &rule.UserID, &rule.Name, &rule.Symbol, &rule.RuleType,
		&rule.Config, &rule.CooldownMinutes, &rule.Enabled,
		&rule.LastTriggeredAt, &rule.LastCheckState, &rule.CreatedAt, &rule.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &rule, nil
}

func (r *AlertRuleRepositoryImpl) scanRule(row pgx.Row) (*entities.AlertRule, error) {
	var rule entities.AlertRule
	err := row.Scan(
		&rule.ID, &rule.UserID, &rule.Name, &rule.Symbol, &rule.RuleType,
		&rule.Config, &rule.CooldownMinutes, &rule.Enabled,
		&rule.LastTriggeredAt, &rule.LastCheckState, &rule.CreatedAt, &rule.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &rule, nil
}

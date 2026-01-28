package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type SubscriptionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewSubscriptionRepository(pool *pgxpool.Pool) repositories.SubscriptionRepository {
	return &SubscriptionRepositoryImpl{pool: pool}
}

func (r *SubscriptionRepositoryImpl) Create(ctx context.Context, sub *entities.Subscription) error {
	query := `
		INSERT INTO subscriptions (id, user_id, tier, ai_quota_remaining, last_reset_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.pool.Exec(ctx, query,
		sub.ID, sub.UserID, sub.Tier, sub.AIQuotaRemaining, sub.LastResetAt, sub.ExpiresAt)
	return err
}

func (r *SubscriptionRepositoryImpl) GetByUserID(ctx context.Context, userID uuid.UUID) (*entities.Subscription, error) {
	query := `
		SELECT id, user_id, tier, ai_quota_remaining, last_reset_at, expires_at
		FROM subscriptions
		WHERE user_id = $1
	`
	var sub entities.Subscription
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&sub.ID, &sub.UserID, &sub.Tier, &sub.AIQuotaRemaining, &sub.LastResetAt, &sub.ExpiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &sub, nil
}

func (r *SubscriptionRepositoryImpl) ListAll(ctx context.Context) ([]*entities.Subscription, error) {
	query := `
		SELECT id, user_id, tier, ai_quota_remaining, last_reset_at, expires_at
		FROM subscriptions
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []*entities.Subscription
	for rows.Next() {
		var sub entities.Subscription
		err := rows.Scan(&sub.ID, &sub.UserID, &sub.Tier, &sub.AIQuotaRemaining, &sub.LastResetAt, &sub.ExpiresAt)
		if err != nil {
			return nil, err
		}
		subs = append(subs, &sub)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return subs, nil
}

func (r *SubscriptionRepositoryImpl) Update(ctx context.Context, sub *entities.Subscription) error {
	query := `
		UPDATE subscriptions
		SET tier = $2, ai_quota_remaining = $3, last_reset_at = $4, expires_at = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		sub.ID, sub.Tier, sub.AIQuotaRemaining, sub.LastResetAt, sub.ExpiresAt)
	return err
}

func (r *SubscriptionRepositoryImpl) DecrementQuota(ctx context.Context, userID uuid.UUID, amount int) (bool, error) {
	query := `
		UPDATE subscriptions
		SET ai_quota_remaining = ai_quota_remaining - $2
		WHERE user_id = $1 AND ai_quota_remaining >= $2
	`
	result, err := r.pool.Exec(ctx, query, userID, amount)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (r *SubscriptionRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM subscriptions WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

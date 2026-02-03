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

type UserAIKeyRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserAIKeyRepository(pool *pgxpool.Pool) repositories.UserAIKeyRepository {
	return &UserAIKeyRepositoryImpl{pool: pool}
}

func (r *UserAIKeyRepositoryImpl) Upsert(ctx context.Context, key *entities.UserAIKey) error {
	query := `
        INSERT INTO user_ai_keys (id, user_id, provider, api_key_enc, api_key_last4, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET api_key_enc = EXCLUDED.api_key_enc, api_key_last4 = EXCLUDED.api_key_last4, created_at = EXCLUDED.created_at
    `
	_, err := r.pool.Exec(ctx, query,
		key.ID, key.UserID, key.Provider, key.APIKeyEnc, key.APIKeyLast4, key.CreatedAt)
	return err
}

func (r *UserAIKeyRepositoryImpl) GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (*entities.UserAIKey, error) {
	query := `
        SELECT id, user_id, provider, api_key_enc, api_key_last4, created_at
        FROM user_ai_keys
        WHERE user_id = $1 AND provider = $2
    `
	var key entities.UserAIKey
	err := r.pool.QueryRow(ctx, query, userID, provider).Scan(
		&key.ID, &key.UserID, &key.Provider, &key.APIKeyEnc, &key.APIKeyLast4, &key.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &key, nil
}

func (r *UserAIKeyRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserAIKey, error) {
	query := `
        SELECT id, user_id, provider, api_key_enc, api_key_last4, created_at
        FROM user_ai_keys
        WHERE user_id = $1
        ORDER BY provider ASC
    `
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*entities.UserAIKey
	for rows.Next() {
		var key entities.UserAIKey
		if err := rows.Scan(&key.ID, &key.UserID, &key.Provider, &key.APIKeyEnc, &key.APIKeyLast4, &key.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, &key)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return keys, nil
}

func (r *UserAIKeyRepositoryImpl) DeleteByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (bool, error) {
	query := `DELETE FROM user_ai_keys WHERE user_id = $1 AND provider = $2`
	result, err := r.pool.Exec(ctx, query, userID, provider)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

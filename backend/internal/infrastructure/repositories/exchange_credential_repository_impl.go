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

type ExchangeCredentialRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewExchangeCredentialRepository(pool *pgxpool.Pool) repositories.ExchangeCredentialRepository {
	return &ExchangeCredentialRepositoryImpl{pool: pool}
}

func (r *ExchangeCredentialRepositoryImpl) Create(ctx context.Context, cred *entities.ExchangeCredential) error {
	query := `
		INSERT INTO exchange_credentials (id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		cred.ID, cred.UserID, cred.Exchange, cred.APIKeyEnc, cred.APISecretEnc, cred.APIKeyLast4, cred.IsValid, cred.CreatedAt)
	return err
}

func (r *ExchangeCredentialRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE id = $1
	`
	var cred entities.ExchangeCredential
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyEnc, &cred.APISecretEnc, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cred, nil
}

func (r *ExchangeCredentialRepositoryImpl) GetByUserAndExchange(ctx context.Context, userID uuid.UUID, exchange string) (*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE user_id = $1 AND exchange = $2
	`
	var cred entities.ExchangeCredential
	err := r.pool.QueryRow(ctx, query, userID, exchange).Scan(
		&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyEnc, &cred.APISecretEnc, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cred, nil
}

func (r *ExchangeCredentialRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []*entities.ExchangeCredential
	for rows.Next() {
		var cred entities.ExchangeCredential
		err := rows.Scan(
			&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
		if err != nil {
			return nil, err
		}
		creds = append(creds, &cred)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return creds, nil
}

func (r *ExchangeCredentialRepositoryImpl) ListValid(ctx context.Context, exchange string) ([]*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE exchange = $1 AND is_valid = true
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, exchange)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []*entities.ExchangeCredential
	for rows.Next() {
		var cred entities.ExchangeCredential
		err := rows.Scan(
			&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyEnc, &cred.APISecretEnc, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
		if err != nil {
			return nil, err
		}
		creds = append(creds, &cred)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return creds, nil
}

func (r *ExchangeCredentialRepositoryImpl) Update(ctx context.Context, cred *entities.ExchangeCredential) error {
	query := `
		UPDATE exchange_credentials
		SET api_key_enc = $2, api_secret_enc = $3, api_key_last4 = $4, is_valid = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		cred.ID, cred.APIKeyEnc, cred.APISecretEnc, cred.APIKeyLast4, cred.IsValid)
	return err
}

func (r *ExchangeCredentialRepositoryImpl) DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error) {
	query := `DELETE FROM exchange_credentials WHERE id = $1 AND user_id = $2`
	commandTag, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return false, err
	}
	return commandTag.RowsAffected() > 0, nil
}

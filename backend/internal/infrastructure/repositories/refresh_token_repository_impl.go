package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type RefreshTokenRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewRefreshTokenRepository(pool *pgxpool.Pool) repositories.RefreshTokenRepository {
	return &RefreshTokenRepositoryImpl{pool: pool}
}

func (r *RefreshTokenRepositoryImpl) Create(ctx context.Context, token *entities.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, last_used_at, replaced_by, revoked_reason)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.pool.Exec(ctx, query,
		token.ID, token.UserID, token.TokenHash, token.ExpiresAt, token.CreatedAt,
		token.RevokedAt, token.LastUsedAt, token.ReplacedBy, token.RevokedReason)
	return err
}

func (r *RefreshTokenRepositoryImpl) GetByTokenHash(ctx context.Context, tokenHash string) (*entities.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, last_used_at, replaced_by, revoked_reason
		FROM refresh_tokens
		WHERE token_hash = $1
	`
	var token entities.RefreshToken
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.CreatedAt,
		&token.RevokedAt, &token.LastUsedAt, &token.ReplacedBy, &token.RevokedReason)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

func (r *RefreshTokenRepositoryImpl) Update(ctx context.Context, token *entities.RefreshToken) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = $2, last_used_at = $3, replaced_by = $4, revoked_reason = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		token.ID, token.RevokedAt, token.LastUsedAt, token.ReplacedBy, token.RevokedReason)
	return err
}

func (r *RefreshTokenRepositoryImpl) RevokeAllUserTokens(ctx context.Context, userID uuid.UUID, reason string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = $2, revoked_reason = $3
		WHERE user_id = $1 AND revoked_at IS NULL
	`
	now := time.Now()
	_, err := r.pool.Exec(ctx, query, userID, now, reason)
	return err
}

func (r *RefreshTokenRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

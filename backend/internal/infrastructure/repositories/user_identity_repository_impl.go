package repositories

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserIdentityRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserIdentityRepository(pool *pgxpool.Pool) domainrepos.UserIdentityRepository {
	return &UserIdentityRepositoryImpl{pool: pool}
}

func (r *UserIdentityRepositoryImpl) Create(ctx context.Context, identity *entities.UserIdentity) error {
	if identity.ID == uuid.Nil {
		identity.ID = uuid.New()
	}
	now := time.Now().UTC()
	if identity.CreatedAt.IsZero() {
		identity.CreatedAt = now
	}
	if identity.UpdatedAt.IsZero() {
		identity.UpdatedAt = identity.CreatedAt
	}
	identity.Provider = strings.ToLower(strings.TrimSpace(identity.Provider))
	identity.ProviderUserID = strings.TrimSpace(identity.ProviderUserID)
	if identity.Email != nil {
		email := strings.ToLower(strings.TrimSpace(*identity.Email))
		identity.Email = &email
	}

	query := `
		INSERT INTO user_identities (id, user_id, provider, provider_user_id, email, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.pool.Exec(ctx, query,
		identity.ID,
		identity.UserID,
		identity.Provider,
		identity.ProviderUserID,
		identity.Email,
		identity.CreatedAt,
		identity.UpdatedAt,
	)
	return err
}

func (r *UserIdentityRepositoryImpl) GetByProviderUserID(ctx context.Context, provider string, providerUserID string) (*entities.UserIdentity, error) {
	query := `
		SELECT id, user_id, provider, provider_user_id, email, created_at, updated_at
		FROM user_identities
		WHERE provider = $1 AND provider_user_id = $2
	`
	var identity entities.UserIdentity
	err := r.pool.QueryRow(ctx, query, strings.ToLower(strings.TrimSpace(provider)), strings.TrimSpace(providerUserID)).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.Email,
		&identity.CreatedAt,
		&identity.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &identity, nil
}

func (r *UserIdentityRepositoryImpl) GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (*entities.UserIdentity, error) {
	query := `
		SELECT id, user_id, provider, provider_user_id, email, created_at, updated_at
		FROM user_identities
		WHERE user_id = $1 AND provider = $2
	`
	var identity entities.UserIdentity
	err := r.pool.QueryRow(ctx, query, userID, strings.ToLower(strings.TrimSpace(provider))).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.Email,
		&identity.CreatedAt,
		&identity.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &identity, nil
}

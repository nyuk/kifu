package repositories

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AIProviderRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAIProviderRepository(pool *pgxpool.Pool) repositories.AIProviderRepository {
	return &AIProviderRepositoryImpl{pool: pool}
}

func (r *AIProviderRepositoryImpl) ListEnabled(ctx context.Context) ([]*entities.AIProvider, error) {
	query := `
        SELECT id, name, model, enabled, is_default, created_at,
               provider_type, base_url, default_endpoint, timeout_seconds, retry_policy, responses_api_enabled
        FROM ai_providers
        WHERE enabled = true
        ORDER BY name ASC
    `
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []*entities.AIProvider
	for rows.Next() {
		var provider entities.AIProvider
		var retryPolicyJSON []byte
		err := rows.Scan(
			&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt,
			&provider.ProviderType, &provider.BaseURL, &provider.DefaultEndpoint, &provider.TimeoutSeconds, &retryPolicyJSON, &provider.ResponsesAPIEnabled,
		)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(retryPolicyJSON, &provider.RetryPolicy); err != nil {
			return nil, err
		}
		providers = append(providers, &provider)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return providers, nil
}

func (r *AIProviderRepositoryImpl) GetByName(ctx context.Context, name string) (*entities.AIProvider, error) {
	query := `
        SELECT id, name, model, enabled, is_default, created_at,
               provider_type, base_url, default_endpoint, timeout_seconds, retry_policy, responses_api_enabled
        FROM ai_providers
        WHERE name = $1
    `
	var provider entities.AIProvider
	var retryPolicyJSON []byte
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt,
		&provider.ProviderType, &provider.BaseURL, &provider.DefaultEndpoint, &provider.TimeoutSeconds, &retryPolicyJSON, &provider.ResponsesAPIEnabled,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(retryPolicyJSON, &provider.RetryPolicy); err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *AIProviderRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.AIProvider, error) {
	query := `
        SELECT id, name, model, enabled, is_default, created_at,
               provider_type, base_url, default_endpoint, timeout_seconds, retry_policy, responses_api_enabled
        FROM ai_providers
        WHERE id = $1
    `
	var provider entities.AIProvider
	var retryPolicyJSON []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt,
		&provider.ProviderType, &provider.BaseURL, &provider.DefaultEndpoint, &provider.TimeoutSeconds, &retryPolicyJSON, &provider.ResponsesAPIEnabled,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(retryPolicyJSON, &provider.RetryPolicy); err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *AIProviderRepositoryImpl) GetDefault(ctx context.Context) (*entities.AIProvider, error) {
	query := `
        SELECT id, name, model, enabled, is_default, created_at,
               provider_type, base_url, default_endpoint, timeout_seconds, retry_policy, responses_api_enabled
        FROM ai_providers
        WHERE is_default = true AND enabled = true
        LIMIT 1
    `
	var provider entities.AIProvider
	var retryPolicyJSON []byte
	err := r.pool.QueryRow(ctx, query).Scan(
		&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt,
		&provider.ProviderType, &provider.BaseURL, &provider.DefaultEndpoint, &provider.TimeoutSeconds, &retryPolicyJSON, &provider.ResponsesAPIEnabled,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(retryPolicyJSON, &provider.RetryPolicy); err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *AIProviderRepositoryImpl) ListActive(ctx context.Context) ([]*entities.AIProvider, error) {
	return r.ListEnabled(ctx)
}

func (r *AIProviderRepositoryImpl) ValidatePolicy(ctx context.Context, userID uuid.UUID, providerName string) (bool, error) {
	// For now, all enabled providers are allowed for all users
	// This can be extended to check user-specific allowlists or policies
	provider, err := r.GetByName(ctx, providerName)
	if err != nil {
		return false, err
	}
	if provider == nil {
		return false, nil
	}
	return provider.Enabled, nil
}

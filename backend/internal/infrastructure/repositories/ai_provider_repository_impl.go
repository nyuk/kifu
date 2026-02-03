package repositories

import (
	"context"
	"errors"

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
        SELECT id, name, model, enabled, is_default, created_at
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
		err := rows.Scan(&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt)
		if err != nil {
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
        SELECT id, name, model, enabled, is_default, created_at
        FROM ai_providers
        WHERE name = $1
    `
	var provider entities.AIProvider
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &provider, nil
}

package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AIOpinionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAIOpinionRepository(pool *pgxpool.Pool) repositories.AIOpinionRepository {
	return &AIOpinionRepositoryImpl{pool: pool}
}

func (r *AIOpinionRepositoryImpl) Create(ctx context.Context, opinion *entities.AIOpinion) error {
	query := `
        INSERT INTO ai_opinions (id, bubble_id, provider, model, prompt_template, response, tokens_used, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
	_, err := r.pool.Exec(ctx, query,
		opinion.ID, opinion.BubbleID, opinion.Provider, opinion.Model, opinion.PromptTemplate, opinion.Response, opinion.TokensUsed, opinion.CreatedAt)
	return err
}

func (r *AIOpinionRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinion, error) {
	query := `
        SELECT id, bubble_id, provider, model, prompt_template, response, tokens_used, created_at
        FROM ai_opinions
        WHERE bubble_id = $1
        ORDER BY created_at DESC
    `
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var opinions []*entities.AIOpinion
	for rows.Next() {
		var opinion entities.AIOpinion
		if err := rows.Scan(
			&opinion.ID, &opinion.BubbleID, &opinion.Provider, &opinion.Model, &opinion.PromptTemplate, &opinion.Response, &opinion.TokensUsed, &opinion.CreatedAt); err != nil {
			return nil, err
		}
		opinions = append(opinions, &opinion)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return opinions, nil
}

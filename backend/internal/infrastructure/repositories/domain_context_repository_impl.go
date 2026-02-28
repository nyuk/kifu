package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
)

type DomainContextRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewDomainContextRepository(pool *pgxpool.Pool) domainrepos.DomainContextRepository {
	return &DomainContextRepositoryImpl{pool: pool}
}

func (r *DomainContextRepositoryImpl) Create(ctx context.Context, dc *entities.DomainContext) (*entities.DomainContext, error) {
	now := time.Now().UTC()
	created := &entities.DomainContext{
		ID:        uuid.New(),
		Scope:     dc.Scope,
		Domain:    dc.Domain,
		Version:   dc.Version,
		OwnerID:   dc.OwnerID,
		Context:   append([]byte(nil), dc.Context...),
		CreatedAt: now,
		UpdatedAt: now,
	}

	if created.Context == nil {
		created.Context = []byte("{}")
	}

	query := `
		INSERT INTO domain_contexts (id, scope, domain, version, owner_id, context, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.pool.Exec(ctx, query,
		created.ID,
		created.Scope,
		created.Domain,
		created.Version,
		created.OwnerID,
		created.Context,
		created.CreatedAt,
		created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return created, nil
}

func (r *DomainContextRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.DomainContext, error) {
	query := `
		SELECT id, scope, domain, version, owner_id, context, created_at, updated_at
		FROM domain_contexts
		WHERE id = $1
	`

	var dc entities.DomainContext
	var contextData json.RawMessage
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&dc.ID,
		&dc.Scope,
		&dc.Domain,
		&dc.Version,
		&dc.OwnerID,
		&contextData,
		&dc.CreatedAt,
		&dc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	dc.Context = append([]byte(nil), contextData...)
	return &dc, nil
}

func (r *DomainContextRepositoryImpl) ListByScope(ctx context.Context, ownerID uuid.UUID, scope string) ([]*entities.DomainContext, error) {
	query := `
		SELECT id, scope, domain, version, owner_id, context, created_at, updated_at
		FROM domain_contexts
		WHERE owner_id = $1 AND scope = $2
		ORDER BY updated_at DESC, created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, ownerID, scope)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	contexts := make([]*entities.DomainContext, 0)
	for rows.Next() {
		var dc entities.DomainContext
		var contextData json.RawMessage
		if err := rows.Scan(
			&dc.ID,
			&dc.Scope,
			&dc.Domain,
			&dc.Version,
			&dc.OwnerID,
			&contextData,
			&dc.CreatedAt,
			&dc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		dc.Context = append([]byte(nil), contextData...)
		contexts = append(contexts, &dc)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return contexts, nil
}

func (r *DomainContextRepositoryImpl) Update(ctx context.Context, id uuid.UUID, ownerID uuid.UUID, contextData json.RawMessage) error {
	if contextData == nil {
		contextData = []byte("{}")
	}

	query := `
		UPDATE domain_contexts
		SET context = $1, updated_at = $2
		WHERE id = $3 AND owner_id = $4
	`

	_, err := r.pool.Exec(ctx, query, contextData, time.Now().UTC(), id, ownerID)
	return err
}

func (r *DomainContextRepositoryImpl) Delete(ctx context.Context, id uuid.UUID, ownerID uuid.UUID) error {
	query := `
		DELETE FROM domain_contexts
		WHERE id = $1 AND owner_id = $2
	`

	_, err := r.pool.Exec(ctx, query, id, ownerID)
	return err
}

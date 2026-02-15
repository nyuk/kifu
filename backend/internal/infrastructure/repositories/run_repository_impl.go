package repositories

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type RunRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewRunRepository(pool *pgxpool.Pool) repositories.RunRepository {
	return &RunRepositoryImpl{pool: pool}
}

func (r *RunRepositoryImpl) Create(
	ctx context.Context,
	userID uuid.UUID,
	runType string,
	status string,
	startedAt time.Time,
	meta json.RawMessage,
) (*entities.Run, error) {
	run := &entities.Run{
		RunID:     uuid.New(),
		UserID:    userID,
		RunType:   runType,
		Status:    status,
		StartedAt: startedAt,
		Meta:      meta,
	}

	query := `
		INSERT INTO runs (run_id, user_id, run_type, status, started_at, meta)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.pool.Exec(ctx, query,
		run.RunID, run.UserID, run.RunType, run.Status, run.StartedAt, run.Meta)
	if err != nil {
		return nil, err
	}
	return run, nil
}

func (r *RunRepositoryImpl) GetByID(ctx context.Context, userID uuid.UUID, runID uuid.UUID) (*entities.Run, error) {
	query := `
		SELECT run_id, user_id, run_type, status, started_at, finished_at, meta, created_at
		FROM runs
		WHERE run_id = $1 AND user_id = $2
	`
	var run entities.Run
	err := r.pool.QueryRow(ctx, query, runID, userID).Scan(
		&run.RunID, &run.UserID, &run.RunType, &run.Status, &run.StartedAt, &run.FinishedAt, &run.Meta, &run.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &run, nil
}

func (r *RunRepositoryImpl) UpdateStatus(ctx context.Context, runID uuid.UUID, status string, finishedAt *time.Time, meta json.RawMessage) error {
	if meta == nil {
		meta = []byte("{}")
	}
	if finishedAt == nil {
		query := `
			UPDATE runs
			SET status = $1, meta = $2
			WHERE run_id = $3
		`
		_, err := r.pool.Exec(ctx, query, status, meta, runID)
		return err
	}

	query := `
		UPDATE runs
		SET status = $1, finished_at = $2, meta = $3
		WHERE run_id = $4
	`
	_, err := r.pool.Exec(ctx, query, status, *finishedAt, meta, runID)
	return err
}

func (r *RunRepositoryImpl) GetLatestCompletedRun(ctx context.Context, userID uuid.UUID) (*entities.Run, error) {
	query := `
		SELECT run_id, user_id, run_type, status, started_at, finished_at, meta, created_at
		FROM runs
		WHERE user_id = $1
		  AND status = 'completed'
		  AND run_type IN ('exchange_sync', 'trade_csv_import', 'portfolio_csv_import')
		ORDER BY finished_at DESC NULLS LAST, started_at DESC
		LIMIT 1
	`

	var run entities.Run
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&run.RunID, &run.UserID, &run.RunType, &run.Status, &run.StartedAt, &run.FinishedAt, &run.Meta, &run.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &run, nil
}

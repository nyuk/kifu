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

type SummaryPackRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewSummaryPackRepository(pool *pgxpool.Pool) repositories.SummaryPackRepository {
	return &SummaryPackRepositoryImpl{pool: pool}
}

func (r *SummaryPackRepositoryImpl) Create(ctx context.Context, pack *entities.SummaryPack) error {
	query := `
		INSERT INTO summary_packs (
			pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash,
			reconciliation_status, missing_suspects_count, duplicate_suspects_count, normalization_warnings, payload
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.pool.Exec(ctx, query,
		pack.PackID,
		pack.UserID,
		pack.SourceRunID,
		pack.Range,
		pack.SchemaVersion,
		pack.CalcVersion,
		pack.ContentHash,
		pack.ReconciliationStatus,
		pack.MissingSuspectsCount,
		pack.DuplicateSuspectsCount,
		pack.NormalizationWarnings,
		pack.Payload,
	)
	return err
}

func (r *SummaryPackRepositoryImpl) GetByID(ctx context.Context, userID uuid.UUID, packID uuid.UUID) (*entities.SummaryPack, error) {
	query := `
		SELECT pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash,
			reconciliation_status, missing_suspects_count, duplicate_suspects_count, normalization_warnings, payload, created_at
		FROM summary_packs
		WHERE pack_id = $1 AND user_id = $2
	`
	var row entities.SummaryPack
	var payload json.RawMessage
	err := r.pool.QueryRow(ctx, query, packID, userID).Scan(
		&row.PackID,
		&row.UserID,
		&row.SourceRunID,
		&row.Range,
		&row.SchemaVersion,
		&row.CalcVersion,
		&row.ContentHash,
		&row.ReconciliationStatus,
		&row.MissingSuspectsCount,
		&row.DuplicateSuspectsCount,
		&row.NormalizationWarnings,
		&payload,
		&row.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	row.Payload = append([]byte(nil), payload...)
	return &row, nil
}

func (r *SummaryPackRepositoryImpl) GetLatest(ctx context.Context, userID uuid.UUID, rangeValue string) (*entities.SummaryPack, error) {
	query := `
		SELECT pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash,
			reconciliation_status, missing_suspects_count, duplicate_suspects_count, normalization_warnings, payload, created_at
		FROM summary_packs
		WHERE user_id = $1 AND range = $2
		ORDER BY created_at DESC
		LIMIT 1
	`
	var row entities.SummaryPack
	var payload json.RawMessage
	err := r.pool.QueryRow(ctx, query, userID, rangeValue).Scan(
		&row.PackID,
		&row.UserID,
		&row.SourceRunID,
		&row.Range,
		&row.SchemaVersion,
		&row.CalcVersion,
		&row.ContentHash,
		&row.ReconciliationStatus,
		&row.MissingSuspectsCount,
		&row.DuplicateSuspectsCount,
		&row.NormalizationWarnings,
		&payload,
		&row.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	row.Payload = append([]byte(nil), payload...)
	return &row, nil
}

func NormalizeNoRows(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return pgx.ErrNoRows
	}
	return err
}

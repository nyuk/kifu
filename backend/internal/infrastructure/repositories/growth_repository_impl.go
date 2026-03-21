package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
)

type GrowthRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewGrowthRepository(pool *pgxpool.Pool) domainrepos.GrowthRepository {
	return &GrowthRepositoryImpl{pool: pool}
}

func (r *GrowthRepositoryImpl) CreateFunnelEvent(ctx context.Context, event *entities.GrowthFunnelEvent) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO growth_funnel_events (
			id, user_id, guest_session_id, event_name, source_path, referrer, metadata, occurred_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		event.ID,
		event.UserID,
		event.GuestSessionID,
		event.EventName,
		event.SourcePath,
		event.Referrer,
		event.Metadata,
		event.OccurredAt,
		event.CreatedAt,
	)
	return err
}

func (r *GrowthRepositoryImpl) HasUserEvent(ctx context.Context, userID uuid.UUID, eventName string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM growth_funnel_events
			WHERE user_id = $1 AND event_name = $2
		)
	`, userID, eventName).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func (r *GrowthRepositoryImpl) CountFunnelEventsByRange(ctx context.Context, from, to time.Time) ([]domainrepos.GrowthDailyReportSummary, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT event_name, COUNT(*)::int
		FROM growth_funnel_events
		WHERE occurred_at >= $1 AND occurred_at < $2
		GROUP BY event_name
		ORDER BY event_name
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domainrepos.GrowthDailyReportSummary, 0)
	for rows.Next() {
		var item domainrepos.GrowthDailyReportSummary
		if err := rows.Scan(&item.EventName, &item.Count); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *GrowthRepositoryImpl) CreateFeedbackItem(ctx context.Context, item *entities.GrowthFeedbackItem) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO growth_feedback_items (
			id, product_key, source_type, bucket, title, body, source_url, metadata, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		item.ID,
		item.ProductKey,
		item.SourceType,
		item.Bucket,
		item.Title,
		item.Body,
		item.SourceURL,
		item.Metadata,
		item.CreatedBy,
		item.CreatedAt,
		item.UpdatedAt,
	)
	return err
}

func (r *GrowthRepositoryImpl) ListFeedbackByBucket(ctx context.Context, productKey, bucket string, limit int) ([]*entities.GrowthFeedbackItem, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, product_key, source_type, bucket, title, body, source_url, metadata, created_by, created_at, updated_at
		FROM growth_feedback_items
		WHERE product_key = $1 AND bucket = $2
		ORDER BY updated_at DESC
		LIMIT $3
	`, productKey, bucket, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*entities.GrowthFeedbackItem, 0)
	for rows.Next() {
		var (
			item      entities.GrowthFeedbackItem
			sourceURL *string
			createdBy *uuid.UUID
		)
		if err := rows.Scan(
			&item.ID,
			&item.ProductKey,
			&item.SourceType,
			&item.Bucket,
			&item.Title,
			&item.Body,
			&sourceURL,
			&item.Metadata,
			&createdBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.SourceURL = sourceURL
		item.CreatedBy = createdBy
		items = append(items, &item)
	}
	return items, rows.Err()
}

func (r *GrowthRepositoryImpl) CreateDailyReport(ctx context.Context, report *entities.GrowthDailyReport) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO growth_daily_reports (
			id, report_date, status, payload, content_drafts_count, issues_count, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (report_date)
		DO UPDATE SET
			status = EXCLUDED.status,
			payload = EXCLUDED.payload,
			content_drafts_count = EXCLUDED.content_drafts_count,
			issues_count = EXCLUDED.issues_count,
			updated_at = EXCLUDED.updated_at
	`,
		report.ID,
		report.ReportDate,
		report.Status,
		report.Payload,
		report.ContentDraftsCount,
		report.IssuesCount,
		report.CreatedAt,
		report.UpdatedAt,
	)
	return err
}

func (r *GrowthRepositoryImpl) GetDailyReportByDate(ctx context.Context, reportDate time.Time) (*entities.GrowthDailyReport, error) {
	var item entities.GrowthDailyReport
	err := r.pool.QueryRow(ctx, `
		SELECT id, report_date, status, payload, content_drafts_count, issues_count, created_at, updated_at
		FROM growth_daily_reports
		WHERE report_date = $1
	`, reportDate).Scan(
		&item.ID,
		&item.ReportDate,
		&item.Status,
		&item.Payload,
		&item.ContentDraftsCount,
		&item.IssuesCount,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *GrowthRepositoryImpl) GetLatestDailyReport(ctx context.Context) (*entities.GrowthDailyReport, error) {
	var item entities.GrowthDailyReport
	err := r.pool.QueryRow(ctx, `
		SELECT id, report_date, status, payload, content_drafts_count, issues_count, created_at, updated_at
		FROM growth_daily_reports
		ORDER BY report_date DESC
		LIMIT 1
	`).Scan(
		&item.ID,
		&item.ReportDate,
		&item.Status,
		&item.Payload,
		&item.ContentDraftsCount,
		&item.IssuesCount,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

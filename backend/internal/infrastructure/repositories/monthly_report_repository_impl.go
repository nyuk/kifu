package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type MonthlyReportRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewMonthlyReportRepository(pool *pgxpool.Pool) *MonthlyReportRepositoryImpl {
	return &MonthlyReportRepositoryImpl{pool: pool}
}

func (r *MonthlyReportRepositoryImpl) Create(ctx context.Context, report *entities.MonthlyReport) error {
	query := `
		INSERT INTO monthly_reports (report_id, user_id, year, month, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, year, month) DO UPDATE
		SET payload = EXCLUDED.payload, created_at = EXCLUDED.created_at
	`
	_, err := r.pool.Exec(ctx, query,
		report.ReportID, report.UserID, report.Year, report.Month,
		report.Payload, report.CreatedAt,
	)
	return err
}

func (r *MonthlyReportRepositoryImpl) GetByMonth(ctx context.Context, userID uuid.UUID, year, month int) (*entities.MonthlyReport, error) {
	query := `
		SELECT report_id, user_id, year, month, payload, created_at
		FROM monthly_reports
		WHERE user_id = $1 AND year = $2 AND month = $3
	`
	row := r.pool.QueryRow(ctx, query, userID, year, month)
	var report entities.MonthlyReport
	err := row.Scan(&report.ReportID, &report.UserID, &report.Year, &report.Month, &report.Payload, &report.CreatedAt)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return &report, nil
}

func (r *MonthlyReportRepositoryImpl) GetLatest(ctx context.Context, userID uuid.UUID) (*entities.MonthlyReport, error) {
	query := `
		SELECT report_id, user_id, year, month, payload, created_at
		FROM monthly_reports
		WHERE user_id = $1
		ORDER BY year DESC, month DESC
		LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, userID)
	var report entities.MonthlyReport
	err := row.Scan(&report.ReportID, &report.UserID, &report.Year, &report.Month, &report.Payload, &report.CreatedAt)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return &report, nil
}

func (r *MonthlyReportRepositoryImpl) List(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.MonthlyReport, error) {
	query := `
		SELECT report_id, user_id, year, month, payload, created_at
		FROM monthly_reports
		WHERE user_id = $1
		ORDER BY year DESC, month DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []*entities.MonthlyReport
	for rows.Next() {
		var report entities.MonthlyReport
		if err := rows.Scan(&report.ReportID, &report.UserID, &report.Year, &report.Month, &report.Payload, &report.CreatedAt); err != nil {
			return nil, err
		}
		reports = append(reports, &report)
	}
	return reports, nil
}

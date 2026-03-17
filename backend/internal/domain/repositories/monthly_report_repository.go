package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type MonthlyReportRepository interface {
	Create(ctx context.Context, report *entities.MonthlyReport) error
	GetByMonth(ctx context.Context, userID uuid.UUID, year, month int) (*entities.MonthlyReport, error)
	GetLatest(ctx context.Context, userID uuid.UUID) (*entities.MonthlyReport, error)
	List(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.MonthlyReport, error)
}

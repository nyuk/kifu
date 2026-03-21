package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type GrowthDailyReportSummary struct {
	EventName string `json:"event_name"`
	Count     int    `json:"count"`
}

type GrowthRepository interface {
	CreateFunnelEvent(ctx context.Context, event *entities.GrowthFunnelEvent) error
	HasUserEvent(ctx context.Context, userID uuid.UUID, eventName string) (bool, error)
	CountFunnelEventsByRange(ctx context.Context, from, to time.Time) ([]GrowthDailyReportSummary, error)
	CreateFeedbackItem(ctx context.Context, item *entities.GrowthFeedbackItem) error
	ListFeedbackByBucket(ctx context.Context, productKey, bucket string, limit int) ([]*entities.GrowthFeedbackItem, error)
	CreateDailyReport(ctx context.Context, report *entities.GrowthDailyReport) error
	GetDailyReportByDate(ctx context.Context, reportDate time.Time) (*entities.GrowthDailyReport, error)
	GetLatestDailyReport(ctx context.Context) (*entities.GrowthDailyReport, error)
}

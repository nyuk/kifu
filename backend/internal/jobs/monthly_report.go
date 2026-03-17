package jobs

import (
	"context"
	"log"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/services"
)

// MonthlyReportJob checks daily whether the previous month's report
// needs to be generated for each active user.
type MonthlyReportJob struct {
	reportService *services.MonthlyReportService
	userRepo      repositories.UserRepository
	reportRepo    repositories.MonthlyReportRepository
}

func NewMonthlyReportJob(
	reportService *services.MonthlyReportService,
	userRepo repositories.UserRepository,
	reportRepo repositories.MonthlyReportRepository,
) *MonthlyReportJob {
	return &MonthlyReportJob{
		reportService: reportService,
		userRepo:      userRepo,
		reportRepo:    reportRepo,
	}
}

func (j *MonthlyReportJob) Start(ctx context.Context) {
	// Check once per hour. The job is idempotent — it only generates
	// a report if one doesn't already exist for the target month.
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		defer ticker.Stop()
		// Run once on startup
		j.runOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				j.runOnce(ctx)
			}
		}
	}()
}

func (j *MonthlyReportJob) runOnce(ctx context.Context) {
	now := time.Now().UTC()

	// Generate reports for the previous month.
	// We run this from day 1 onwards so reports are ready early in the month.
	targetYear, targetMonth := prevMonth(now.Year(), int(now.Month()))

	users, err := j.userRepo.ListActive(ctx)
	if err != nil {
		log.Printf("monthly report job: list active users failed: %v", err)
		return
	}

	for _, user := range users {
		// Check if report already exists
		existing, err := j.reportRepo.GetByMonth(ctx, user.ID, targetYear, targetMonth)
		if err != nil {
			log.Printf("monthly report job: check existing for user %s failed: %v", user.ID, err)
			continue
		}
		if existing != nil {
			continue // Already generated
		}

		report, err := j.reportService.Generate(ctx, user.ID, targetYear, targetMonth)
		if err != nil {
			log.Printf("monthly report job: generate for user %s (%d-%02d) failed: %v", user.ID, targetYear, targetMonth, err)
			continue
		}
		log.Printf("monthly report job: generated report %s for user %s (%d-%02d)", report.ReportID, user.ID, targetYear, targetMonth)
	}
}

func prevMonth(year, month int) (int, int) {
	if month == 1 {
		return year - 1, 12
	}
	return year, month - 1
}

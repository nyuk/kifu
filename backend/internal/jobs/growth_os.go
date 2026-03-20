package jobs

import (
	"context"
	"log"
	"time"

	"github.com/moneyvessel/kifu/internal/services"
)

type GrowthOSJob struct {
	service  *services.GrowthOSService
	location *time.Location
}

func NewGrowthOSJob(service *services.GrowthOSService) *GrowthOSJob {
	location, err := time.LoadLocation("Asia/Seoul")
	if err != nil {
		location = time.UTC
	}
	return &GrowthOSJob{
		service:  service,
		location: location,
	}
}

func (j *GrowthOSJob) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		defer ticker.Stop()
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

func (j *GrowthOSJob) runOnce(ctx context.Context) {
	now := time.Now().In(j.location)
	target := time.Date(now.Year(), now.Month(), now.Day()-1, 0, 0, 0, 0, j.location)
	report, err := j.service.GenerateDailyReport(ctx, target)
	if err != nil {
		log.Printf("growth os job: generate daily report failed (%s): %v", target.Format("2006-01-02"), err)
		return
	}
	log.Printf(
		"growth os job: daily report ready date=%s drafts=%d issues=%d",
		target.Format("2006-01-02"),
		report.ContentDraftsCount,
		report.IssuesCount,
	)
}

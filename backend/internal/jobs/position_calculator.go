package jobs

import (
	"context"
	"log"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PositionCalculator struct {
	portfolioRepo repositories.PortfolioRepository
	interval      time.Duration
	limit         int
}

func NewPositionCalculator(portfolioRepo repositories.PortfolioRepository) *PositionCalculator {
	return &PositionCalculator{
		portfolioRepo: portfolioRepo,
		interval:      10 * time.Minute,
		limit:         200,
	}
}

func (c *PositionCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(c.interval)
	go func() {
		defer ticker.Stop()
		c.runOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *PositionCalculator) runOnce(ctx context.Context) {
	users, err := c.portfolioRepo.ListUsersWithEvents(ctx, c.limit)
	if err != nil {
		log.Printf("position calc: list users failed: %v", err)
		return
	}

	for _, userID := range users {
		if err := c.portfolioRepo.RebuildPositions(ctx, userID); err != nil {
			log.Printf("position calc: user %s rebuild failed: %v", userID.String(), err)
		}
	}
}

package jobs

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/services"
)

type AccuracyCalculator struct {
	outcomeRepo     repositories.OutcomeRepository
	opinionRepo     repositories.AIOpinionRepository
	accuracyRepo    repositories.AIOpinionAccuracyRepository
	extractor       *services.DirectionExtractor
	processedPeriod time.Duration
}

func NewAccuracyCalculator(
	outcomeRepo repositories.OutcomeRepository,
	opinionRepo repositories.AIOpinionRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *AccuracyCalculator {
	return &AccuracyCalculator{
		outcomeRepo:     outcomeRepo,
		opinionRepo:     opinionRepo,
		accuracyRepo:    accuracyRepo,
		extractor:       services.NewDirectionExtractor(),
		processedPeriod: 48 * time.Hour, // Look back 48 hours for unprocessed outcomes
	}
}

func (c *AccuracyCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(90 * time.Second) // Run every 90 seconds (offset from outcome calc)
	go func() {
		defer ticker.Stop()
		// Run once immediately
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

func (c *AccuracyCalculator) runOnce(ctx context.Context) {
	// Find outcomes created in the last 48 hours that don't have accuracy records
	since := time.Now().Add(-c.processedPeriod)
	outcomes, err := c.outcomeRepo.ListRecentWithoutAccuracy(ctx, since, 100)
	if err != nil {
		log.Printf("accuracy calc: list recent outcomes failed: %v", err)
		return
	}

	for _, outcome := range outcomes {
		if err := c.processOutcome(ctx, outcome); err != nil {
			log.Printf("accuracy calc: process outcome %s failed: %v", outcome.ID, err)
		}
	}
}

func (c *AccuracyCalculator) processOutcome(ctx context.Context, outcome *entities.Outcome) error {
	// Get all AI opinions for this bubble
	opinions, err := c.opinionRepo.ListByBubble(ctx, outcome.BubbleID)
	if err != nil {
		return err
	}

	if len(opinions) == 0 {
		return nil // No opinions to evaluate
	}

	// Determine actual direction from PnL
	actualDirection := services.DetermineActualDirection(outcome.PnLPercent)

	for _, opinion := range opinions {
		// Check if already processed
		exists, err := c.accuracyRepo.ExistsByOpinionAndOutcome(ctx, opinion.ID, outcome.ID)
		if err != nil {
			log.Printf("accuracy calc: check exists failed: %v", err)
			continue
		}
		if exists {
			continue
		}

		// Extract predicted direction from AI response
		predictedDirection := c.extractor.Extract(opinion.Response)

		// Determine if correct
		isCorrect := services.IsCorrect(predictedDirection, actualDirection)

		// Create accuracy record
		accuracy := &entities.AIOpinionAccuracy{
			ID:                 uuid.New(),
			OpinionID:          opinion.ID,
			OutcomeID:          outcome.ID,
			BubbleID:           outcome.BubbleID,
			Provider:           opinion.Provider,
			Period:             outcome.Period,
			PredictedDirection: predictedDirection,
			ActualDirection:    actualDirection,
			IsCorrect:          isCorrect,
			CreatedAt:          time.Now().UTC(),
		}

		if err := c.accuracyRepo.Create(ctx, accuracy); err != nil {
			log.Printf("accuracy calc: create accuracy for opinion %s failed: %v", opinion.ID, err)
		}
	}

	return nil
}

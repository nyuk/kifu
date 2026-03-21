package handlers

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/services"
)

func trackGrowthMilestone(ctx context.Context, growthService *services.GrowthOSService, userID uuid.UUID, eventName string, sourcePath string, metadata map[string]any) {
	if growthService == nil {
		return
	}

	if _, err := growthService.TrackUserMilestone(ctx, userID, eventName, sourcePath, metadata); err != nil {
		log.Printf("growth tracking: failed to record %s for %s: %v", eventName, userID.String(), err)
	}
}

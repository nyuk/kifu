package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ProviderAccuracyStats struct {
	Provider    string                                `json:"provider"`
	Total       int                                   `json:"total"`
	Evaluated   int                                   `json:"evaluated"`
	Correct     int                                   `json:"correct"`
	Accuracy    float64                               `json:"accuracy"`
	ByDirection map[entities.Direction]DirectionStats `json:"by_direction"`
}

type DirectionStats struct {
	Predicted int     `json:"predicted"`
	Correct   int     `json:"correct"`
	Accuracy  float64 `json:"accuracy"`
}

type AIOpinionAccuracyRepository interface {
	Create(ctx context.Context, accuracy *entities.AIOpinionAccuracy) error
	GetByBubbleID(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinionAccuracy, error)
	GetByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (*entities.AIOpinionAccuracy, error)
	ExistsByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (bool, error)
	GetProviderStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (map[string]*ProviderAccuracyStats, error)
	GetTotalStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (total int, evaluated int, err error)
}

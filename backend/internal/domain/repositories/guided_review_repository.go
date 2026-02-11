package repositories

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type SubmitItemInput struct {
	Intent       string          `json:"intent"`
	Emotions     json.RawMessage `json:"emotions"`
	PatternMatch string          `json:"pattern_match"`
	Memo         string          `json:"memo"`
}

type GuidedReviewRepository interface {
	GetOrCreateToday(ctx context.Context, userID uuid.UUID, date string) (*entities.GuidedReview, []*entities.GuidedReviewItem, error)
	SubmitItem(ctx context.Context, userID uuid.UUID, itemID uuid.UUID, input SubmitItemInput) error
	CompleteReview(ctx context.Context, userID uuid.UUID, reviewID uuid.UUID) (*entities.UserStreak, error)
	GetStreak(ctx context.Context, userID uuid.UUID) (*entities.UserStreak, error)
	ListReviews(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.GuidedReview, int, error)
}

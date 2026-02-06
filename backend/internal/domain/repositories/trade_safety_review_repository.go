package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

var ErrSafetyTargetNotFound = errors.New("safety target not found")

type DailySafetyFilter struct {
	From        time.Time
	To          time.Time
	AssetClass  string
	Venue       string
	OnlyPending bool
	Limit       int
}

type DailySafetyItem struct {
	TargetType string
	TargetID   uuid.UUID
	ExecutedAt time.Time
	AssetClass string
	Venue      string
	VenueName  string
	Symbol     string
	Side       *string
	Qty        *string
	Price      *string
	Source     string
	Verdict    *string
	Note       *string
	ReviewedAt *time.Time
}

type DailySafetySummary struct {
	Total    int
	Reviewed int
	Pending  int
}

type UpsertSafetyReviewInput struct {
	TargetType string
	TargetID   uuid.UUID
	Verdict    entities.TradeSafetyVerdict
	Note       *string
}

type TradeSafetyReviewRepository interface {
	ListDaily(ctx context.Context, userID uuid.UUID, filter DailySafetyFilter) ([]DailySafetyItem, DailySafetySummary, error)
	Upsert(ctx context.Context, userID uuid.UUID, input UpsertSafetyReviewInput) (*entities.TradeSafetyReview, error)
}

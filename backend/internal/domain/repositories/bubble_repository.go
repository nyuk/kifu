package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type BubbleRepository interface {
	Create(ctx context.Context, bubble *entities.Bubble) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Bubble, error)
	List(ctx context.Context, userID uuid.UUID, filter BubbleFilter) ([]*entities.Bubble, int, error)
	ListSimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string, limit int, offset int) ([]*BubbleWithOutcome, int, error)
	SummarySimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string) (*SimilarSummary, error)
	Update(ctx context.Context, bubble *entities.Bubble) error
	DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error)
}

type BubbleFilter struct {
	Symbol string
	Tags   []string
	From   *time.Time
	To     *time.Time
	Limit  int
	Offset int
	Sort   string
}

type BubbleWithOutcome struct {
	Bubble  *entities.Bubble
	Outcome *entities.Outcome
}

type SimilarSummary struct {
	Wins   int
	Losses int
	AvgPnL *string
}

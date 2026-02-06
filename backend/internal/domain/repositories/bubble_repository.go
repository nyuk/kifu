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
	ListByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*entities.Bubble, int, error)
	ListSimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string, limit int, offset int) ([]*BubbleWithOutcome, int, error)
	SummarySimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string) (*SimilarSummary, error)
	Update(ctx context.Context, bubble *entities.Bubble) error
	DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error)
	GetReviewStats(ctx context.Context, userID uuid.UUID, period string, symbol string, tag string, assetClass string, venueName string) (*ReviewStats, error)
	GetCalendarData(ctx context.Context, userID uuid.UUID, from time.Time, to time.Time, assetClass string, venueName string) (map[string]CalendarDay, error)
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

type ReviewStats struct {
	Period             string                 `json:"period"`
	TotalBubbles       int                    `json:"total_bubbles"`
	BubblesWithOutcome int                    `json:"bubbles_with_outcome"`
	Overall            OverallReviewStats     `json:"overall"`
	ByPeriod           map[string]PeriodStats `json:"by_period"`
	ByTag              map[string]TagStats    `json:"by_tag"`
	BySymbol           map[string]SymbolStats `json:"by_symbol"`
}

type OverallReviewStats struct {
	WinRate  float64 `json:"win_rate"`
	AvgPnL   string  `json:"avg_pnl"`
	TotalPnL string  `json:"total_pnl"`
	MaxGain  string  `json:"max_gain"`
	MaxLoss  string  `json:"max_loss"`
}

type PeriodStats struct {
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
	Count   int     `json:"count"`
}

type TagStats struct {
	Count   int     `json:"count"`
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
}

type SymbolStats struct {
	Count   int     `json:"count"`
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
}

type CalendarDay struct {
	BubbleCount int    `json:"bubble_count"`
	WinCount    int    `json:"win_count"`
	LossCount   int    `json:"loss_count"`
	TotalPnL    string `json:"total_pnl"`
}

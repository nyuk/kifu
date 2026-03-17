package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type MarketingRepository interface {
	CreateIdea(ctx context.Context, idea *entities.MarketingIdea) error
	UpdateIdea(ctx context.Context, idea *entities.MarketingIdea) error
	GetIdeaByID(ctx context.Context, id uuid.UUID) (*entities.MarketingIdea, error)
	ListIdeasByUser(ctx context.Context, userID uuid.UUID, productKey string, limit int) ([]*entities.MarketingIdea, error)
	CountIdeasByUser(ctx context.Context, userID uuid.UUID, productKey string) (int, error)

	CreateDraft(ctx context.Context, draft *entities.MarketingDraft) error
	UpdateDraft(ctx context.Context, draft *entities.MarketingDraft) error
	GetDraftByID(ctx context.Context, id uuid.UUID) (*entities.MarketingDraft, error)
	ListDraftsByUser(ctx context.Context, userID uuid.UUID, productKey string, limit int) ([]*entities.MarketingDraft, error)
	CountDraftsByUser(ctx context.Context, userID uuid.UUID, productKey string) (int, error)
	CountDraftsByStatus(ctx context.Context, userID uuid.UUID, productKey string, status string) (int, error)
	NextDraftVersion(ctx context.Context, ideaID uuid.UUID, channel string) (int, error)
}

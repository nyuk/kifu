package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type marketingServiceTestRepo struct {
	ideas  map[uuid.UUID]*entities.MarketingIdea
	drafts map[uuid.UUID]*entities.MarketingDraft
}

func newMarketingServiceTestRepo() *marketingServiceTestRepo {
	return &marketingServiceTestRepo{
		ideas:  map[uuid.UUID]*entities.MarketingIdea{},
		drafts: map[uuid.UUID]*entities.MarketingDraft{},
	}
}

func (r *marketingServiceTestRepo) CreateIdea(_ context.Context, idea *entities.MarketingIdea) error {
	copied := *idea
	r.ideas[idea.ID] = &copied
	return nil
}

func (r *marketingServiceTestRepo) UpdateIdea(_ context.Context, idea *entities.MarketingIdea) error {
	copied := *idea
	r.ideas[idea.ID] = &copied
	return nil
}

func (r *marketingServiceTestRepo) GetIdeaByID(_ context.Context, id uuid.UUID) (*entities.MarketingIdea, error) {
	idea := r.ideas[id]
	if idea == nil {
		return nil, nil
	}
	copied := *idea
	return &copied, nil
}

func (r *marketingServiceTestRepo) ListIdeasByUser(_ context.Context, userID uuid.UUID, productKey string, limit int) ([]*entities.MarketingIdea, error) {
	ideas := make([]*entities.MarketingIdea, 0)
	for _, idea := range r.ideas {
		if idea.UserID == userID && idea.ProductKey == productKey {
			copied := *idea
			ideas = append(ideas, &copied)
		}
		if len(ideas) == limit {
			break
		}
	}
	return ideas, nil
}

func (r *marketingServiceTestRepo) CountIdeasByUser(_ context.Context, userID uuid.UUID, productKey string) (int, error) {
	count := 0
	for _, idea := range r.ideas {
		if idea.UserID == userID && idea.ProductKey == productKey {
			count++
		}
	}
	return count, nil
}

func (r *marketingServiceTestRepo) CreateDraft(_ context.Context, draft *entities.MarketingDraft) error {
	copied := *draft
	r.drafts[draft.ID] = &copied
	return nil
}

func (r *marketingServiceTestRepo) UpdateDraft(_ context.Context, draft *entities.MarketingDraft) error {
	copied := *draft
	r.drafts[draft.ID] = &copied
	return nil
}

func (r *marketingServiceTestRepo) GetDraftByID(_ context.Context, id uuid.UUID) (*entities.MarketingDraft, error) {
	draft := r.drafts[id]
	if draft == nil {
		return nil, nil
	}
	copied := *draft
	return &copied, nil
}

func (r *marketingServiceTestRepo) ListDraftsByUser(_ context.Context, userID uuid.UUID, productKey string, limit int) ([]*entities.MarketingDraft, error) {
	drafts := make([]*entities.MarketingDraft, 0)
	for _, draft := range r.drafts {
		if draft.UserID == userID && draft.ProductKey == productKey {
			copied := *draft
			drafts = append(drafts, &copied)
		}
		if len(drafts) == limit {
			break
		}
	}
	return drafts, nil
}

func (r *marketingServiceTestRepo) CountDraftsByUser(_ context.Context, userID uuid.UUID, productKey string) (int, error) {
	count := 0
	for _, draft := range r.drafts {
		if draft.UserID == userID && draft.ProductKey == productKey {
			count++
		}
	}
	return count, nil
}

func (r *marketingServiceTestRepo) CountDraftsByStatus(_ context.Context, userID uuid.UUID, productKey string, status string) (int, error) {
	count := 0
	for _, draft := range r.drafts {
		if draft.UserID == userID && draft.ProductKey == productKey && draft.Status == status {
			count++
		}
	}
	return count, nil
}

func (r *marketingServiceTestRepo) NextDraftVersion(_ context.Context, ideaID uuid.UUID, channel string) (int, error) {
	version := 1
	for _, draft := range r.drafts {
		if draft.IdeaID == ideaID && draft.Channel == channel && draft.Version >= version {
			version = draft.Version + 1
		}
	}
	return version, nil
}

func TestMarketingServiceCreateIdeaValidatesChannel(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo)

	_, err := service.CreateIdea(context.Background(), CreateMarketingIdeaInput{
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "Why review matters",
		RawNote:       "We need to capture the reason for a trade.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu keeps the reason attached to the trade.",
		Channels:      []string{"invalid"},
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	marketingErr, ok := err.(*MarketingError)
	if !ok || marketingErr.Code != MarketingErrorInvalidInput {
		t.Fatalf("unexpected error: %#v", err)
	}
}

func TestMarketingServiceGenerateDraftForKifuX(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo)
	service.now = func() time.Time {
		return time.Date(2026, 3, 17, 10, 0, 0, 0, time.UTC)
	}

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        userID,
		ProductKey:    entities.MarketingProductKifu,
		Title:         "Why trade review needs memory",
		RawNote:       "Traders forget the reason after a few days.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu helps traders remember why they entered and exited.",
		Channels:      []string{entities.MarketingChannelX},
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     service.now(),
		UpdatedAt:     service.now(),
	}
	repo.ideas[idea.ID] = idea

	draft, err := service.GenerateDraft(context.Background(), GenerateMarketingDraftInput{
		UserID:     userID,
		ProductKey: entities.MarketingProductKifu,
		IdeaID:     idea.ID,
		Channel:    entities.MarketingChannelX,
	})
	if err != nil {
		t.Fatalf("GenerateDraft failed: %v", err)
	}
	if draft.Channel != entities.MarketingChannelX {
		t.Fatalf("channel = %s, want x", draft.Channel)
	}
	if draft.Status != entities.MarketingDraftStatusQueue {
		t.Fatalf("status = %s, want approval_pending", draft.Status)
	}
	if draft.Version != 1 {
		t.Fatalf("version = %d, want 1", draft.Version)
	}
	if draft.Content == "" || !strings.Contains(strings.ToLower(draft.Content), "kifu") {
		t.Fatalf("expected draft content to mention Kifu, got %q", draft.Content)
	}
	updatedIdea := repo.ideas[idea.ID]
	if updatedIdea.Status != entities.MarketingIdeaStatusReady {
		t.Fatalf("idea status = %s, want draft_ready", updatedIdea.Status)
	}
}

func TestMarketingServiceUpdateDraftChangesStatusAndFlags(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo)

	userID := uuid.New()
	draft := &entities.MarketingDraft{
		ID:         uuid.New(),
		IdeaID:     uuid.New(),
		UserID:     userID,
		ProductKey: entities.MarketingProductKifu,
		Channel:    entities.MarketingChannelX,
		Tone:       "build_in_public",
		Version:    1,
		Title:      "Initial",
		Content:    "Initial content",
		RiskFlags:  []string{"Verify claims"},
		Status:     entities.MarketingDraftStatusQueue,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	repo.drafts[draft.ID] = draft

	newTitle := "Updated"
	newContent := "Updated content"
	newTone := "educational"
	newStatus := entities.MarketingDraftStatusOK
	updated, err := service.UpdateDraft(context.Background(), UpdateMarketingDraftInput{
		UserID:     userID,
		ProductKey: entities.MarketingProductKifu,
		DraftID:    draft.ID,
		Title:      &newTitle,
		Content:    &newContent,
		Tone:       &newTone,
		Status:     &newStatus,
		RiskFlags:  []string{"Check advice wording"},
	})
	if err != nil {
		t.Fatalf("UpdateDraft failed: %v", err)
	}
	if updated.Status != entities.MarketingDraftStatusOK {
		t.Fatalf("status = %s, want approved", updated.Status)
	}
	if updated.Title != newTitle || updated.Content != newContent || updated.Tone != newTone {
		t.Fatalf("draft not updated: %#v", updated)
	}
	if len(updated.RiskFlags) != 1 || updated.RiskFlags[0] != "Check advice wording" {
		t.Fatalf("risk flags = %#v", updated.RiskFlags)
	}
}

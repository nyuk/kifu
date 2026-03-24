package services

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domaininterfaces "github.com/moneyvessel/kifu/internal/domain/interfaces"
)

type marketingServiceTestRepo struct {
	ideas        map[uuid.UUID]*entities.MarketingIdea
	drafts       map[uuid.UUID]*entities.MarketingDraft
	publications map[uuid.UUID]*entities.MarketingPublication
	settings     map[string]*entities.MarketingChannelSetting
}

type marketingServiceTestProviderRepo struct {
	defaultProvider  *entities.AIProvider
	enabledProviders []*entities.AIProvider
}

type marketingServiceTestAIInvoker struct {
	result            *domaininterfaces.AIInvocationResult
	err               error
	resultsByProvider map[string]*domaininterfaces.AIInvocationResult
	errorsByProvider  map[string]error
	calls             []string
}

func newMarketingServiceTestRepo() *marketingServiceTestRepo {
	return &marketingServiceTestRepo{
		ideas:        map[uuid.UUID]*entities.MarketingIdea{},
		drafts:       map[uuid.UUID]*entities.MarketingDraft{},
		publications: map[uuid.UUID]*entities.MarketingPublication{},
		settings:     map[string]*entities.MarketingChannelSetting{},
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

func (r *marketingServiceTestRepo) CreatePublication(_ context.Context, publication *entities.MarketingPublication) error {
	copyPublication := *publication
	r.publications[publication.ID] = &copyPublication
	return nil
}

func (r *marketingServiceTestRepo) UpdatePublication(_ context.Context, publication *entities.MarketingPublication) error {
	copyPublication := *publication
	r.publications[publication.ID] = &copyPublication
	return nil
}

func (r *marketingServiceTestRepo) GetPublicationByDraftID(_ context.Context, draftID uuid.UUID) (*entities.MarketingPublication, error) {
	var latest *entities.MarketingPublication
	for _, publication := range r.publications {
		if publication.DraftID != draftID {
			continue
		}
		if latest == nil || publication.UpdatedAt.After(latest.UpdatedAt) {
			copyPublication := *publication
			latest = &copyPublication
		}
	}
	return latest, nil
}

func marketingServiceSettingKey(userID uuid.UUID, productKey string, channel string) string {
	return userID.String() + ":" + productKey + ":" + channel
}

func (r *marketingServiceTestRepo) ListChannelSettingsByUser(_ context.Context, userID uuid.UUID, productKey string) ([]*entities.MarketingChannelSetting, error) {
	settings := make([]*entities.MarketingChannelSetting, 0)
	for _, setting := range r.settings {
		if setting.UserID == userID && setting.ProductKey == productKey {
			copied := *setting
			settings = append(settings, &copied)
		}
	}
	return settings, nil
}

func (r *marketingServiceTestRepo) GetChannelSetting(_ context.Context, userID uuid.UUID, productKey string, channel string) (*entities.MarketingChannelSetting, error) {
	setting := r.settings[marketingServiceSettingKey(userID, productKey, channel)]
	if setting == nil {
		return nil, nil
	}
	copied := *setting
	return &copied, nil
}

func (r *marketingServiceTestRepo) UpsertChannelSetting(_ context.Context, setting *entities.MarketingChannelSetting) error {
	copied := *setting
	r.settings[marketingServiceSettingKey(setting.UserID, setting.ProductKey, setting.Channel)] = &copied
	return nil
}

func (r *marketingServiceTestProviderRepo) ListEnabled(_ context.Context) ([]*entities.AIProvider, error) {
	if len(r.enabledProviders) > 0 {
		return r.enabledProviders, nil
	}
	if r.defaultProvider == nil {
		return nil, nil
	}
	return []*entities.AIProvider{r.defaultProvider}, nil
}

func (r *marketingServiceTestProviderRepo) GetByName(_ context.Context, name string) (*entities.AIProvider, error) {
	for _, provider := range r.enabledProviders {
		if provider != nil && provider.Name == name {
			return provider, nil
		}
	}
	if r.defaultProvider == nil || r.defaultProvider.Name != name {
		return nil, nil
	}
	return r.defaultProvider, nil
}

func (r *marketingServiceTestProviderRepo) GetByID(_ context.Context, _ uuid.UUID) (*entities.AIProvider, error) {
	if len(r.enabledProviders) > 0 {
		return r.enabledProviders[0], nil
	}
	return r.defaultProvider, nil
}

func (r *marketingServiceTestProviderRepo) GetDefault(_ context.Context) (*entities.AIProvider, error) {
	return r.defaultProvider, nil
}

func (r *marketingServiceTestProviderRepo) ListActive(ctx context.Context) ([]*entities.AIProvider, error) {
	return r.ListEnabled(ctx)
}

func (r *marketingServiceTestProviderRepo) ValidatePolicy(_ context.Context, _ uuid.UUID, _ string) (bool, error) {
	return r.defaultProvider != nil, nil
}

func (i *marketingServiceTestAIInvoker) InvokeProvider(
	_ context.Context,
	_ uuid.UUID,
	providerName string,
	_ string,
	_ []domaininterfaces.AIMessage,
	_ *domaininterfaces.AIInvocationOption,
) (*domaininterfaces.AIInvocationResult, error) {
	i.calls = append(i.calls, providerName)
	if err, exists := i.errorsByProvider[providerName]; exists {
		return nil, err
	}
	if result, exists := i.resultsByProvider[providerName]; exists {
		return result, nil
	}
	if i.err != nil {
		return nil, i.err
	}
	return i.result, nil
}

func marketingPtrString(value string) *string {
	return &value
}

func TestMarketingProductNameSupportsMoneyVessel(t *testing.T) {
	t.Parallel()

	if got := marketingProductName(entities.MarketingProductMoneyVessel); got != "MoneyVessel" {
		t.Fatalf("marketingProductName() = %q", got)
	}
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

func TestMarketingServiceCreateIdeaAcceptsLongKoreanTitleByRuneCount(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo)

	idea, err := service.CreateIdea(context.Background(), CreateMarketingIdeaInput{
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "?닿? 嫄곕옒???댁쑀媛 ?덇퀬 洹멸구 湲곗뼲?섍퀬 ?덉쑝硫??섏쨷??鍮꾩듂???곹솴???붿쓣???섎룎?꾨낫湲??꾪빐",
		RawNote:       "?쇰큺 rsi 吏?쒓? 30 ?댄븯濡??대젮?붿쓣 ???덉쟾 諛섎벑 ?щ?瑜??좎삱由щŉ 吏꾩엯?덈뜕 寃쏀뿕???곷뒗??",
		AngleType:     entities.MarketingAnglePersonal,
		MessagePillar: "Kifu??嫄곕옒 湲곕줉, 硫붾え, 蹂듦린瑜????먮쫫?쇰줈 臾띠뼱 諛섎났 ?ㅼ닔瑜?以꾩엯?덈떎.",
		Channels:      []string{entities.MarketingChannelX},
	})
	if err != nil {
		t.Fatalf("CreateIdea failed: %v", err)
	}
	if idea == nil || idea.Title == "" {
		t.Fatalf("expected created idea, got %#v", idea)
	}
}

func TestMarketingServiceCreateIdeaDefaultsNewContentAxes(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo)

	idea, err := service.CreateIdea(context.Background(), CreateMarketingIdeaInput{
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "媛숈? ?곗씠?곕룄 ?댁꽍??怨꾩냽 諛붾먮떎",
		RawNote:       "媛숈? ?댁뒪? ?먯닔瑜?蹂닿퀬??紐?遺??ъ씠???댁꽍???붾뱾?몃떎.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu??嫄곕옒 湲곕줉, 硫붾え, 蹂듦린瑜????먮쫫?쇰줈 臾띠뼱 諛섎났 ?ㅼ닔瑜?以꾩엯?덈떎.",
		Channels:      []string{entities.MarketingChannelX},
	})
	if err != nil {
		t.Fatalf("CreateIdea failed: %v", err)
	}
	if idea.ContentIntent != entities.MarketingContentIntentSoft {
		t.Fatalf("content intent = %q", idea.ContentIntent)
	}
	if idea.EvidenceSource != entities.MarketingEvidencePersonalNote {
		t.Fatalf("evidence source = %q", idea.EvidenceSource)
	}
	if idea.FormatStyle != entities.MarketingFormatReflection {
		t.Fatalf("format style = %q", idea.FormatStyle)
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
		RawNote:       "며칠 뒤 거래를 다시 보려고 하면 왜 그 자리에서 진입했고 무엇을 보고 정리했는지가 전혀 남아 있지 않아서 같은 판단을 다시 설명하기가 어렵습니다.",
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

func TestMarketingServiceGenerateDraftUsesAIWhenAvailable(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo).WithAIGeneration(
		&marketingServiceTestProviderRepo{
			defaultProvider: &entities.AIProvider{
				Name:      "openai",
				Model:     "gpt-4o-mini",
				Enabled:   true,
				IsDefault: true,
			},
		},
		&marketingServiceTestAIInvoker{
			result: &domaininterfaces.AIInvocationResult{
				Content: `{"title":"AI title","content":"First paragraph from AI.\n\nSecond paragraph from AI.","risk_flags":["AI risk check"]}`,
			},
		},
	)

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        userID,
		ProductKey:    entities.MarketingProductKifu,
		Title:         "Original title",
		RawNote:       "실제 거래를 며칠 뒤 다시 열어보니, 진입 이유와 정리 이유가 메모에 남지 않아 같은 장면을 봐도 왜 그렇게 판단했는지 다시 설명하기 어려웠습니다.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu helps traders remember why they entered and exited.",
		Channels:      []string{entities.MarketingChannelX},
		ContentIntent: entities.MarketingContentIntentNon,
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
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
	if draft.Title != "AI title" {
		t.Fatalf("title = %q", draft.Title)
	}
	if draft.Content != "First paragraph from AI.\n\nSecond paragraph from AI." {
		t.Fatalf("content = %q", draft.Content)
	}
	if len(draft.RiskFlags) == 0 || draft.RiskFlags[0] != "AI risk check" {
		t.Fatalf("risk flags = %#v", draft.RiskFlags)
	}
}

func TestMarketingServiceGenerateDraftTriesOtherEnabledProvidersWhenDefaultFails(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	invoker := &marketingServiceTestAIInvoker{
		errorsByProvider: map[string]error{
			"claude": errors.New("no API key configured for provider: claude"),
		},
		resultsByProvider: map[string]*domaininterfaces.AIInvocationResult{
			"openai": {
				Content: `{"title":"Recovered AI title","content":"환율이 크게 움직인 날일수록 뉴스보다 먼저 떠오르는 건, 예전에 내가 왜 그렇게 판단했는지 기록이 남아 있는가 하는 질문입니다.\n\nKifu는 지나간 거래를 감각이 아니라 기록과 복기로 다시 연결해서, 진입 이유와 정리 이유를 며칠 뒤에도 다시 확인하게 돕습니다.","risk_flags":["AI fallback recovered"]}`,
			},
		},
	}
	service := NewMarketingService(repo).WithAIGeneration(
		&marketingServiceTestProviderRepo{
			defaultProvider: &entities.AIProvider{
				Name:      "claude",
				Model:     "claude-3-5-sonnet-latest",
				Enabled:   true,
				IsDefault: true,
			},
			enabledProviders: []*entities.AIProvider{
				{
					Name:      "claude",
					Model:     "claude-3-5-sonnet-latest",
					Enabled:   true,
					IsDefault: true,
				},
				{
					Name:      "openai",
					Model:     "gpt-4o-mini",
					Enabled:   true,
					IsDefault: true,
				},
			},
		},
		invoker,
	)

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        userID,
		ProductKey:    entities.MarketingProductKifu,
		Title:         "Provider fallback title",
		RawNote:       "환율이 크게 움직였던 날, 예전에 무엇을 보고 진입 이유를 적었는지 바로 떠오르지 않으면 뉴스보다 내 기록을 먼저 다시 확인해야 한다는 생각이 더 커졌습니다.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu는 거래 이유와 복기 메모를 다시 연결합니다.",
		Channels:      []string{entities.MarketingChannelX},
		ContentIntent: entities.MarketingContentIntentSoft,
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
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
	if draft.Title != "Recovered AI title" {
		t.Fatalf("title = %q", draft.Title)
	}
	if !strings.Contains(draft.Content, "Kifu") {
		t.Fatalf("expected recovered AI content, got %q", draft.Content)
	}
	if len(invoker.calls) < 2 || invoker.calls[0] != "claude" || invoker.calls[1] != "openai" {
		t.Fatalf("provider calls = %#v", invoker.calls)
	}
}

func TestMarketingServiceGenerateDraftSanitizesAIOutputForX(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo).WithAIGeneration(
		&marketingServiceTestProviderRepo{
			defaultProvider: &entities.AIProvider{
				Name:      "openai",
				Model:     "gpt-4o-mini",
				Enabled:   true,
				IsDefault: true,
			},
		},
		&marketingServiceTestAIInvoker{
			result: &domaininterfaces.AIInvocationResult{
				Content: `{"title":"AI draft","content":"RSI dropped below 30. Entry came too early. Kifu keeps the reason in one place.\nTone: build_in_public","risk_flags":[]}`,
			},
		},
	)

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        userID,
		ProductKey:    entities.MarketingProductKifu,
		Title:         "AI sanitizing title",
		RawNote:       "실제 거래를 다시 복기할 때 RSI와 진입 타이밍 같은 표현이 그대로 남으면 메모보다 매매 신호처럼 읽혀서, 당시 장면과 이유를 차분히 다시 보는 흐름이 깨집니다.",
		AngleType:     entities.MarketingAnglePersonal,
		MessagePillar: "Kifu keeps trading reasons and review notes in one flow.",
		Channels:      []string{entities.MarketingChannelX},
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
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
	if strings.Contains(strings.ToLower(draft.Content), "tone:") {
		t.Fatalf("expected sanitized content, got %q", draft.Content)
	}
	if strings.Count(draft.Content, "\n\n") != 1 {
		t.Fatalf("expected exactly two X paragraphs, got %q", draft.Content)
	}
	if len(draft.RiskFlags) < 2 {
		t.Fatalf("expected inferred risk flags for signal-like wording, got %#v", draft.RiskFlags)
	}
}

func TestMarketingServiceGenerateDraftFallsBackWhenAIInvocationFails(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo).WithAIGeneration(
		&marketingServiceTestProviderRepo{
			defaultProvider: &entities.AIProvider{
				Name:      "openai",
				Model:     "gpt-4o-mini",
				Enabled:   true,
				IsDefault: true,
			},
		},
		&marketingServiceTestAIInvoker{
			err: errors.New("provider unavailable"),
		},
	)

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        userID,
		ProductKey:    entities.MarketingProductKifu,
		Title:         "복기 흐름 메모",
		RawNote:       "거래를 며칠 뒤 다시 열어보면 왜 그 시점에 들어갔고 어떤 이유로 정리했는지가 흐려져서, 기록과 복기가 한 번에 이어지는 흐름이 꼭 필요하다고 느꼈습니다.",
		AngleType:     entities.MarketingAngleFeature,
		MessagePillar: "Kifu는 기록과 복기를 한 흐름으로 이어줍니다.",
		Channels:      []string{entities.MarketingChannelX},
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
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
	if !strings.Contains(draft.Title, "복기 흐름 메모") {
		t.Fatalf("expected fallback title, got %q", draft.Title)
	}
	if !strings.Contains(draft.Content, "Kifu") {
		t.Fatalf("expected fallback content, got %q", draft.Content)
	}
}

func TestMarketingServiceGenerateDraftFallsBackWhenPromotionalXMissesProductConnection(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo).WithAIGeneration(
		&marketingServiceTestProviderRepo{
			defaultProvider: &entities.AIProvider{
				Name:      "openai",
				Model:     "gpt-4o-mini",
				Enabled:   true,
				IsDefault: true,
			},
		},
		&marketingServiceTestAIInvoker{
			result: &domaininterfaces.AIInvocationResult{
				Content: `{"title":"Market note","content":"The macro issue is getting bigger.\n\nPeople feel more anxious when volatility stays high.","risk_flags":[]}`,
			},
		},
	)

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        userID,
		ProductKey:    entities.MarketingProductKifu,
		Title:         "FX spike",
		RawNote:       "비슷한 변동성 구간이 다시 왔을 때, 예전에 무엇을 보고 진입 이유를 적어두었는지 기억이 흐려지면 같은 불안감만 반복되고 기록은 남지 않습니다.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu keeps the original trading reason attached to the record.",
		Channels:      []string{entities.MarketingChannelX},
		ContentIntent: entities.MarketingContentIntentSoft,
		FormatStyle:   entities.MarketingFormatReflection,
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
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
	if !strings.Contains(strings.ToLower(draft.Content), "kifu") {
		t.Fatalf("expected fallback content to restore product connection, got %q", draft.Content)
	}
	if draft.Title == "Market note" {
		t.Fatalf("expected generic AI title to be rejected, got %q", draft.Title)
	}
}

func TestMarketingServiceGenerateDraftFallsBackWhenPromotionalXStaysTooGeneric(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo).WithAIGeneration(
		&marketingServiceTestProviderRepo{
			defaultProvider: &entities.AIProvider{
				Name:      "openai",
				Model:     "gpt-4o-mini",
				Enabled:   true,
				IsDefault: true,
			},
		},
		&marketingServiceTestAIInvoker{
			result: &domaininterfaces.AIInvocationResult{
				Content: `{"title":"기억의 공백을 메우는 시기","content":"2009년 금융위기 이후 환율이 다시 흔들리는 장면에서는 과거의 판단을 떠올리는 일이 중요해집니다.\n\nKifu는 이런 기억의 공백을 메우는 데 도움을 줍니다.","risk_flags":[]}`,
			},
		},
	)

	userID := uuid.New()
	idea := &entities.MarketingIdea{
		ID:             uuid.New(),
		UserID:         userID,
		ProductKey:     entities.MarketingProductKifu,
		Title:          "환율 1515원",
		RawNote:        "원달러 환율이 1515원까지 올라온 날, 예전 급등 구간에서 왜 진입했고 언제 정리했는지를 바로 떠올리지 못하면 뉴스보다 내 기록이 더 급해진다는 생각이 들었습니다.",
		AngleType:      entities.MarketingAngleProblem,
		MessagePillar:  "Kifu는 트레이더가 진입 이유와 청산 이유를 기록해 두고, 며칠 뒤에도 같은 거래를 다시 복기하게 돕습니다.",
		Channels:       []string{entities.MarketingChannelX},
		ContentIntent:  entities.MarketingContentIntentSoft,
		FormatStyle:    entities.MarketingFormatNewsReaction,
		EvidenceSource: entities.MarketingEvidenceNews,
		SourceLink:     marketingPtrString("https://www.reuters.com/markets/currencies/"),
		Status:         entities.MarketingIdeaStatusInbox,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
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
	if !strings.Contains(draft.Content, "진입 이유") && !strings.Contains(draft.Content, "거래 기록") {
		t.Fatalf("expected fallback content with stored artifact wording, got %q", draft.Content)
	}
	if draft.Title == "기억의 공백을 메우는 시기" {
		t.Fatalf("expected generic AI title to be rejected, got %q", draft.Title)
	}
}

func TestMarketingFallbackRewritesFragmentedProblemNoteForX(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "환율 1515원",
		RawNote:       "2009년 금융위기 이후 환율 최고 기록. 이란 미국 전쟁의 영향. 이럴때일수록 과거의 기록과 내가 어떻게 대처했는지 확인할수 있다면 불안감은 덜해질수있다",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu는 트레이더가 왜 진입했고 왜 청산했는지 잊지 않게 돕습니다.",
		ContentIntent: entities.MarketingContentIntentSoft,
		FormatStyle:   entities.MarketingFormatReflection,
	}

	title, content := renderMarketingDraftImproved(idea, entities.MarketingChannelX, "build_in_public", nil)
	if !strings.Contains(title, "환율 1515원") {
		t.Fatalf("unexpected title = %q", title)
	}
	if strings.Contains(content, "2009년 금융위기 이후 환율 최고 기록. 이란 미국 전쟁의 영향.") {
		t.Fatalf("expected fragmented raw note to be rewritten, got %q", content)
	}
	if !strings.Contains(content, "환율 1515원 같은 장면을 다시 만나면") {
		t.Fatalf("expected rewritten opening to use the title as a scene anchor, got %q", content)
	}
	if !strings.Contains(content, "Kifu에서는 그날의 진입 이유와 정리 이유를 거래 기록에 남겨 두고") {
		t.Fatalf("expected concrete fallback connection line, got %q", content)
	}
}

func TestBuildMarketingAIMessagesForFragmentedPromotionalXAddsRewriteBrief(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		ProductKey:     entities.MarketingProductKifu,
		Title:          "환율 1515원",
		RawNote:        "2009년 금융위기 이후 환율 최고 기록. BNO UPDATE. Reuters: Iranian media says there were no direct or indirect talks with Trump. KRW 강세 전환.",
		AngleType:      entities.MarketingAngleProblem,
		MessagePillar:  "Kifu는 트레이더가 왜 진입했고 왜 청산했는지 잊지 않게 돕습니다.",
		Channels:       []string{entities.MarketingChannelX},
		ContentIntent:  entities.MarketingContentIntentSoft,
		EvidenceSource: entities.MarketingEvidenceNews,
		FormatStyle:    entities.MarketingFormatReflection,
	}

	messages := buildMarketingAIMessages(idea, entities.MarketingChannelX, "build_in_public", nil)
	prompt := messages[len(messages)-1].Content
	if !strings.Contains(prompt, "Structured rewrite brief:") {
		t.Fatalf("expected structured rewrite section, got %q", prompt)
	}
	if !strings.Contains(prompt, "The raw note is fragmented.") {
		t.Fatalf("expected fragmented-note rewrite guidance, got %q", prompt)
	}
	if !strings.Contains(prompt, "Paragraph 2 stored artifacts to name:") {
		t.Fatalf("expected stored artifact guidance, got %q", prompt)
	}
	if !strings.Contains(prompt, "Paragraph 1 concrete anchors to preserve:") {
		t.Fatalf("expected anchor preservation guidance, got %q", prompt)
	}
	if !strings.Contains(prompt, "Preserve at least one named source or attribution") {
		t.Fatalf("expected source attribution guidance, got %q", prompt)
	}
	if !strings.Contains(prompt, "Preserve one cited market interpretation or move") {
		t.Fatalf("expected market-quote guidance, got %q", prompt)
	}
}

func TestMarketingFallbackFragmentedNewsOpeningIncludesSourceAndMarketCue(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		ProductKey:     entities.MarketingProductKifu,
		Title:          "환율 1515원",
		RawNote:        "BNO News Live UPDATE: Iranian media says there were no direct or indirect talks with Trump - Reuters. 달러 뿐 아니라 모든 통화에 대해 KRW가 강세로 돌아섰습니다.",
		AngleType:      entities.MarketingAngleProblem,
		ContentIntent:  entities.MarketingContentIntentSoft,
		EvidenceSource: entities.MarketingEvidenceNews,
		FormatStyle:    entities.MarketingFormatNewsReaction,
	}

	opening := marketingFallbackFragmentedNewsOpening(idea)
	if !strings.Contains(opening, "환율 1515원") {
		t.Fatalf("expected title anchor in opening, got %q", opening)
	}
	if !strings.Contains(opening, "BNO") && !strings.Contains(opening, "Reuters") {
		t.Fatalf("expected source cue in opening, got %q", opening)
	}
	if !strings.Contains(opening, "KRW 강세") {
		t.Fatalf("expected market quote cue in opening, got %q", opening)
	}
}

func TestBuildMarketingAIMessagesForXIncludesSpecificGuidance(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		ProductKey:     entities.MarketingProductKifu,
		Title:          "Prompt test title",
		RawNote:        "I forgot why I entered the trade after a few days.",
		AngleType:      entities.MarketingAnglePersonal,
		MessagePillar:  "Kifu helps traders remember why they entered and exited.",
		Channels:       []string{entities.MarketingChannelX},
		ContentIntent:  entities.MarketingContentIntentNon,
		EvidenceSource: entities.MarketingEvidenceTeamChat,
		FormatStyle:    entities.MarketingFormatConversation,
	}

	messages := buildMarketingAIMessages(idea, entities.MarketingChannelX, "build_in_public", nil)
	if len(messages) != 6 {
		t.Fatalf("messages = %d, want 6", len(messages))
	}
	if !strings.Contains(messages[0].Content, "Avoid generic startup slogans") {
		t.Fatalf("expected stronger anti-generic system guidance, got %q", messages[0].Content)
	}
	if !strings.Contains(messages[len(messages)-1].Content, "2 natural paragraphs") {
		t.Fatalf("expected X paragraph guidance, got %q", messages[len(messages)-1].Content)
	}
	if !strings.Contains(messages[len(messages)-1].Content, "Use a first-person builder/trader voice") {
		t.Fatalf("expected personal-angle guidance, got %q", messages[len(messages)-1].Content)
	}
	if !strings.Contains(messages[0].Content, "Avoid wording that reads like a trading strategy") {
		t.Fatalf("expected anti-strategy system guidance, got %q", messages[0].Content)
	}
	if !strings.Contains(messages[1].Content, "Example brief 1:") {
		t.Fatalf("expected few-shot example prompt, got %q", messages[1].Content)
	}
	if !strings.Contains(messages[2].Content, `"risk_flags"`) {
		t.Fatalf("expected few-shot example response, got %q", messages[2].Content)
	}
}

func TestBuildMarketingAIMessagesForBlogIncludesStructureGuidance(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "Why records still need verification",
		RawNote:       "A saved note still needs to be checked again later.",
		AngleType:     entities.MarketingAngleFeature,
		MessagePillar: "Kifu connects the record and the review flow.",
		Channels:      []string{entities.MarketingChannelNaverBlog},
	}

	messages := buildMarketingAIMessages(idea, entities.MarketingChannelNaverBlog, "educational", nil)
	if len(messages) != 2 {
		t.Fatalf("messages = %d, want 2", len(messages))
	}
	if !strings.Contains(messages[1].Content, "Use this exact structure:") {
		t.Fatalf("expected blog structure guidance, got %q", messages[1].Content)
	}
	if !strings.Contains(messages[1].Content, "##") {
		t.Fatalf("expected section guidance, got %q", messages[1].Content)
	}
}

func TestSoftenMarketingXClaims(t *testing.T) {
	t.Parallel()

	input := "RSI가 30 이하로 떨어졌을 때 전략이 잘 맞았고 Kifu가 큰 도움을 줍니다."
	output := softenMarketingXClaims(input)

	if strings.Contains(output, "RSI") {
		t.Fatalf("expected indicator wording to be softened, got %q", output)
	}
	if strings.Contains(output, "30 이하") {
		t.Fatalf("expected threshold wording to be softened, got %q", output)
	}
	if strings.Contains(output, "전략") {
		t.Fatalf("expected strategy wording to be softened, got %q", output)
	}
	if strings.Contains(output, "큰 도움을 줍니다") {
		t.Fatalf("expected stronger help wording to be softened, got %q", output)
	}
}

func TestBuildMarketingAIMessagesForBlogIncludesSavedChannelSettings(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "News-driven review draft",
		RawNote:       "A volatile market move reminded me that I forget my own criteria.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu keeps the reason attached to the record.",
		Channels:      []string{entities.MarketingChannelNaverBlog},
	}
	setting := &entities.MarketingChannelSetting{
		ID:              uuid.New(),
		UserID:          idea.UserID,
		ProductKey:      idea.ProductKey,
		Channel:         entities.MarketingChannelNaverBlog,
		PublicationName: "Kifu Blog",
		DefaultCategory: "트레이딩 복기",
		PrimaryAudience: "거래 복기를 막 시작한 개인 트레이더",
		ToneGuide:       "차분하고 설명적인 문장",
		DefaultCTA:      "비슷한 상황에서 기록 부족을 다시 떠올려 보자는 문장으로 마무리",
		ProofPoints:     "거래 기록과 메모가 함께 보이는 화면",
	}

	messages := buildMarketingAIMessages(idea, entities.MarketingChannelNaverBlog, "educational", setting)
	if !strings.Contains(messages[1].Content, "Channel settings:") {
		t.Fatalf("expected channel settings section, got %q", messages[1].Content)
	}
	if !strings.Contains(messages[1].Content, "Publication name: Kifu Blog") {
		t.Fatalf("expected publication name in prompt, got %q", messages[1].Content)
	}
	if !strings.Contains(messages[1].Content, "Primary audience:") {
		t.Fatalf("expected primary audience in prompt, got %q", messages[1].Content)
	}
}

func TestSoftenMarketingXClaimsBlursIndicatorSetup(t *testing.T) {
	t.Parallel()

	input := "RSI가 30 이하로 떨어졌을 때 다시 진입하고 청산 기준을 정리했다."
	output := softenMarketingXClaims(input)

	if strings.Contains(output, "RSI") {
		t.Fatalf("expected indicator label to be softened, got %q", output)
	}
	if strings.Contains(output, "30") {
		t.Fatalf("expected threshold wording to be softened, got %q", output)
	}
	if strings.Contains(output, "진입") {
		t.Fatalf("expected entry wording to be softened, got %q", output)
	}
	if strings.Contains(output, "청산") {
		t.Fatalf("expected exit wording to be softened, got %q", output)
	}
}

func TestSanitizeMarketingContentFormatsXIntoTwoNaturalParagraphs(t *testing.T) {
	t.Parallel()

	input := "The same chart moment came back.\nI tried to remember what I noticed before.\n\nA few days later, that reason is easy to forget.\n\nKifu keeps the note and record together."
	output := sanitizeMarketingContent(input, entities.MarketingChannelX)

	if strings.Count(output, "\n\n") != 1 {
		t.Fatalf("expected two natural paragraphs, got %q", output)
	}
	if strings.Contains(output, "\nI tried") {
		t.Fatalf("expected hard line breaks inside paragraph to be collapsed, got %q", output)
	}
}

func TestRenderMarketingDraftImprovedForBlogBuildsStructuredMarkdown(t *testing.T) {
	t.Parallel()

	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        uuid.New(),
		ProductKey:    entities.MarketingProductKifu,
		Title:         "Why records still need verification",
		RawNote:       "A stored note still needs to be checked again later.",
		AngleType:     entities.MarketingAngleProblem,
		MessagePillar: "Kifu keeps the record and review flow connected.",
		Channels:      []string{entities.MarketingChannelNaverBlog},
	}

	title, content := renderMarketingDraftImproved(idea, entities.MarketingChannelNaverBlog, "educational", nil)
	if !strings.Contains(title, "Why records") {
		t.Fatalf("expected first blog title candidate, got %q", title)
	}
	if !strings.Contains(content, "#") {
		t.Fatalf("expected title-candidate section, got %q", content)
	}
	if !strings.Contains(content, "##") {
		t.Fatalf("expected structured blog sections, got %q", content)
	}
}

func TestSanitizeMarketingContentFormatsBlogSectionsAndBullets(t *testing.T) {
	t.Parallel()

	input := "# Heading - First title - Second title\n\n## Intro Blog intro line.\n\n## Closing Finish with one practical sentence."
	output := sanitizeMarketingContent(input, entities.MarketingChannelNaverBlog)

	if !strings.Contains(output, "#") {
		t.Fatalf("expected formatted heading block, got %q", output)
	}
	if !strings.Contains(output, "##") {
		t.Fatalf("expected separated section block, got %q", output)
	}
}

func TestSoftenMarketingBlogClaims(t *testing.T) {
	t.Parallel()

	input := "독창적인 전략으로 더 나은 결정을 내릴 수 있습니다."
	output := softenMarketingBlogClaims(input)

	if strings.Contains(output, "독창적인 전략") {
		t.Fatalf("expected strategy-promise wording to be softened, got %q", output)
	}
	if strings.Contains(output, "더 나은 결정을 내릴 수 있습니다") {
		t.Fatalf("expected stronger promise wording to be softened, got %q", output)
	}
}

func TestMarketingServiceSavePublicationStoresPublishedURL(t *testing.T) {
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
		Title:      "Approved draft",
		Content:    "Approved content",
		RiskFlags:  []string{},
		Status:     entities.MarketingDraftStatusOK,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	repo.drafts[draft.ID] = draft

	publication, err := service.SavePublication(context.Background(), SaveMarketingPublicationInput{
		UserID:      userID,
		ProductKey:  entities.MarketingProductKifu,
		DraftID:     draft.ID,
		ExternalURL: "https://x.com/apt812/status/1234567890",
	})
	if err != nil {
		t.Fatalf("SavePublication failed: %v", err)
	}
	if publication.PublishStatus != entities.MarketingPublishStatusDone {
		t.Fatalf("publish status = %q", publication.PublishStatus)
	}
	if publication.ExternalURL == nil || *publication.ExternalURL == "" {
		t.Fatalf("expected external url to be stored, got %#v", publication.ExternalURL)
	}

	workspace, err := service.GetWorkspace(context.Background(), userID, entities.MarketingProductKifu)
	if err != nil {
		t.Fatalf("GetWorkspace failed: %v", err)
	}
	if len(workspace.Publications) != 1 {
		t.Fatalf("expected 1 publication in workspace, got %d", len(workspace.Publications))
	}
}

func TestMarketingServiceSaveChannelSettingPersistsWorkspaceSetting(t *testing.T) {
	t.Parallel()

	repo := newMarketingServiceTestRepo()
	service := NewMarketingService(repo)
	userID := uuid.New()

	setting, err := service.SaveChannelSetting(context.Background(), SaveMarketingChannelSettingInput{
		UserID:          userID,
		ProductKey:      entities.MarketingProductKifu,
		Channel:         entities.MarketingChannelNaverBlog,
		PublicationName: "Kifu Blog",
		PublicationURL:  marketingPtrString("https://blog.naver.com/kifu"),
		DefaultCategory: "trading review",
		PrimaryAudience: "solo traders building a review habit",
		ToneGuide:       "calm and explanatory",
		DefaultCTA:      "close by asking the reader to revisit their own notes",
		ProofPoints:     "trade record and note on one screen",
		ReferenceNotes:  "avoid guarantee language",
	})
	if err != nil {
		t.Fatalf("SaveChannelSetting failed: %v", err)
	}
	if setting.Channel != entities.MarketingChannelNaverBlog {
		t.Fatalf("channel = %q", setting.Channel)
	}
	if setting.PublicationURL == nil || *setting.PublicationURL != "https://blog.naver.com/kifu" {
		t.Fatalf("unexpected publication url: %#v", setting.PublicationURL)
	}

	workspace, err := service.GetWorkspace(context.Background(), userID, entities.MarketingProductKifu)
	if err != nil {
		t.Fatalf("GetWorkspace failed: %v", err)
	}
	if len(workspace.ChannelSettings) != 1 {
		t.Fatalf("expected 1 channel setting, got %d", len(workspace.ChannelSettings))
	}
}

func TestMarketingServiceSavePublicationRequiresApprovedDraft(t *testing.T) {
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
		Title:      "Pending draft",
		Content:    "Pending content",
		RiskFlags:  []string{},
		Status:     entities.MarketingDraftStatusQueue,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	repo.drafts[draft.ID] = draft

	_, err := service.SavePublication(context.Background(), SaveMarketingPublicationInput{
		UserID:      userID,
		ProductKey:  entities.MarketingProductKifu,
		DraftID:     draft.ID,
		ExternalURL: "https://x.com/apt812/status/1234567890",
	})
	if err == nil {
		t.Fatal("expected validation error for unapproved draft")
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

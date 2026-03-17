package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type MarketingErrorCode string

const (
	MarketingErrorInvalidInput MarketingErrorCode = "INVALID_INPUT"
	MarketingErrorNotFound     MarketingErrorCode = "NOT_FOUND"
	MarketingErrorForbidden    MarketingErrorCode = "FORBIDDEN"
)

type MarketingError struct {
	Code    MarketingErrorCode
	Message string
}

func (e *MarketingError) Error() string {
	return e.Message
}

type MarketingWorkspace struct {
	ProductKey string                     `json:"product_key"`
	Summary    MarketingWorkspaceSummary  `json:"summary"`
	Ideas      []*entities.MarketingIdea  `json:"ideas"`
	Drafts     []*entities.MarketingDraft `json:"drafts"`
}

type MarketingWorkspaceSummary struct {
	IdeaCount            int `json:"idea_count"`
	DraftCount           int `json:"draft_count"`
	ApprovalPendingCount int `json:"approval_pending_count"`
	ApprovedCount        int `json:"approved_count"`
}

type CreateMarketingIdeaInput struct {
	UserID        uuid.UUID
	ProductKey    string
	Title         string
	RawNote       string
	AngleType     string
	MessagePillar string
	Channels      []string
	SourceLink    *string
}

type GenerateMarketingDraftInput struct {
	UserID     uuid.UUID
	ProductKey string
	IdeaID     uuid.UUID
	Channel    string
	Tone       string
}

type UpdateMarketingDraftInput struct {
	UserID     uuid.UUID
	ProductKey string
	DraftID    uuid.UUID
	Title      *string
	Content    *string
	Tone       *string
	RiskFlags  []string
	Status     *string
}

type MarketingService struct {
	repo repositories.MarketingRepository
	now  func() time.Time
}

var marketingProductPattern = regexp.MustCompile(`^[a-z0-9_-]{2,32}$`)

func NewMarketingService(repo repositories.MarketingRepository) *MarketingService {
	return &MarketingService{
		repo: repo,
		now:  func() time.Time { return time.Now().UTC() },
	}
}

func (s *MarketingService) GetWorkspace(ctx context.Context, userID uuid.UUID, productKey string) (*MarketingWorkspace, error) {
	normalizedProduct, err := normalizeMarketingProductKey(productKey)
	if err != nil {
		return nil, err
	}

	ideas, err := s.repo.ListIdeasByUser(ctx, userID, normalizedProduct, 12)
	if err != nil {
		return nil, err
	}
	drafts, err := s.repo.ListDraftsByUser(ctx, userID, normalizedProduct, 12)
	if err != nil {
		return nil, err
	}
	ideaCount, err := s.repo.CountIdeasByUser(ctx, userID, normalizedProduct)
	if err != nil {
		return nil, err
	}
	draftCount, err := s.repo.CountDraftsByUser(ctx, userID, normalizedProduct)
	if err != nil {
		return nil, err
	}
	approvalPendingCount, err := s.repo.CountDraftsByStatus(ctx, userID, normalizedProduct, entities.MarketingDraftStatusQueue)
	if err != nil {
		return nil, err
	}
	approvedCount, err := s.repo.CountDraftsByStatus(ctx, userID, normalizedProduct, entities.MarketingDraftStatusOK)
	if err != nil {
		return nil, err
	}

	return &MarketingWorkspace{
		ProductKey: normalizedProduct,
		Summary: MarketingWorkspaceSummary{
			IdeaCount:            ideaCount,
			DraftCount:           draftCount,
			ApprovalPendingCount: approvalPendingCount,
			ApprovedCount:        approvedCount,
		},
		Ideas:  ideas,
		Drafts: drafts,
	}, nil
}

func (s *MarketingService) CreateIdea(ctx context.Context, input CreateMarketingIdeaInput) (*entities.MarketingIdea, error) {
	normalizedProduct, err := normalizeMarketingProductKey(input.ProductKey)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "제목은 필수입니다"}
	}
	if len(title) > 120 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "제목은 120자 이하여야 합니다"}
	}

	rawNote := strings.TrimSpace(input.RawNote)
	if rawNote == "" {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "원본 메모는 필수입니다"}
	}
	if len(rawNote) > 2000 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "원본 메모는 2000자 이하여야 합니다"}
	}

	angleType, err := normalizeMarketingAngle(input.AngleType)
	if err != nil {
		return nil, err
	}
	channels, err := normalizeMarketingChannels(input.Channels)
	if err != nil {
		return nil, err
	}

	messagePillar := strings.TrimSpace(input.MessagePillar)
	if messagePillar == "" {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "핵심 메시지는 필수입니다"}
	}
	if len(messagePillar) > 280 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "핵심 메시지는 280자 이하여야 합니다"}
	}

	sourceLink := normalizeMarketingOptionalText(input.SourceLink, 500)
	now := s.now()
	idea := &entities.MarketingIdea{
		ID:            uuid.New(),
		UserID:        input.UserID,
		ProductKey:    normalizedProduct,
		Title:         title,
		RawNote:       rawNote,
		AngleType:     angleType,
		MessagePillar: messagePillar,
		Channels:      channels,
		SourceLink:    sourceLink,
		Status:        entities.MarketingIdeaStatusInbox,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.repo.CreateIdea(ctx, idea); err != nil {
		return nil, err
	}
	return idea, nil
}

func (s *MarketingService) GenerateDraft(ctx context.Context, input GenerateMarketingDraftInput) (*entities.MarketingDraft, error) {
	normalizedProduct, err := normalizeMarketingProductKey(input.ProductKey)
	if err != nil {
		return nil, err
	}
	channel, err := normalizeMarketingChannel(input.Channel)
	if err != nil {
		return nil, err
	}
	tone := normalizeMarketingTone(input.Tone, channel)

	idea, err := s.repo.GetIdeaByID(ctx, input.IdeaID)
	if err != nil {
		return nil, err
	}
	if idea == nil {
		return nil, &MarketingError{Code: MarketingErrorNotFound, Message: "아이디어를 찾을 수 없습니다"}
	}
	if idea.UserID != input.UserID || idea.ProductKey != normalizedProduct {
		return nil, &MarketingError{Code: MarketingErrorForbidden, Message: "이 아이디어에 접근할 수 없습니다"}
	}
	if !containsMarketingChannel(idea.Channels, channel) {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "이 아이디어에는 해당 채널이 설정되어 있지 않습니다"}
	}

	version, err := s.repo.NextDraftVersion(ctx, idea.ID, channel)
	if err != nil {
		return nil, err
	}
	title, content := renderMarketingDraft(idea, channel, tone)
	now := s.now()
	draft := &entities.MarketingDraft{
		ID:         uuid.New(),
		IdeaID:     idea.ID,
		UserID:     input.UserID,
		ProductKey: normalizedProduct,
		Channel:    channel,
		Tone:       tone,
		Version:    version,
		Title:      title,
		Content:    content,
		RiskFlags:  inferMarketingRiskFlags(idea, content),
		Status:     entities.MarketingDraftStatusQueue,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.CreateDraft(ctx, draft); err != nil {
		return nil, err
	}

	idea.Status = entities.MarketingIdeaStatusReady
	idea.UpdatedAt = now
	if err := s.repo.UpdateIdea(ctx, idea); err != nil {
		return nil, err
	}

	return draft, nil
}

func (s *MarketingService) UpdateDraft(ctx context.Context, input UpdateMarketingDraftInput) (*entities.MarketingDraft, error) {
	normalizedProduct, err := normalizeMarketingProductKey(input.ProductKey)
	if err != nil {
		return nil, err
	}

	draft, err := s.repo.GetDraftByID(ctx, input.DraftID)
	if err != nil {
		return nil, err
	}
	if draft == nil {
		return nil, &MarketingError{Code: MarketingErrorNotFound, Message: "초안을 찾을 수 없습니다"}
	}
	if draft.UserID != input.UserID || draft.ProductKey != normalizedProduct {
		return nil, &MarketingError{Code: MarketingErrorForbidden, Message: "이 초안에 접근할 수 없습니다"}
	}

	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		if title == "" {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "제목은 비워둘 수 없습니다"}
		}
		if len(title) > 160 {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "제목은 160자 이하여야 합니다"}
		}
		draft.Title = title
	}
	if input.Content != nil {
		content := strings.TrimSpace(*input.Content)
		if content == "" {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "본문은 비워둘 수 없습니다"}
		}
		draft.Content = content
	}
	if input.Tone != nil {
		draft.Tone = normalizeMarketingTone(*input.Tone, draft.Channel)
	}
	if input.Status != nil {
		status, err := normalizeMarketingDraftStatus(*input.Status)
		if err != nil {
			return nil, err
		}
		draft.Status = status
	}
	if input.RiskFlags != nil {
		riskFlags, err := normalizeMarketingRiskFlags(input.RiskFlags)
		if err != nil {
			return nil, err
		}
		draft.RiskFlags = riskFlags
	}

	draft.UpdatedAt = s.now()
	if err := s.repo.UpdateDraft(ctx, draft); err != nil {
		return nil, err
	}
	return draft, nil
}

func normalizeMarketingProductKey(raw string) (string, error) {
	productKey := strings.ToLower(strings.TrimSpace(raw))
	if productKey == "" {
		productKey = entities.MarketingProductKifu
	}
	if !marketingProductPattern.MatchString(productKey) {
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "product_key 형식이 올바르지 않습니다"}
	}
	return productKey, nil
}

func normalizeMarketingAngle(raw string) (string, error) {
	angle := strings.ToLower(strings.TrimSpace(raw))
	switch angle {
	case entities.MarketingAngleProductIntro,
		entities.MarketingAngleProblem,
		entities.MarketingAngleFeature,
		entities.MarketingAngleDevLog,
		entities.MarketingAnglePersonal,
		entities.MarketingAngleEducation:
		return angle, nil
	default:
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "콘텐츠 각도 값이 올바르지 않습니다"}
	}
}

func normalizeMarketingChannels(raw []string) ([]string, error) {
	if len(raw) == 0 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "채널은 하나 이상 선택해야 합니다"}
	}
	seen := map[string]struct{}{}
	channels := make([]string, 0, len(raw))
	for _, item := range raw {
		channel, err := normalizeMarketingChannel(item)
		if err != nil {
			return nil, err
		}
		if _, exists := seen[channel]; exists {
			continue
		}
		seen[channel] = struct{}{}
		channels = append(channels, channel)
	}
	return channels, nil
}

func normalizeMarketingChannel(raw string) (string, error) {
	channel := strings.ToLower(strings.TrimSpace(raw))
	switch channel {
	case entities.MarketingChannelX, entities.MarketingChannelNaverBlog, entities.MarketingChannelYouTube:
		return channel, nil
	default:
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "채널 값이 올바르지 않습니다"}
	}
}

func normalizeMarketingDraftStatus(raw string) (string, error) {
	status := strings.ToLower(strings.TrimSpace(raw))
	switch status {
	case entities.MarketingDraftStatusQueue,
		entities.MarketingDraftStatusOK,
		entities.MarketingDraftStatusHold,
		entities.MarketingDraftStatusTrash:
		return status, nil
	default:
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "초안 상태 값이 올바르지 않습니다"}
	}
}

func normalizeMarketingTone(raw string, channel string) string {
	tone := strings.ToLower(strings.TrimSpace(raw))
	if tone != "" {
		if len(tone) > 40 {
			return tone[:40]
		}
		return tone
	}
	switch channel {
	case entities.MarketingChannelX:
		return "빌드 인 퍼블릭"
	case entities.MarketingChannelNaverBlog:
		return "교육형"
	default:
		return "데모 대본"
	}
}

func normalizeMarketingRiskFlags(raw []string) ([]string, error) {
	flags := make([]string, 0, len(raw))
	seen := map[string]struct{}{}
	for _, flag := range raw {
		normalized := strings.TrimSpace(flag)
		if normalized == "" {
			continue
		}
		if len(normalized) > 120 {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "리스크 플래그는 120자 이하여야 합니다"}
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		flags = append(flags, normalized)
	}
	return flags, nil
}

func normalizeMarketingOptionalText(value *string, maxLen int) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > maxLen {
		trimmed = trimmed[:maxLen]
	}
	return &trimmed
}

func containsMarketingChannel(channels []string, target string) bool {
	for _, channel := range channels {
		if channel == target {
			return true
		}
	}
	return false
}

func renderMarketingDraft(idea *entities.MarketingIdea, channel string, tone string) (string, string) {
	productName := marketingProductName(idea.ProductKey)
	lead := marketingAngleLead(idea.AngleType)
	sourceLine := ""
	if idea.SourceLink != nil && strings.TrimSpace(*idea.SourceLink) != "" {
		sourceLine = fmt.Sprintf("\n참고 링크: %s", strings.TrimSpace(*idea.SourceLink))
	}

	switch channel {
	case entities.MarketingChannelX:
		title := fmt.Sprintf("%s | X 초안", idea.Title)
		content := strings.TrimSpace(fmt.Sprintf(
			"%s\n\n%s\n\n%s\n\n%s는 지나간 거래를 미화된 기억이 아니라 실제 이유와 결과에 다시 연결해 주는 복기 도구입니다.\n\n톤: %s",
			idea.Title,
			lead,
			idea.MessagePillar,
			productName,
			tone,
		))
		return title, content
	case entities.MarketingChannelNaverBlog:
		title := fmt.Sprintf("%s | 블로그 초안", idea.Title)
		content := strings.TrimSpace(fmt.Sprintf(
			"# %s\n\n## 왜 이 주제가 중요한가\n%s\n\n## 핵심 메시지\n%s\n\n## %s가 돕는 방식\n- 처음 거래한 이유를 기록합니다\n- 메모를 실제 결과와 함께 다시 확인합니다\n- 반복되는 실수를 맥락과 함께 복기합니다\n\n## 포함할 근거\n%s%s\n\n## 마무리\n검증 가능한 한 가지 변화에만 집중하고, 과장이나 약속형 표현은 피합니다.",
			idea.Title,
			lead,
			idea.MessagePillar,
			productName,
			idea.RawNote,
			sourceLine,
		))
		return title, content
	default:
		title := fmt.Sprintf("%s | 영상 대본 초안", idea.Title)
		content := strings.TrimSpace(fmt.Sprintf(
			"후킹: %s\n\n문제:\n%s\n\n해결:\n%s\n\n데모 포인트:\n%s 안에서 메모, 거래 이유, 복기 결과가 한 흐름으로 이어지는 장면을 보여줍니다.\n\n행동 유도:\n세팅을 따라 하라고 권하기보다, 자기 거래 하나를 맥락과 함께 복기해보라고 제안합니다.%s",
			idea.Title,
			lead,
			idea.MessagePillar,
			productName,
			sourceLine,
		))
		return title, content
	}
}

func marketingProductName(productKey string) string {
	switch productKey {
	case entities.MarketingProductKifu:
		return "Kifu"
	default:
		return strings.Title(strings.ReplaceAll(productKey, "_", " "))
	}
}

func marketingAngleLead(angle string) string {
	switch angle {
	case entities.MarketingAngleProblem:
		return "사용자가 이미 겪고 있는 문제를 먼저 꺼내고, 예시는 최대한 구체적으로 잡습니다."
	case entities.MarketingAngleFeature:
		return "이미 만든 기능 하나를 보여주고, 그 기능이 흐름을 어떻게 바꾸는지 설명합니다."
	case entities.MarketingAngleDevLog:
		return "빌더의 개발 로그처럼 쓰되, 만들면서 얻은 교훈 하나를 분명하게 남깁니다."
	case entities.MarketingAnglePersonal:
		return "직접 겪은 거래 경험이나 제품 개발 경험을 이야기의 중심에 둡니다."
	case entities.MarketingAngleEducation:
		return "개념 하나를 명확하게 설명하고, 그 개념이 제품과 어떻게 이어지는지 연결합니다."
	default:
		return "제품이 해결하는 한 가지 구체적인 일을 중심으로 설명합니다."
	}
}

func inferMarketingRiskFlags(idea *entities.MarketingIdea, content string) []string {
	flags := []string{"발행 전에 실제 제품과 모든 주장 문구가 일치하는지 다시 확인하세요"}
	combined := strings.ToLower(strings.Join([]string{idea.RawNote, idea.MessagePillar, content}, " "))
	keywords := map[string]string{
		"guarantee":  "보장처럼 읽히는 표현이 없는지 다시 확인하세요",
		"guaranteed": "보장처럼 읽히는 표현이 없는지 다시 확인하세요",
		"profit":     "수익 보장이나 투자 권유처럼 읽히지 않는지 확인하세요",
		"profits":    "수익 보장이나 투자 권유처럼 읽히지 않는지 확인하세요",
		"signal":     "매매 신호처럼 들리는 표현은 피하세요",
		"advice":     "투자 조언처럼 들리는 표현은 피하세요",
		"수익":         "수익 보장처럼 보이는 표현을 다시 확인하세요",
		"추천":         "매수 추천처럼 보이는 표현을 다시 확인하세요",
	}
	seen := map[string]struct{}{flags[0]: {}}
	for keyword, message := range keywords {
		if strings.Contains(combined, keyword) {
			if _, exists := seen[message]; exists {
				continue
			}
			seen[message] = struct{}{}
			flags = append(flags, message)
		}
	}
	return flags
}

package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domaininterfaces "github.com/moneyvessel/kifu/internal/domain/interfaces"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

var (
	marketingDigitCuePattern      = regexp.MustCompile(`\d[\d,.]*(?:원|년|월|일|%|배)?`)
	marketingTokenCuePattern      = regexp.MustCompile(`[0-9A-Za-z가-힣]+`)
	marketingFragmentSplitPattern = regexp.MustCompile(`[.!?\n]+`)
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
	ProductKey      string                              `json:"product_key"`
	Summary         MarketingWorkspaceSummary           `json:"summary"`
	Ideas           []*entities.MarketingIdea           `json:"ideas"`
	Drafts          []*entities.MarketingDraft          `json:"drafts"`
	Publications    []*entities.MarketingPublication    `json:"publications"`
	ChannelSettings []*entities.MarketingChannelSetting `json:"channel_settings"`
}

type MarketingWorkspaceSummary struct {
	IdeaCount            int `json:"idea_count"`
	DraftCount           int `json:"draft_count"`
	ApprovalPendingCount int `json:"approval_pending_count"`
	ApprovedCount        int `json:"approved_count"`
}

type CreateMarketingIdeaInput struct {
	UserID         uuid.UUID
	ProductKey     string
	Title          string
	RawNote        string
	AngleType      string
	MessagePillar  string
	Channels       []string
	ContentIntent  string
	EvidenceSource string
	FormatStyle    string
	SourceLink     *string
	Attachments    []entities.MarketingIdeaAttachment
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

type SaveMarketingPublicationInput struct {
	UserID      uuid.UUID
	ProductKey  string
	DraftID     uuid.UUID
	ExternalURL string
}

type SaveMarketingChannelSettingInput struct {
	UserID          uuid.UUID
	ProductKey      string
	Channel         string
	PublicationName string
	PublicationURL  *string
	DefaultCategory string
	PrimaryAudience string
	ToneGuide       string
	DefaultCTA      string
	ProofPoints     string
	ReferenceNotes  string
}

type marketingAIInvoker interface {
	InvokeProvider(
		ctx context.Context,
		userID uuid.UUID,
		providerName string,
		model string,
		messages []domaininterfaces.AIMessage,
		options *domaininterfaces.AIInvocationOption,
	) (*domaininterfaces.AIInvocationResult, error)
}

type MarketingService struct {
	repo           repositories.MarketingRepository
	aiProviderRepo repositories.AIProviderRepository
	aiInvocation   marketingAIInvoker
	now            func() time.Time
}

var marketingProductPattern = regexp.MustCompile(`^[a-z0-9_-]{2,32}$`)

func NewMarketingService(repo repositories.MarketingRepository) *MarketingService {
	return &MarketingService{
		repo: repo,
		now:  func() time.Time { return time.Now().UTC() },
	}
}

func (s *MarketingService) WithAIGeneration(providerRepo repositories.AIProviderRepository, aiInvocation marketingAIInvoker) *MarketingService {
	s.aiProviderRepo = providerRepo
	s.aiInvocation = aiInvocation
	return s
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
	channelSettings, err := s.repo.ListChannelSettingsByUser(ctx, userID, normalizedProduct)
	if err != nil {
		return nil, err
	}
	publications := make([]*entities.MarketingPublication, 0, len(drafts))
	for _, draft := range drafts {
		publication, publicationErr := s.repo.GetPublicationByDraftID(ctx, draft.ID)
		if publicationErr != nil {
			return nil, publicationErr
		}
		if publication != nil {
			publications = append(publications, publication)
		}
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
		Ideas:           ideas,
		Drafts:          drafts,
		Publications:    publications,
		ChannelSettings: channelSettings,
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
	if utf8.RuneCountInString(title) > 120 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "제목은 120자 이하여야 합니다"}
	}

	rawNote := strings.TrimSpace(input.RawNote)
	if rawNote == "" {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "원본 메모는 필수입니다"}
	}
	if utf8.RuneCountInString(rawNote) > 2000 {
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
	contentIntent, err := normalizeMarketingContentIntent(input.ContentIntent)
	if err != nil {
		return nil, err
	}
	evidenceSource, err := normalizeMarketingEvidenceSource(input.EvidenceSource)
	if err != nil {
		return nil, err
	}
	formatStyle, err := normalizeMarketingFormatStyle(input.FormatStyle)
	if err != nil {
		return nil, err
	}

	messagePillar := strings.TrimSpace(input.MessagePillar)
	if messagePillar == "" {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "핵심 메시지는 필수입니다"}
	}
	if utf8.RuneCountInString(messagePillar) > 280 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "핵심 메시지는 280자 이하여야 합니다"}
	}

	sourceLink := normalizeMarketingOptionalText(input.SourceLink, 500)
	attachments, err := normalizeMarketingIdeaAttachments(input.Attachments)
	if err != nil {
		return nil, err
	}
	now := s.now()
	idea := &entities.MarketingIdea{
		ID:             uuid.New(),
		UserID:         input.UserID,
		ProductKey:     normalizedProduct,
		Title:          title,
		RawNote:        rawNote,
		AngleType:      angleType,
		MessagePillar:  messagePillar,
		Channels:       channels,
		ContentIntent:  contentIntent,
		EvidenceSource: evidenceSource,
		FormatStyle:    formatStyle,
		SourceLink:     sourceLink,
		Attachments:    attachments,
		Status:         entities.MarketingIdeaStatusInbox,
		CreatedAt:      now,
		UpdatedAt:      now,
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
	channelSetting, err := s.repo.GetChannelSetting(ctx, input.UserID, normalizedProduct, channel)
	if err != nil {
		return nil, err
	}
	if err := validateMarketingIdeaForDraft(idea, channel, channelSetting); err != nil {
		return nil, err
	}

	title, content, riskFlags := s.generateDraftPayload(ctx, idea, channel, tone, channelSetting)
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
		RiskFlags:  riskFlags,
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
		if utf8.RuneCountInString(title) > 160 {
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

func (s *MarketingService) SavePublication(ctx context.Context, input SaveMarketingPublicationInput) (*entities.MarketingPublication, error) {
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
	if draft.Status != entities.MarketingDraftStatusOK {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "승인된 초안만 발행 완료로 기록할 수 있습니다"}
	}

	externalURL, err := normalizeMarketingExternalURL(input.ExternalURL)
	if err != nil {
		return nil, err
	}

	now := s.now()
	publication, err := s.repo.GetPublicationByDraftID(ctx, draft.ID)
	if err != nil {
		return nil, err
	}

	if publication == nil {
		publication = &entities.MarketingPublication{
			ID:              uuid.New(),
			DraftID:         draft.ID,
			UserID:          draft.UserID,
			ProductKey:      draft.ProductKey,
			Channel:         draft.Channel,
			PublishStatus:   entities.MarketingPublishStatusDone,
			ExternalURL:     &externalURL,
			MetricsSnapshot: []byte(`{}`),
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		if err := s.repo.CreatePublication(ctx, publication); err != nil {
			return nil, err
		}
		return publication, nil
	}

	publication.PublishStatus = entities.MarketingPublishStatusDone
	publication.ExternalURL = &externalURL
	if len(publication.MetricsSnapshot) == 0 {
		publication.MetricsSnapshot = []byte(`{}`)
	}
	publication.UpdatedAt = now
	if err := s.repo.UpdatePublication(ctx, publication); err != nil {
		return nil, err
	}
	return publication, nil
}

func (s *MarketingService) SaveChannelSetting(ctx context.Context, input SaveMarketingChannelSettingInput) (*entities.MarketingChannelSetting, error) {
	normalizedProduct, err := normalizeMarketingProductKey(input.ProductKey)
	if err != nil {
		return nil, err
	}
	channel, err := normalizeMarketingChannel(input.Channel)
	if err != nil {
		return nil, err
	}

	now := s.now()
	setting, err := s.repo.GetChannelSetting(ctx, input.UserID, normalizedProduct, channel)
	if err != nil {
		return nil, err
	}
	if setting == nil {
		setting = &entities.MarketingChannelSetting{
			ID:         uuid.New(),
			UserID:     input.UserID,
			ProductKey: normalizedProduct,
			Channel:    channel,
			CreatedAt:  now,
		}
	}

	publicationURL, err := normalizeMarketingOptionalURL(input.PublicationURL)
	if err != nil {
		return nil, err
	}

	setting.PublicationName = normalizeMarketingFreeText(input.PublicationName, 80)
	setting.PublicationURL = publicationURL
	setting.DefaultCategory = normalizeMarketingFreeText(input.DefaultCategory, 80)
	setting.PrimaryAudience = normalizeMarketingFreeText(input.PrimaryAudience, 240)
	setting.ToneGuide = normalizeMarketingFreeText(input.ToneGuide, 400)
	setting.DefaultCTA = normalizeMarketingFreeText(input.DefaultCTA, 240)
	setting.ProofPoints = normalizeMarketingFreeText(input.ProofPoints, 400)
	setting.ReferenceNotes = normalizeMarketingFreeText(input.ReferenceNotes, 500)
	setting.UpdatedAt = now

	if setting.CreatedAt.IsZero() {
		setting.CreatedAt = now
	}

	if err := s.repo.UpsertChannelSetting(ctx, setting); err != nil {
		return nil, err
	}
	return setting, nil
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

func normalizeMarketingContentIntent(raw string) (string, error) {
	intent := strings.ToLower(strings.TrimSpace(raw))
	if intent == "" {
		return entities.MarketingContentIntentSoft, nil
	}
	switch intent {
	case entities.MarketingContentIntentDirect,
		entities.MarketingContentIntentSoft,
		entities.MarketingContentIntentNon:
		return intent, nil
	default:
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "콘텐츠 성격 값이 올바르지 않습니다"}
	}
}

func normalizeMarketingEvidenceSource(raw string) (string, error) {
	source := strings.ToLower(strings.TrimSpace(raw))
	if source == "" {
		return entities.MarketingEvidencePersonalNote, nil
	}
	switch source {
	case entities.MarketingEvidencePersonalNote,
		entities.MarketingEvidenceTeamChat,
		entities.MarketingEvidenceQuote,
		entities.MarketingEvidenceNews,
		entities.MarketingEvidenceScreenshot,
		entities.MarketingEvidenceGenerated:
		return source, nil
	default:
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "근거 출처 값이 올바르지 않습니다"}
	}
}

func normalizeMarketingFormatStyle(raw string) (string, error) {
	formatStyle := strings.ToLower(strings.TrimSpace(raw))
	if formatStyle == "" {
		return entities.MarketingFormatReflection, nil
	}
	switch formatStyle {
	case entities.MarketingFormatQuestion,
		entities.MarketingFormatReflection,
		entities.MarketingFormatConversation,
		entities.MarketingFormatContrarian,
		entities.MarketingFormatScreenExplainer,
		entities.MarketingFormatNewsReaction:
		return formatStyle, nil
	default:
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "표현 형식 값이 올바르지 않습니다"}
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
		if utf8.RuneCountInString(normalized) > 120 {
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

func normalizeMarketingIdeaAttachments(items []entities.MarketingIdeaAttachment) ([]entities.MarketingIdeaAttachment, error) {
	if len(items) == 0 {
		return nil, nil
	}
	if len(items) > 3 {
		return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "첨부 이미지는 최대 3개까지 가능합니다"}
	}

	normalized := make([]entities.MarketingIdeaAttachment, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for index, item := range items {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			id = fmt.Sprintf("attachment-%d", index+1)
		}
		if _, exists := seen[id]; exists {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "첨부 이미지 id가 중복되었습니다"}
		}
		seen[id] = struct{}{}

		mimeType := strings.ToLower(strings.TrimSpace(item.MimeType))
		switch mimeType {
		case "image/png", "image/jpeg", "image/jpg", "image/webp":
		default:
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "PNG, JPG, WEBP 이미지만 첨부할 수 있습니다"}
		}

		dataURL := strings.TrimSpace(item.DataURL)
		if !strings.HasPrefix(dataURL, "data:"+mimeType+";base64,") {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "이미지 data url 형식이 올바르지 않습니다"}
		}
		if len(dataURL) > 2_500_000 {
			return nil, &MarketingError{Code: MarketingErrorInvalidInput, Message: "각 이미지 크기는 2.5MB 이하여야 합니다"}
		}

		name := normalizeMarketingFreeText(item.Name, 120)
		if name == "" {
			name = fmt.Sprintf("image-%d", index+1)
		}
		note := normalizeMarketingOptionalText(item.Note, 240)

		normalized = append(normalized, entities.MarketingIdeaAttachment{
			ID:       id,
			Name:     name,
			MimeType: mimeType,
			DataURL:  dataURL,
			Note:     note,
		})
	}

	return normalized, nil
}

func normalizeMarketingFreeText(value string, maxLen int) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if utf8.RuneCountInString(trimmed) <= maxLen {
		return trimmed
	}
	return truncateMarketingRunes(trimmed, maxLen)
}

func normalizeMarketingOptionalURL(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	normalized, err := normalizeMarketingExternalURL(trimmed)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}

func normalizeMarketingExternalURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "발행 URL은 비워둘 수 없습니다"}
	}
	if utf8.RuneCountInString(trimmed) > 500 {
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "발행 URL은 500자 이하여야 합니다"}
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed == nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "올바른 URL 형식이 아닙니다"}
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", &MarketingError{Code: MarketingErrorInvalidInput, Message: "http 또는 https URL만 저장할 수 있습니다"}
	}

	return trimmed, nil
}

func containsMarketingChannel(channels []string, target string) bool {
	for _, channel := range channels {
		if channel == target {
			return true
		}
	}
	return false
}

type marketingAIDraftResult struct {
	Title     string   `json:"title"`
	Content   string   `json:"content"`
	RiskFlags []string `json:"risk_flags"`
}

func (s *MarketingService) generateDraftPayload(
	ctx context.Context,
	idea *entities.MarketingIdea,
	channel string,
	tone string,
	channelSetting *entities.MarketingChannelSetting,
) (string, string, []string) {
	fallbackTitle, fallbackContent := renderMarketingDraftImproved(idea, channel, tone, channelSetting)
	fallbackRiskFlags := inferMarketingRiskFlags(idea, fallbackContent)

	aiDraft, err := s.generateDraftWithAI(ctx, idea, channel, tone, channelSetting)
	if err != nil || aiDraft == nil {
		return fallbackTitle, fallbackContent, fallbackRiskFlags
	}
	aiDraft = sanitizeMarketingAIDraft(aiDraft, channel)
	if !marketingAIDraftAcceptable(idea, channel, aiDraft) {
		return fallbackTitle, fallbackContent, fallbackRiskFlags
	}

	title := strings.TrimSpace(aiDraft.Title)
	if title == "" {
		title = fallbackTitle
	}

	content := strings.TrimSpace(aiDraft.Content)
	if content == "" {
		content = fallbackContent
	}

	mergedRiskFlags, normalizeErr := normalizeMarketingRiskFlags(append(aiDraft.RiskFlags, inferMarketingRiskFlags(idea, content)...))
	if normalizeErr != nil || len(mergedRiskFlags) == 0 {
		mergedRiskFlags = inferMarketingRiskFlags(idea, content)
	}

	return title, content, mergedRiskFlags
}

func (s *MarketingService) generateDraftWithAI(
	ctx context.Context,
	idea *entities.MarketingIdea,
	channel string,
	tone string,
	channelSetting *entities.MarketingChannelSetting,
) (*marketingAIDraftResult, error) {
	if s.aiProviderRepo == nil || s.aiInvocation == nil {
		return nil, nil
	}

	candidates, err := s.marketingAIProviders(ctx)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, nil
	}

	options := marketingAIOptions(channel)
	messages := buildMarketingAIMessages(idea, channel, tone, channelSetting)
	var lastErr error
	for _, provider := range candidates {
		model := strings.TrimSpace(provider.Model)
		providerName := strings.TrimSpace(provider.Name)
		if providerName == "" || model == "" {
			continue
		}

		result, err := s.aiInvocation.InvokeProvider(
			ctx,
			idea.UserID,
			providerName,
			model,
			messages,
			&options,
		)
		if err != nil || result == nil {
			if err != nil {
				lastErr = err
			}
			continue
		}

		parsed, err := parseMarketingAIDraft(strings.TrimSpace(result.Content))
		if err != nil {
			lastErr = err
			continue
		}
		if strings.TrimSpace(parsed.Content) == "" {
			continue
		}
		return parsed, nil
	}

	return nil, lastErr
}

func (s *MarketingService) marketingAIProviders(ctx context.Context) ([]*entities.AIProvider, error) {
	providers := make([]*entities.AIProvider, 0, 4)
	seen := map[string]struct{}{}

	appendProvider := func(provider *entities.AIProvider) {
		if provider == nil || !provider.Enabled {
			return
		}
		name := strings.ToLower(strings.TrimSpace(provider.Name))
		if name == "" {
			return
		}
		if _, exists := seen[name]; exists {
			return
		}
		seen[name] = struct{}{}
		providers = append(providers, provider)
	}

	defaultProvider, err := s.aiProviderRepo.GetDefault(ctx)
	if err != nil {
		return nil, err
	}
	appendProvider(defaultProvider)

	enabledProviders, err := s.aiProviderRepo.ListEnabled(ctx)
	if err != nil {
		return nil, err
	}
	for _, provider := range enabledProviders {
		appendProvider(provider)
	}

	return providers, nil
}

func marketingAIOptions(channel string) domaininterfaces.AIInvocationOption {
	temperature := 0.55
	maxTokens := 700

	switch channel {
	case entities.MarketingChannelX:
		temperature = 0.4
		maxTokens = 400
	case entities.MarketingChannelNaverBlog:
		temperature = 0.6
		maxTokens = 1100
	default:
		maxTokens = 800
	}

	return domaininterfaces.AIInvocationOption{
		Temperature: &temperature,
		MaxTokens:   &maxTokens,
	}
}

func buildMarketingAIMessages(
	idea *entities.MarketingIdea,
	channel string,
	tone string,
	channelSetting *entities.MarketingChannelSetting,
) []domaininterfaces.AIMessage {
	productName := marketingProductName(idea.ProductKey)
	sourceLink := ""
	if idea.SourceLink != nil {
		sourceLink = strings.TrimSpace(*idea.SourceLink)
	}
	settingPrompt := marketingChannelSettingPrompt(channelSetting)
	rewritePrompt := marketingStructuredRewritePrompt(idea, channel)
	attachmentPrompt := marketingAttachmentPrompt(idea)

	systemPrompt := strings.TrimSpace(fmt.Sprintf(
		`You are the founder-content drafting engine for %s Marketing OS.
Return only valid JSON with keys "title", "content", and "risk_flags".
Write natural Korean for a real founder/operator audience.
Base every claim only on the provided raw note, message pillar, and source link.
Translate any English or mixed-language input into natural Korean in the final draft.
Do not leave isolated English marketing sentences in the final content unless they are product names or unavoidable proper nouns.
Do not invent metrics, product capabilities, or user results.
Do not exaggerate.
Do not imply profit guarantees.
Do not sound like investment advice, trade signals, or a buy/sell recommendation.
Avoid wording that reads like a trading strategy, setup, entry rule, exit rule, or successful prediction.
Keep exactly one core message per draft.
Prefer a concrete moment or problem before the product explanation.
Vary the opening shape and cadence based on the requested format style instead of repeating the same problem-to-product structure every time.
When the content intent is non-promotional, the draft should still feel complete and useful even if the product mention is minimal or absent.
Avoid generic startup slogans, filler CTA, and labels like "Tone:" or "Channel:" in the final content.
When the raw note is fragmented or memo-like, rewrite it into flowing Korean prose instead of preserving note fragments or bullet rhythm.
`,
		productName,
	))

	messages := []domaininterfaces.AIMessage{
		{Role: "system", Content: systemPrompt},
	}
	messages = append(messages, marketingFewShotMessages(channel, productName)...)

	userPrompt := strings.TrimSpace(fmt.Sprintf(
		`Product: %s
Channel: %s
Tone: %s
Idea title: %s
Angle: %s
Message pillar: %s
Raw note: %s
Content intent: %s
Evidence source: %s
Format style: %s
Source link: %s
Image attachments:
%s

Channel instructions:
%s

Angle instructions:
%s

Content-intent instructions:
%s

Evidence instructions:
%s

Format instructions:
%s

Tone instructions:
%s

Structured rewrite brief:
%s

Channel settings:
%s

Hard requirements:
%s

Return JSON only.
"title" should be channel-ready and easy for the founder to scan later.
"content" should be ready for human review.
"risk_flags" should be an array of short Korean review warnings if needed.
"content" must not include meta labels such as "제목:", "톤:", "Tone:", or "Channel:".
`,
		productName,
		marketingChannelDisplayName(channel),
		tone,
		idea.Title,
		marketingAngleDisplayName(idea.AngleType),
		idea.MessagePillar,
		idea.RawNote,
		marketingContentIntentDisplayName(idea.ContentIntent),
		marketingEvidenceSourceDisplayName(idea.EvidenceSource),
		marketingFormatStyleDisplayName(idea.FormatStyle),
		sourceLink,
		attachmentPrompt,
		marketingDraftChannelInstruction(channel),
		marketingAngleInstruction(idea.AngleType, channel),
		marketingContentIntentInstruction(idea.ContentIntent, channel),
		marketingEvidenceInstruction(idea.EvidenceSource, channel),
		marketingFormatInstruction(idea.FormatStyle, channel),
		marketingToneInstruction(tone, channel),
		rewritePrompt,
		settingPrompt,
		marketingHardRequirement(idea, channel, productName),
	))

	messages = append(messages, domaininterfaces.AIMessage{
		Role:    "user",
		Content: userPrompt,
		Parts:   marketingUserMessageParts(userPrompt, idea),
	})
	return messages
}

func marketingUserMessageParts(prompt string, idea *entities.MarketingIdea) []domaininterfaces.AIMessagePart {
	parts := []domaininterfaces.AIMessagePart{{
		Type: "text",
		Text: prompt,
	}}

	for _, attachment := range idea.Attachments {
		dataURL := strings.TrimSpace(attachment.DataURL)
		if dataURL == "" {
			continue
		}
		if note := strings.TrimSpace(pointerStringValue(attachment.Note)); note != "" {
			parts = append(parts, domaininterfaces.AIMessagePart{
				Type: "text",
				Text: fmt.Sprintf("Image note for %s: %s", attachment.Name, note),
			})
		}
		parts = append(parts, domaininterfaces.AIMessagePart{
			Type:    "image",
			DataURL: dataURL,
		})
	}

	return parts
}

func marketingAttachmentPrompt(idea *entities.MarketingIdea) string {
	if len(idea.Attachments) == 0 {
		return "- none"
	}

	lines := make([]string, 0, len(idea.Attachments)+1)
	lines = append(lines, "Inspect the attached images visually. Use them as concrete scene evidence, but do not claim exact numbers unless they are clearly visible.")
	for index, attachment := range idea.Attachments {
		line := fmt.Sprintf("- image %d: %s (%s)", index+1, attachment.Name, attachment.MimeType)
		if note := strings.TrimSpace(pointerStringValue(attachment.Note)); note != "" {
			line += fmt.Sprintf(" | note: %s", note)
		}
		lines = append(lines, line)
	}
	return strings.Join(lines, "\n")
}

func pointerStringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func marketingStructuredRewritePrompt(idea *entities.MarketingIdea, channel string) string {
	lines := []string{
		"Rewrite any memo-like input into polished Korean sentences instead of preserving note fragments.",
		fmt.Sprintf("Primary missing memory to name: %s.", marketingRewriteMemoryFocus(idea)),
	}

	if marketingNeedsFragmentRewrite(idea, channel) {
		lines = append(lines, "The raw note is fragmented. Turn short fragments into one flowing first paragraph.")
	}
	if len(idea.Attachments) > 0 {
		lines = append(lines, "Use the attached image evidence to ground the first paragraph in one visible scene or chart move.")
	}
	if marketingNeedsAnchorHeavyNewsRewrite(idea, channel) {
		anchors := marketingPromptAnchorCues(idea)
		if len(anchors) > 0 {
			lines = append(lines, fmt.Sprintf("Paragraph 1 concrete anchors to preserve: %s.", strings.Join(anchors, ", ")))
		}
		sourceAnchors := marketingPromptSourceAnchors(idea.RawNote)
		if len(sourceAnchors) > 0 {
			lines = append(lines, fmt.Sprintf("Preserve at least one named source or attribution in paragraph 1: %s.", strings.Join(sourceAnchors, ", ")))
		}
		if quoteHint := marketingPromptMarketQuoteHint(idea.RawNote); quoteHint != "" {
			lines = append(lines, fmt.Sprintf("Preserve one cited market interpretation or move in paragraph 1, paraphrasing this clue naturally: %s.", quoteHint))
		}
		lines = append(lines, "Paragraph 1 must keep the concrete trigger instead of drifting into generic macro commentary.")
	}
	if channel == entities.MarketingChannelX && strings.TrimSpace(idea.ContentIntent) != entities.MarketingContentIntentNon {
		lines = append(lines,
			"Paragraph 2 stored artifacts to name: 진입 이유, 정리 이유, 대응 기준, 거래 기록, 복기 메모.",
			"Paragraph 2 actions to prefer: 기록해 둔다, 다시 꺼내본다, 복기한다, 붙여 둔다.",
			`Avoid vague product lines such as "기억의 공백을 메운다", "도움을 준다", or "중요하다" unless you also name the concrete stored artifact.`,
		)
	}

	return strings.Join(lines, "\n")
}

func marketingAIDraftAcceptable(idea *entities.MarketingIdea, channel string, draft *marketingAIDraftResult) bool {
	if draft == nil {
		return false
	}

	content := strings.TrimSpace(draft.Content)
	if content == "" {
		return false
	}

	switch channel {
	case entities.MarketingChannelX:
		intent := strings.TrimSpace(idea.ContentIntent)
		if intent != "" && intent != entities.MarketingContentIntentNon {
			paragraphs := strings.Split(content, "\n\n")
			if len(paragraphs) != 2 {
				return false
			}
			productName := strings.ToLower(strings.TrimSpace(marketingProductName(idea.ProductKey)))
			if productName != "" && !strings.Contains(strings.ToLower(content), productName) {
				return false
			}
			if !marketingContainsAny(content, "기록", "복기", "메모", "이유", "기준") {
				return false
			}
			if !marketingHasStoredArtifact(paragraphs[1]) {
				return false
			}
			if !marketingHasConcreteReviewAction(paragraphs[1]) {
				return false
			}
			if marketingNeedsFragmentRewrite(idea, channel) && marketingLooksLikeFragmentPaste(paragraphs[0], idea.RawNote) {
				return false
			}
			if marketingNeedsAnchorHeavyNewsRewrite(idea, channel) {
				anchors := marketingPromptAnchorCues(idea)
				required := minInt(2, len(anchors))
				if required > 0 && marketingCountAnchorMatches(paragraphs[0], anchors) < required {
					return false
				}
				sourceAnchors := marketingPromptSourceAnchors(idea.RawNote)
				if len(sourceAnchors) > 0 && marketingCountAnchorMatches(paragraphs[0], sourceAnchors) < 1 {
					return false
				}
				if quoteHint := marketingPromptMarketQuoteHint(idea.RawNote); quoteHint != "" && !marketingParagraphCarriesQuoteHint(paragraphs[0], quoteHint) {
					return false
				}
				if marketingContainsAny(paragraphs[1], "기억의 공백", "도움을 줍니다", "도움을 줘", "중요합니다") && !marketingHasStoredArtifact(paragraphs[1]) {
					return false
				}
			}
		}
	}

	return true
}

func marketingHardRequirement(idea *entities.MarketingIdea, channel string, productName string) string {
	if channel == entities.MarketingChannelX {
		if idea.ContentIntent == entities.MarketingContentIntentNon {
			return "Keep the draft self-contained and useful. Product mention is optional, but if included it should stay minimal."
		}
		requirement := fmt.Sprintf(
			`The X draft must be exactly 2 paragraphs.
Paragraph 1 must describe the issue, scene, or market trigger and explain why it creates a memory/review problem for the trader.
Paragraph 2 must explicitly mention %s and connect it to one concrete record/review behavior such as remembering an entry reason, reviewing an exit reason, or reconnecting a trade to its original note.
The second paragraph must name at least one stored artifact such as 진입 이유, 청산 이유, 정리 이유, 거래 기록, or 복기 메모.
The second paragraph must include a concrete action such as 기록해 둔다, 다시 꺼내본다, 복기한다, or 붙여 둔다.
Avoid generic lines such as "기억의 공백을 메운다", "도움을 줍니다", or "중요합니다" unless you also name the concrete stored artifact.
Do not end as a generic market observation with no product connection.`,
			productName,
		)
		if marketingNeedsFragmentRewrite(idea, channel) {
			requirement += "\nIf the raw note looks fragmented, rewrite it into flowing prose instead of preserving note fragments or bullet rhythm."
		}
		if idea.EvidenceSource == entities.MarketingEvidenceNews || idea.FormatStyle == entities.MarketingFormatNewsReaction {
			requirement += "\nIf the raw note includes multiple concrete anchors such as a number, year, country, headline noun, or event detail, carry at least two of them into paragraph 1."
		}
		if idea.EvidenceSource == entities.MarketingEvidenceScreenshot {
			requirement += "\nMention one visible screen, card, note, or UI artifact instead of vague product praise."
		}
		return requirement
	}

	return "Follow the requested structure closely and keep the product connection grounded in the provided note."
}

func marketingFewShotMessages(channel string, productName string) []domaininterfaces.AIMessage {
	if channel != entities.MarketingChannelX {
		return nil
	}

	return []domaininterfaces.AIMessage{
		{
			Role: "user",
			Content: strings.TrimSpace(fmt.Sprintf(
				`Example brief 1:
Product: %s
Channel: X
Tone: build_in_public
Idea title: 환율 1515원
Angle: 문제 제기
Message pillar: %s keeps the original trading reason attached to the record.
Raw note: 1515원 환율을 다시 보니, 예전 비슷한 변동성 구간에서 내가 어떤 기준으로 대응했는지 바로 떠오르지 않았다. 뉴스는 넘치지만 내 기록은 흐릿했다.
Content intent: 은근한 연결
Evidence source: 뉴스 기사
Format style: 뉴스 반응형

Write the response as JSON only.`,
				productName,
				productName,
			)),
		},
		{
			Role: "assistant",
			Content: fmt.Sprintf(
				`{"title":"1515원 환율 앞에서 더 크게 남는 질문","content":"환율이 1515원까지 흔들리면 뉴스보다 먼저 떠오르는 질문이 있습니다. 예전 비슷한 장에서 나는 왜 진입했고 왜 정리했는지, 그 기준이 막상 기록으로 남아 있지 않으면 불안은 금방 감정으로만 커집니다.\n\n그래서 %s에서는 변동성이 지나간 뒤에도 그 순간의 진입 이유와 정리 이유를 기록에 다시 붙여 보려고 합니다. 같은 장을 또 만났을 때 기사보다 먼저 내 메모와 기준을 꺼내보려면, 그때의 기록이 남아 있어야 하니까요.","risk_flags":["실제 제품 화면과 기록 흐름 표현이 맞는지 확인하세요"]}`,
				productName,
			),
		},
		{
			Role: "user",
			Content: strings.TrimSpace(fmt.Sprintf(
				`Example brief 2:
Product: %s
Channel: X
Tone: build_in_public
Idea title: 복기 카드에서 바로 다시 보는 이유
Angle: 기능 설명
Message pillar: %s connects the trade, note, and review flow.
Raw note: 복기 카드에서 거래 메모와 정리 이유를 한 번에 보니, 며칠 뒤에도 왜 그렇게 판단했는지 다시 따라갈 수 있었다. 화면으로 보여주기 좋은 포인트다.
Content intent: 은근한 연결
Evidence source: 화면 캡처
Format style: 화면 설명형

Write the response as JSON only.`,
				productName,
				productName,
			)),
		},
		{
			Role: "assistant",
			Content: fmt.Sprintf(
				`{"title":"복기 카드를 다시 보는 이유","content":"며칠만 지나도 그때 왜 그렇게 정리했는지 기억이 흐려질 때가 있습니다. 그런데 복기 카드에서 거래 메모와 정리 이유가 한 화면에 붙어 있으면, 막연한 기억 대신 당시 판단을 다시 따라가기가 훨씬 쉬워집니다.\n\n%s에서는 이런 화면이 그냥 보기 좋은 UI가 아니라 기록을 다시 꺼내보는 출발점에 가깝습니다. 거래 하나를 복기할 때 메모, 이유, 결과를 한 번에 이어서 보게 만드는 쪽이 실제 기록 습관에는 더 중요하다고 보고 있습니다.","risk_flags":["캡처로 보여줄 화면 요소가 실제와 일치하는지 확인하세요"]}`,
				productName,
			),
		},
	}
}

func validateMarketingIdeaForDraft(
	idea *entities.MarketingIdea,
	channel string,
	channelSetting *entities.MarketingChannelSetting,
) error {
	issues := marketingDraftReadinessIssues(idea, channel, channelSetting)
	if len(issues) == 0 {
		return nil
	}
	return &MarketingError{Code: MarketingErrorInvalidInput, Message: issues[0]}
}

func marketingDraftReadinessIssues(
	idea *entities.MarketingIdea,
	channel string,
	channelSetting *entities.MarketingChannelSetting,
) []string {
	rawNote := collapseMarketingWhitespace(idea.RawNote)
	sourceLink := ""
	if idea.SourceLink != nil {
		sourceLink = strings.TrimSpace(*idea.SourceLink)
	}

	issues := make([]string, 0, 3)
	if utf8.RuneCountInString(rawNote) < 60 {
		issues = append(issues, "초안 생성 전에 원본 메모에 당시 장면, 왜 중요했는지, 무엇을 다시 확인하고 싶은지까지 조금 더 적어주세요.")
	}

	if (idea.EvidenceSource == entities.MarketingEvidenceNews || idea.EvidenceSource == entities.MarketingEvidenceQuote) && sourceLink == "" {
		issues = append(issues, "뉴스/인용 기반 초안은 source_link를 함께 넣어주세요. 출처가 있어야 제네릭한 요약으로 흐르지 않습니다.")
	}

	if idea.EvidenceSource == entities.MarketingEvidenceScreenshot || idea.EvidenceSource == entities.MarketingEvidenceGenerated {
		hasScreenCue := marketingContainsAny(rawNote, "화면", "스크린", "캡처", "카드", "메모", "복기", "기록", "차트", "캔들", "15분봉", "15m")
		hasProofPoint := channelSetting != nil && collapseMarketingWhitespace(channelSetting.ProofPoints) != ""
		hasAttachment := len(idea.Attachments) > 0
		if !hasScreenCue && !hasProofPoint && !hasAttachment {
			issues = append(issues, "이미지 근거 초안은 raw_note에 어떤 화면이나 차트를 보여줄지 적거나, 이미지를 첨부하거나, 채널 설정의 proof points를 먼저 채워주세요.")
		}
	}

	if channel == entities.MarketingChannelX && idea.FormatStyle == entities.MarketingFormatNewsReaction && !marketingTextHasDigit(rawNote) && sourceLink == "" {
		issues = append(issues, "뉴스 반응형 X 초안은 숫자나 사건명 같은 구체 포인트를 raw_note에 더 적어주세요.")
	}

	return issues
}

func marketingContainsAny(text string, cues ...string) bool {
	normalized := strings.ToLower(strings.TrimSpace(text))
	if normalized == "" {
		return false
	}
	for _, cue := range cues {
		if strings.Contains(normalized, strings.ToLower(cue)) {
			return true
		}
	}
	return false
}

func marketingTextHasDigit(text string) bool {
	for _, r := range text {
		if unicode.IsDigit(r) {
			return true
		}
	}
	return false
}

func marketingNeedsFragmentRewrite(idea *entities.MarketingIdea, channel string) bool {
	if idea == nil || channel != entities.MarketingChannelX {
		return false
	}
	intent := strings.TrimSpace(idea.ContentIntent)
	if intent == "" || intent == entities.MarketingContentIntentNon {
		return false
	}
	return marketingRawNoteLooksFragmented(idea.RawNote)
}

func marketingNeedsAnchorHeavyNewsRewrite(idea *entities.MarketingIdea, channel string) bool {
	if idea == nil || channel != entities.MarketingChannelX {
		return false
	}
	intent := strings.TrimSpace(idea.ContentIntent)
	if intent == "" || intent == entities.MarketingContentIntentNon {
		return false
	}
	return idea.FormatStyle == entities.MarketingFormatNewsReaction || idea.EvidenceSource == entities.MarketingEvidenceNews
}

func marketingRewriteMemoryFocus(idea *entities.MarketingIdea) string {
	if idea == nil {
		return "왜 그렇게 판단했는지"
	}
	raw := collapseMarketingWhitespace(idea.RawNote)
	switch {
	case marketingContainsAny(raw, "진입") && marketingContainsAny(raw, "청산", "정리"):
		return "왜 진입했고 언제 정리했는지"
	case marketingContainsAny(raw, "대처"):
		return "예전 비슷한 구간에서 내가 어떻게 대처했는지"
	case marketingContainsAny(raw, "기준"):
		return "예전 비슷한 구간에서 어떤 기준으로 판단했는지"
	case marketingContainsAny(raw, "기록", "복기", "메모"):
		return "예전 판단의 이유와 기록이 무엇이었는지"
	default:
		return "왜 그렇게 판단했는지"
	}
}

func marketingPromptAnchorCues(idea *entities.MarketingIdea) []string {
	if idea == nil {
		return nil
	}

	text := strings.Join([]string{
		collapseMarketingWhitespace(idea.Title),
		collapseMarketingWhitespace(idea.RawNote),
	}, " ")
	if strings.TrimSpace(text) == "" {
		return nil
	}

	stopwords := map[string]struct{}{
		"과거": {}, "기록": {}, "복기": {}, "메모": {}, "판단": {}, "이유": {}, "기준": {},
		"대처": {}, "대처했는지": {}, "확인": {}, "불안감": {}, "불안": {}, "영향": {},
		"이럴때일수록": {}, "이럴": {}, "때일수록": {}, "있다면": {}, "남아": {}, "남지": {},
		"다시": {}, "내가": {}, "어떻게": {}, "같은": {}, "구간": {}, "예전": {}, "기억": {},
		"최고": {}, "기록과": {}, "최고기록": {}, "문제": {}, "시장": {},
	}
	sourceTokens := map[string]struct{}{
		"reuters": {}, "bno": {}, "bnodesk": {}, "trump": {}, "krw": {}, "usd": {},
		"iranian": {}, "media": {}, "update": {},
	}
	newsTokens := map[string]struct{}{
		"환율": {}, "원달러": {}, "금융위기": {}, "이란": {}, "미국": {}, "전쟁": {}, "긴장": {},
		"금리": {}, "연준": {}, "물가": {}, "관세": {}, "달러": {}, "유가": {}, "cpi": {}, "fomc": {},
	}

	cues := make([]string, 0, 6)
	seen := map[string]struct{}{}
	appendCue := func(raw string) {
		cue := strings.TrimSpace(raw)
		if cue == "" {
			return
		}
		if _, exists := seen[cue]; exists {
			return
		}
		seen[cue] = struct{}{}
		cues = append(cues, cue)
	}

	for _, cue := range marketingDigitCuePattern.FindAllString(text, -1) {
		appendCue(cue)
		if len(cues) >= 6 {
			return cues
		}
	}

	title := collapseMarketingWhitespace(idea.Title)
	for _, token := range marketingTokenCuePattern.FindAllString(text, -1) {
		normalized := strings.TrimSpace(strings.ToLower(token))
		if _, source := sourceTokens[normalized]; source {
			appendCue(token)
			if len(cues) >= 6 {
				return cues
			}
		}
	}
	for _, token := range marketingTokenCuePattern.FindAllString(text, -1) {
		normalized := strings.TrimSpace(strings.ToLower(token))
		if normalized == "" || utf8.RuneCountInString(normalized) < 2 {
			continue
		}
		if _, blocked := stopwords[normalized]; blocked {
			continue
		}
		if marketingTextHasDigit(normalized) {
			appendCue(token)
		} else if _, topical := newsTokens[normalized]; topical {
			appendCue(token)
		} else if title != "" && strings.Contains(title, token) {
			appendCue(token)
		}
		if len(cues) >= 6 {
			return cues
		}
	}

	return cues
}

func marketingPromptSourceAnchors(raw string) []string {
	sourceTokens := map[string]string{
		"reuters": "Reuters",
		"bno":     "BNO",
		"bnodesk": "BNO",
		"trump":   "Trump",
		"krw":     "KRW",
	}
	cues := make([]string, 0, 4)
	seen := map[string]struct{}{}
	for _, token := range marketingTokenCuePattern.FindAllString(raw, -1) {
		normalized := strings.ToLower(strings.TrimSpace(token))
		label, ok := sourceTokens[normalized]
		if !ok {
			continue
		}
		if _, exists := seen[label]; exists {
			continue
		}
		seen[label] = struct{}{}
		cues = append(cues, label)
	}
	return cues
}

func marketingPromptMarketQuoteHint(raw string) string {
	switch {
	case marketingContainsAny(raw, "krw") && marketingContainsAny(raw, "강세"):
		return "KRW 강세"
	case marketingContainsAny(raw, "krw") && marketingContainsAny(raw, "약세"):
		return "KRW 약세"
	case marketingContainsAny(raw, "강세"):
		return "통화 강세"
	case marketingContainsAny(raw, "약세"):
		return "통화 약세"
	default:
		return ""
	}
}

func marketingCountAnchorMatches(text string, cues []string) int {
	normalized := strings.ToLower(collapseMarketingWhitespace(text))
	matches := 0
	for _, cue := range cues {
		if strings.Contains(normalized, strings.ToLower(cue)) {
			matches++
		}
	}
	return matches
}

func marketingHasStoredArtifact(text string) bool {
	return marketingContainsAny(text,
		"진입 이유",
		"청산 이유",
		"정리 이유",
		"대응 기준",
		"거래 기록",
		"복기 메모",
		"복기 카드",
		"기록해 둔",
	)
}

func marketingHasConcreteReviewAction(text string) bool {
	return marketingContainsAny(text,
		"기록해",
		"남겨",
		"붙여",
		"꺼내",
		"다시 확인",
		"다시 보",
		"복기",
		"불러",
	)
}

func marketingRawNoteLooksFragmented(raw string) bool {
	fragments := marketingSentenceFragments(raw)
	if len(fragments) < 2 {
		return false
	}
	short := 0
	for _, fragment := range fragments {
		if utf8.RuneCountInString(fragment) <= 28 {
			short++
		}
	}
	return short >= 2
}

func marketingLooksLikeFragmentPaste(text string, rawNote string) bool {
	paragraph := collapseMarketingWhitespace(text)
	fragments := marketingSentenceFragments(rawNote)
	if paragraph == "" || len(fragments) == 0 {
		return false
	}
	matches := 0
	for _, fragment := range fragments {
		if utf8.RuneCountInString(fragment) < 8 {
			continue
		}
		if strings.Contains(paragraph, fragment) {
			matches++
		}
	}
	return matches >= 2 || strings.Contains(paragraph, collapseMarketingWhitespace(rawNote))
}

func marketingParagraphCarriesQuoteHint(text string, quoteHint string) bool {
	if strings.TrimSpace(quoteHint) == "" {
		return true
	}
	for _, token := range marketingTokenCuePattern.FindAllString(quoteHint, -1) {
		if utf8.RuneCountInString(token) < 2 {
			continue
		}
		if strings.Contains(strings.ToLower(text), strings.ToLower(token)) {
			return true
		}
	}
	return false
}

func marketingSentenceFragments(raw string) []string {
	normalized := strings.ReplaceAll(strings.ReplaceAll(raw, "\r\n", "\n"), "\r", "\n")
	parts := marketingFragmentSplitPattern.Split(normalized, -1)
	fragments := make([]string, 0, len(parts))
	for _, part := range parts {
		fragment := collapseMarketingWhitespace(part)
		if fragment == "" {
			continue
		}
		fragments = append(fragments, fragment)
	}
	return fragments
}

func minInt(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func marketingAngleInstruction(angle string, channel string) string {
	switch angle {
	case entities.MarketingAngleProblem:
		if channel == entities.MarketingChannelNaverBlog {
			return "Start from a recognizable mismatch, confusion, or moment of hesitation. Write as if you are unpacking one real problem for a reader, not defining a concept in a textbook. Avoid promising a superior strategy or better results. Keep the focus on why records need to be reviewed and verified later."
		}
		return "Start from the user pain or confusion first. Make the cost of forgetting or missing context feel concrete."
	case entities.MarketingAngleFeature:
		return "Focus on one feature only. Explain what changed in the user's workflow because of that feature."
	case entities.MarketingAngleDevLog:
		return "Sound like a builder note. Mention what was built or adjusted and why it mattered."
	case entities.MarketingAnglePersonal:
		if channel == entities.MarketingChannelX {
			return "Use a first-person builder/trader voice. Lead with one lived moment from the raw note instead of a generic lesson. Emphasize memory, reflection, or record-keeping rather than strategy or execution."
		}
		if channel == entities.MarketingChannelNaverBlog {
			return "Open with one lived moment or firsthand observation. Let the section feel like a calm personal note before expanding into the wider point."
		}
		return "Use one lived moment or firsthand observation before expanding to the product meaning."
	case entities.MarketingAngleEducation:
		if channel == entities.MarketingChannelNaverBlog {
			return "Teach one concept clearly without sounding like coaching, advice, or a guaranteed improvement. Keep the explanation close to a lived situation and use plain Korean that feels like a blog post, not a lesson handout."
		}
		return "Teach one concept clearly without turning it into advice or a recommendation."
	default:
		return "Explain one concrete product value with one believable example from the raw note."
	}
}

func marketingContentIntentInstruction(intent string, channel string) string {
	switch intent {
	case entities.MarketingContentIntentDirect:
		if channel == entities.MarketingChannelX {
			return "Be explicit that this post connects to the product. Mention Kifu clearly in the second paragraph and make the product value concrete, but avoid hype or aggressive CTA."
		}
		return "This is a direct promotional draft. Make the product connection clear, grounded, and concrete without sounding like ad copy."
	case entities.MarketingContentIntentNon:
		if channel == entities.MarketingChannelX {
			return "This is a non-promotional post. The post should stand on its own as an observation or thought. If Kifu is mentioned at all, keep it to one light touch near the end."
		}
		return "This is a non-promotional draft. Lead with the issue, observation, or scene. Product mention should be optional and very light."
	default:
		return "This is a soft-promo draft. Start from a real scene or issue, then connect to Kifu lightly near the end without a strong CTA."
	}
}

func marketingEvidenceInstruction(source string, channel string) string {
	switch source {
	case entities.MarketingEvidenceTeamChat:
		return "Use the feel of a real team conversation or internal discussion. Keep names private and focus on how interpretation shifted in the conversation."
	case entities.MarketingEvidenceQuote:
		return "Start from one short quote or cited sentence, then add the founder's interpretation. Do not over-quote or rely on the quote alone."
	case entities.MarketingEvidenceNews:
		return "Start from one concrete news point or headline, then explain why it matters. Do not rewrite the full article; add the founder's lens."
	case entities.MarketingEvidenceScreenshot:
		return "Anchor the draft in one visible screen, UI state, or screenshot-friendly moment. Make the content easy to pair with a product image."
	case entities.MarketingEvidenceGenerated:
		return "Treat the image as a concept or atmosphere reference, not proof. Do not imply the image is a real product screen or real user result."
	default:
		if channel == entities.MarketingChannelX {
			return "Use a first-hand note, thought, or lived observation as the evidence anchor."
		}
		return "Use a first-hand note or firsthand observation as the evidence anchor."
	}
}

func marketingFormatInstruction(formatStyle string, channel string) string {
	switch formatStyle {
	case entities.MarketingFormatQuestion:
		return "Open with one sharp question and let the rest of the draft answer it."
	case entities.MarketingFormatConversation:
		if channel == entities.MarketingChannelNaverBlog {
			return "Let the draft feel like it grew out of a real conversation or exchange. Keep the wording natural and flowing, not like a scripted FAQ."
		}
		return "Let the draft feel like it came from a real conversation or exchange. Use natural tension, not a polished essay."
	case entities.MarketingFormatContrarian:
		return "Lead with a mild disagreement or reversal such as 'the real issue is not X but Y'. Keep it thoughtful, not provocative clickbait."
	case entities.MarketingFormatScreenExplainer:
		return "Make the draft easy to pair with a screenshot or UI capture. Mention what the founder would point at on screen."
	case entities.MarketingFormatNewsReaction:
		if channel == entities.MarketingChannelX {
			return "Sound like a concise reaction to a fresh issue or headline, then add one grounded observation."
		}
		if channel == entities.MarketingChannelNaverBlog {
			return "Use a news-reaction structure, but make it read like a blog post: what happened, why it caught your attention, and what it revealed about your own criteria."
		}
		return "Use a news-reaction structure: what happened, why it matters, and what it reveals."
	default:
		if channel == entities.MarketingChannelNaverBlog {
			return "Write like a reflective blog note from a founder or operator who is trying to make sense of one concrete issue. Prefer connected paragraphs over list-like explanation."
		}
		return "Write like a reflective note from a founder or operator who is trying to make sense of one concrete issue."
	}
}

func marketingToneInstruction(tone string, channel string) string {
	switch strings.ToLower(strings.TrimSpace(tone)) {
	case "build_in_public", "빌드 인 퍼블릭":
		return "Sound candid, reflective, and builder-led. Avoid polished ad language. Prefer honest observation over confident recommendation."
	case "educational", "교육형":
		if channel == entities.MarketingChannelNaverBlog {
			return "Sound calm, structured, and explanatory. Avoid motivational CTA, avoid promising better outcomes, and keep the wording plain and trustworthy. The sentences should still feel like a person writing a blog post, not a framework document."
		}
		return "Sound calm, structured, and explanatory. Keep the wording plain and trustworthy."
	case "demo_script", "데모 대본":
		return "Sound visual and step-based. Make it easy to imagine the product screen or flow."
	default:
		if channel == entities.MarketingChannelX {
			return "Keep the voice concise, specific, and natural for an X post."
		}
		return "Keep the voice specific, practical, and easy to approve."
	}
}

func marketingChannelSettingPrompt(setting *entities.MarketingChannelSetting) string {
	if setting == nil {
		return "No saved channel settings."
	}

	lines := []string{"Use these saved channel settings when they help the draft feel more specific."}
	if value := collapseMarketingWhitespace(setting.PublicationName); value != "" {
		lines = append(lines, "Publication name: "+value)
	}
	if setting.PublicationURL != nil && strings.TrimSpace(*setting.PublicationURL) != "" {
		lines = append(lines, "Publication URL: "+strings.TrimSpace(*setting.PublicationURL))
	}
	if value := collapseMarketingWhitespace(setting.DefaultCategory); value != "" {
		lines = append(lines, "Default category: "+value)
	}
	if value := collapseMarketingWhitespace(setting.PrimaryAudience); value != "" {
		lines = append(lines, "Primary audience: "+value)
	}
	if value := collapseMarketingWhitespace(setting.ToneGuide); value != "" {
		lines = append(lines, "Voice and tone guide: "+value)
	}
	if value := collapseMarketingWhitespace(setting.DefaultCTA); value != "" {
		lines = append(lines, "CTA guidance: "+value)
	}
	if value := collapseMarketingWhitespace(setting.ProofPoints); value != "" {
		lines = append(lines, "Preferred proof points: "+value)
	}
	if value := collapseMarketingWhitespace(setting.ReferenceNotes); value != "" {
		lines = append(lines, "Reference notes: "+value)
	}

	return strings.Join(lines, "\n")
}

func marketingDraftChannelInstruction(channel string) string {
	switch channel {
	case entities.MarketingChannelX:
		return "Write one X post in 2 natural paragraphs. The first paragraph should cover the concrete moment or problem. The second paragraph should connect that moment to Kifu and the value of keeping records. Keep it concise, avoid bullet lists, avoid thread markers, avoid emoji, and avoid hashtags unless truly necessary. Do not describe a strategy, setup, entry plan, exit plan, or expected rebound."
	case entities.MarketingChannelNaverBlog:
		return "Write a Naver Blog draft in Markdown. Use this exact structure: '# 제목 후보' with 3 bullet candidates, then '## 도입', '## 문제 맥락', '## Kifu가 연결되는 지점', '## 이미지/화면 포인트', and '## 마무리'. Even though the structure is explicit, the prose inside each section should read like a natural Korean blog post, not a report or lecture note. Use smooth transitions, concrete sentences, and paragraph flow that can be pasted into Naver Blog after light editing. Avoid textbook phrasing, over-explaining, and abstract self-help language. Let the body sound like one person is calmly unpacking a thought, not listing a framework. Keep the sections practical and easy to expand with screenshots or concrete product examples. Do not promise better results, unique strategies, or superior decision quality. Focus on review, criteria, and remembering the original reasoning."
	default:
		return "Write a YouTube-ready draft with a hook, problem, Kifu angle, and close. Make the spoken flow easy to read aloud."
	}
}

func parseMarketingAIDraft(raw string) (*marketingAIDraftResult, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var parsed marketingAIDraftResult
	if err := json.Unmarshal([]byte(cleaned), &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func sanitizeMarketingAIDraft(draft *marketingAIDraftResult, channel string) *marketingAIDraftResult {
	if draft == nil {
		return nil
	}

	sanitized := &marketingAIDraftResult{
		Title:     collapseMarketingWhitespace(draft.Title),
		Content:   sanitizeMarketingContent(draft.Content, channel),
		RiskFlags: make([]string, 0, len(draft.RiskFlags)),
	}

	for _, flag := range draft.RiskFlags {
		cleaned := collapseMarketingWhitespace(flag)
		if cleaned == "" {
			continue
		}
		sanitized.RiskFlags = append(sanitized.RiskFlags, cleaned)
	}

	return sanitized
}

func sanitizeMarketingContent(raw string, channel string) string {
	cleaned := strings.ReplaceAll(raw, "\r\n", "\n")
	metaLinePattern := regexp.MustCompile(`(?im)^(tone|channel|title|톤|채널|제목)\s*:\s*.+$`)
	cleaned = metaLinePattern.ReplaceAllString(cleaned, "")
	cleaned = strings.TrimSpace(cleaned)
	cleaned = regexp.MustCompile(`\n{3,}`).ReplaceAllString(cleaned, "\n\n")
	if channel == entities.MarketingChannelX {
		cleaned = collapseMarketingWhitespacePreservingParagraphs(cleaned)
		cleaned = softenMarketingXClaims(cleaned)
		cleaned = formatMarketingXParagraphs(cleaned)
	}
	if channel == entities.MarketingChannelNaverBlog {
		cleaned = softenMarketingBlogClaims(cleaned)
		cleaned = formatMarketingBlogDraft(cleaned)
	}
	if channel != entities.MarketingChannelX && channel != entities.MarketingChannelNaverBlog {
		cleaned = collapseMarketingWhitespacePreservingParagraphs(cleaned)
	}

	return strings.TrimSpace(cleaned)
}

func collapseMarketingWhitespace(raw string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(raw)), " ")
}

func collapseMarketingWhitespacePreservingParagraphs(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	blocks := regexp.MustCompile(`\n\s*\n`).Split(raw, -1)
	cleaned := make([]string, 0, len(blocks))
	for _, block := range blocks {
		normalized := collapseMarketingWhitespace(strings.ReplaceAll(block, "\n", " "))
		if normalized == "" {
			continue
		}
		cleaned = append(cleaned, normalized)
	}
	return strings.Join(cleaned, "\n\n")
}

func splitMarketingSentences(raw string) []string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return nil
	}

	var sentences []string
	var current strings.Builder
	for _, r := range text {
		current.WriteRune(r)
		switch r {
		case '.', '!', '?':
			sentence := strings.TrimSpace(current.String())
			if sentence != "" {
				sentences = append(sentences, sentence)
			}
			current.Reset()
		}
	}

	if tail := strings.TrimSpace(current.String()); tail != "" {
		sentences = append(sentences, tail)
	}

	if len(sentences) == 0 {
		return []string{text}
	}
	return sentences
}

func formatMarketingXParagraphs(raw string) string {
	text := collapseMarketingWhitespace(strings.ReplaceAll(raw, "\n", " "))
	if text == "" {
		return ""
	}

	sentences := splitMarketingSentences(text)
	if len(sentences) == 0 {
		return text
	}
	if len(sentences) == 1 {
		return sentences[0]
	}

	limit := len(sentences)
	if limit > 4 {
		limit = 4
	}
	sentences = sentences[:limit]

	splitIndex := 1
	if len(sentences) >= 3 {
		splitIndex = 2
	}

	first := strings.Join(sentences[:splitIndex], " ")
	second := strings.Join(sentences[splitIndex:], " ")
	if second == "" {
		return first
	}
	return strings.TrimSpace(first + "\n\n" + second)
}

func formatMarketingBlogDraft(raw string) string {
	text := strings.TrimSpace(strings.ReplaceAll(raw, "\r\n", "\n"))
	if text == "" {
		return ""
	}

	text = regexp.MustCompile(`\s*(# 제목 후보|## 도입|## 문제 맥락|## Kifu가 연결되는 지점|## 이미지/화면 포인트|## 마무리)\s*`).ReplaceAllString(text, "\n$1\n")
	text = regexp.MustCompile(`\n{3,}`).ReplaceAllString(text, "\n\n")

	lines := strings.Split(text, "\n")
	formatted := make([]string, 0, len(lines))
	inTitleSection := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		switch {
		case strings.HasPrefix(trimmed, "# 제목 후보"):
			inTitleSection = true
			formatted = append(formatted, "# 제목 후보")
			titles := splitMarketingBlogInlineBullets(strings.TrimSpace(strings.TrimPrefix(trimmed, "# 제목 후보")))
			for _, title := range titles {
				formatted = append(formatted, "- "+title)
			}
		case strings.HasPrefix(trimmed, "## "):
			inTitleSection = false
			formatted = append(formatted, trimmed)
		case strings.HasPrefix(trimmed, "- ") && inTitleSection:
			titles := splitMarketingBlogInlineBullets(trimmed)
			for _, title := range titles {
				formatted = append(formatted, "- "+title)
			}
		case strings.HasPrefix(trimmed, "- "):
			formatted = append(formatted, collapseMarketingWhitespace(trimmed))
		default:
			formatted = append(formatted, collapseMarketingWhitespace(trimmed))
		}
	}

	joined := strings.Join(formatted, "\n")
	joined = regexp.MustCompile(`\n{3,}`).ReplaceAllString(joined, "\n\n")
	joined = strings.ReplaceAll(joined, "\n## ", "\n\n## ")
	return strings.TrimSpace(joined)
}

func splitMarketingBlogInlineBullets(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	trimmed = strings.TrimPrefix(trimmed, "-")
	trimmed = strings.TrimSpace(trimmed)
	if trimmed == "" {
		return nil
	}

	parts := strings.Split(trimmed, " - ")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		normalized := collapseMarketingWhitespace(strings.TrimPrefix(strings.TrimSpace(part), "-"))
		if normalized == "" {
			continue
		}
		items = append(items, normalized)
	}
	if len(items) == 0 {
		return []string{trimmed}
	}
	return items
}

func softenMarketingBlogClaims(raw string) string {
	replacements := []struct {
		old string
		new string
	}{
		{"성공으로 가는 중요한 첫걸음", "기록을 다시 보는 출발점"},
		{"좋은 결과를 얻는 것이 아니기 때문입니다", "같은 방식으로 읽히지 않기 때문입니다"},
		{"반드시 좋은 결과를 얻는 것이 아니기 때문입니다", "같은 방식으로 이어지지 않기 때문입니다"},
		{"더욱 낫게 만드는 중요한 도구로 작용합니다", "다시 점검하는 흐름으로 연결됩니다"},
		{"중요한 도구로 작용합니다", "다시 점검하는 흐름으로 이어집니다"},
		{"점차 발전시키고", "조금씩 정리하고"},
		{"발전시켜 나갈 수 있습니다", "다시 정리해 볼 수 있습니다"},
		{"성공하려면", "흐름을 점검하려면"},
		{"성공적인 전략", "잘 맞았던 기준"},
		{"독창적인 전략", "자기 기준"},
		{"전략을 개발", "기준을 정리"},
		{"전략이 어떻게 작동했는지 분석", "기록을 다시 점검"},
		{"큰 도움이 되지 않을 수도 있습니다", "잘 맞지 않을 수도 있습니다"},
		{"도움을 줍니다", "돌아보는 흐름으로 연결됩니다"},
		{"발전시키는 데 도움을 줍니다", "점검하는 흐름으로 연결됩니다"},
		{"실수를 줄이고", "실수를 돌아보고"},
		{"지속적으로 개선할 수 있습니다", "계속 점검할 수 있습니다"},
		{"지속적으로 발전시키는 것", "계속 점검하는 것"},
		{"더 나은 결정을 내릴 수 있습니다", "다음 판단을 다시 돌아볼 수 있습니다"},
		{"더 나은 판단을 내릴 수 있는 기준", "다음 판단을 점검할 기준"},
		{"더 나은 판단", "다음 판단 점검"},
		{"더 나은 결과를 만들어 보세요", "다음 판단을 더 차분히 점검해 보세요"},
		{"효율적으로 만들 수 있습니다", "정리된 흐름으로 돌아볼 수 있습니다"},
		{"만들어 가세요", "정리해 보세요"},
		{"세우고 발전시키는", "세우고 점검하는"},
		{"계속해서 발전시키는", "계속해서 점검하는"},
		{"자신만의 기준과 전략", "자기 기준"},
		{"나만의 기준과 전략", "자기 기준"},
	}

	cleaned := raw
	for _, replacement := range replacements {
		cleaned = strings.ReplaceAll(cleaned, replacement.old, replacement.new)
	}

	return cleaned
}

func softenMarketingXClaims(raw string) string {
	replacements := []struct {
		old string
		new string
	}{
		{"일봉 RSI 지표가 30 이하로 떨어졌을 때", "비슷한 차트 구간을 다시 봤을 때"},
		{"RSI 지표가 30 이하로 떨어졌을 때", "비슷한 차트 구간을 다시 봤을 때"},
		{"RSI가 30 이하로 떨어졌을 때", "비슷한 차트 구간을 다시 봤을 때"},
		{"일봉 RSI", "비슷한 차트 구간"},
		{"RSI", "지표"},
		{"30 이하", "낮은 구간"},
		{"움직임이 나왔", "비슷한 장면이 있었"},
		{"전략", "판단"},
		{"포지션을 잡", "기록을 남기"},
		{"포지션을 진입", "기록을 남기"},
		{"진입하고", "기록해두고"},
		{"진입했", "기록했"},
		{"빠져나오", "복기하"},
		{"청산", "정리"},
		{"반등이 있었", "비슷한 움직임이 있었"},
		{"반등했", "움직임이 나왔"},
		{"반등", "움직임"},
		{"큰 도움을 줍니다", "돌아보는 데 도움을 줍니다"},
		{"냉정하게 상황을 분석할 수 있었습니다", "기록을 다시 보며 판단을 돌아볼 수 있었습니다"},
	}

	cleaned := raw
	for _, replacement := range replacements {
		cleaned = strings.ReplaceAll(cleaned, replacement.old, replacement.new)
	}

	return cleaned
}

func marketingChannelDisplayName(channel string) string {
	switch channel {
	case entities.MarketingChannelX:
		return "X"
	case entities.MarketingChannelNaverBlog:
		return "네이버 블로그"
	default:
		return "유튜브"
	}
}

func marketingAngleDisplayName(angle string) string {
	switch angle {
	case entities.MarketingAngleProblem:
		return "문제 제기"
	case entities.MarketingAngleFeature:
		return "기능 설명"
	case entities.MarketingAngleDevLog:
		return "개발 로그"
	case entities.MarketingAnglePersonal:
		return "개인 경험"
	case entities.MarketingAngleEducation:
		return "교육형"
	default:
		return "제품 소개"
	}
}

func marketingContentIntentDisplayName(intent string) string {
	switch intent {
	case entities.MarketingContentIntentDirect:
		return "직접 광고"
	case entities.MarketingContentIntentNon:
		return "비광고 글"
	default:
		return "은근한 연결"
	}
}

func marketingEvidenceSourceDisplayName(source string) string {
	switch source {
	case entities.MarketingEvidenceTeamChat:
		return "팀 대화"
	case entities.MarketingEvidenceQuote:
		return "인용문"
	case entities.MarketingEvidenceNews:
		return "뉴스 기사"
	case entities.MarketingEvidenceScreenshot:
		return "화면 캡처"
	case entities.MarketingEvidenceGenerated:
		return "생성 이미지"
	default:
		return "내 생각"
	}
}

func marketingFormatStyleDisplayName(formatStyle string) string {
	switch formatStyle {
	case entities.MarketingFormatQuestion:
		return "질문형"
	case entities.MarketingFormatConversation:
		return "대화형"
	case entities.MarketingFormatContrarian:
		return "반박형"
	case entities.MarketingFormatScreenExplainer:
		return "화면 설명형"
	case entities.MarketingFormatNewsReaction:
		return "뉴스 반응형"
	default:
		return "회고형"
	}
}

func marketingChannelInstruction(channel string) string {
	switch channel {
	case entities.MarketingChannelX:
		return "짧고 선명한 한 개의 X 포스트 초안을 작성하세요. 280자 안팎으로 유지하고, 해시태그 남발을 피하세요."
	case entities.MarketingChannelNaverBlog:
		return "네이버 블로그 초안으로 작성하세요. 제목과 본문 구조가 분명해야 하며, 소제목을 포함해도 됩니다."
	default:
		return "유튜브 대본 초안으로 작성하세요. 후킹, 문제, 해결, 행동 유도 흐름이 드러나야 합니다."
	}
}

func renderMarketingDraftImproved(
	idea *entities.MarketingIdea,
	channel string,
	tone string,
	channelSetting *entities.MarketingChannelSetting,
) (string, string) {
	if channel == entities.MarketingChannelNaverBlog {
		return renderMarketingBlogDraftImproved(idea, channelSetting)
	}
	if channel != entities.MarketingChannelX {
		return renderMarketingDraft(idea, channel, tone)
	}

	productName := marketingProductName(idea.ProductKey)
	title := marketingFallbackTitle(idea, productName, channel)
	hook := marketingFallbackOpening(idea, channel)
	productLine := marketingFallbackConnectionLine(idea, productName)

	content := strings.Join([]string{
		hook,
		productLine,
	}, "\n\n")

	return title, content
}

func renderMarketingBlogDraftImproved(idea *entities.MarketingIdea, channelSetting *entities.MarketingChannelSetting) (string, string) {
	productName := marketingProductName(idea.ProductKey)
	titleCandidates := marketingBlogTitleCandidates(idea)
	content := strings.TrimSpace(fmt.Sprintf(
		"# 제목 후보\n- %s\n- %s\n- %s\n\n## 도입\n%s\n\n## 문제 맥락\n%s\n\n## %s가 연결되는 지점\n%s\n\n## 이미지/화면 포인트\n%s\n\n## 마무리\n%s",
		titleCandidates[0],
		titleCandidates[1],
		titleCandidates[2],
		marketingBlogIntro(idea),
		marketingBlogContext(idea),
		productName,
		marketingBlogConnection(idea, productName, channelSetting),
		marketingBlogImagePoints(channelSetting),
		marketingBlogOutro(channelSetting),
	))

	return titleCandidates[0], content
}

func marketingBlogTitleCandidates(idea *entities.MarketingIdea) []string {
	base := collapseMarketingWhitespace(idea.Title)
	if base == "" {
		base = "기록과 검증이 함께 가야 하는 이유"
	}

	return []string{
		base,
		fmt.Sprintf("%s가 기록을 검증으로 이어야 하는 이유", marketingProductName(idea.ProductKey)),
		fmt.Sprintf("%s를 남겨도 같은 실수가 반복되는 이유", strings.TrimSpace(idea.Title)),
	}
}

func marketingBlogIntro(idea *entities.MarketingIdea) string {
	switch idea.AngleType {
	case entities.MarketingAnglePersonal:
		return "거래를 마치고 시간이 조금만 지나도, 그때 왜 그렇게 판단했는지 설명하기 어려워질 때가 있습니다. 그 지점에서 기록은 단순한 메모가 아니라 다시 돌아볼 수 있는 맥락이 되어야 합니다."
	case entities.MarketingAngleEducation:
		return "기록은 중요하다고 많이 말하지만, 실제로는 기록이 다시 읽히고 검증되는 구조까지 이어질 때 비로소 복기가 됩니다."
	default:
		return "기록이 남아 있어도 그 기록이 다시 검토되고 검증되지 않으면, 같은 판단 패턴은 쉽게 반복됩니다."
	}
}

func marketingBlogContext(idea *entities.MarketingIdea) string {
	raw := collapseMarketingWhitespace(idea.RawNote)
	if raw == "" {
		return "당시의 판단 근거와 결과를 같이 남기지 않으면, 며칠 뒤에는 기억이 아니라 느낌만 남기 쉽습니다."
	}
	if utf8.RuneCountInString(raw) > 220 {
		return truncateMarketingRunes(raw, 220) + "..."
	}
	return raw
}

func marketingBlogConnection(idea *entities.MarketingIdea, productName string, channelSetting *entities.MarketingChannelSetting) string {
	message := marketingPreferredMessagePillar(idea, productName)
	if message == "" {
		message = fmt.Sprintf("%s는 거래 이유와 메모를 함께 남겨, 다음 판단을 기록으로 다시 보게 돕습니다.", productName)
	}
	if channelSetting == nil {
		return message
	}
	audience := collapseMarketingWhitespace(channelSetting.PrimaryAudience)
	toneGuide := collapseMarketingWhitespace(channelSetting.ToneGuide)
	if audience == "" && toneGuide == "" {
		return message
	}

	parts := []string{message}
	if audience != "" {
		parts = append(parts, fmt.Sprintf("특히 %s를 떠올리며 읽기 흐름을 맞출 수 있습니다.", audience))
	}
	if toneGuide != "" {
		parts = append(parts, fmt.Sprintf("톤은 %s 쪽으로 정리하는 편이 자연스럽습니다.", toneGuide))
	}
	return strings.Join(parts, " ")
}

func marketingBlogImagePoints(channelSetting *entities.MarketingChannelSetting) string {
	points := []string{}
	if channelSetting != nil {
		for _, raw := range []string{channelSetting.ProofPoints, channelSetting.ReferenceNotes} {
			for _, line := range strings.Split(strings.ReplaceAll(raw, "\r\n", "\n"), "\n") {
				guidance := collapseMarketingWhitespace(strings.TrimPrefix(strings.TrimSpace(line), "-"))
				if guidance == "" {
					continue
				}
				points = append(points, "- "+guidance)
			}
		}
	}
	if len(points) == 0 {
		points = append(points,
			"- 거래 기록과 메모가 한 화면에서 이어지는 장면",
			"- 판단 이유를 나중에 다시 확인하는 복기 흐름",
			"- 기록이 검증으로 이어지는 포인트 하나",
		)
	}
	return strings.Join(points, "\n")
}

func marketingBlogOutro(channelSetting *entities.MarketingChannelSetting) string {
	base := "기록이 남아 있는 것만으로는 부족하고, 나중에 다시 검증할 수 있어야 복기가 실제 변화로 이어집니다."
	if channelSetting == nil {
		return base
	}
	cta := collapseMarketingWhitespace(channelSetting.DefaultCTA)
	if cta == "" {
		return base
	}
	return strings.TrimSpace(base + " " + cta)
}

func marketingFallbackTitle(idea *entities.MarketingIdea, productName string, channel string) string {
	baseTitle := strings.TrimSpace(idea.Title)
	if baseTitle == "" {
		baseTitle = productName
	}

	if channel == entities.MarketingChannelX && idea.FormatStyle == entities.MarketingFormatNewsReaction {
		if strings.Contains(baseTitle, "기록") {
			return fmt.Sprintf("%s, 다시 꺼내볼 이유", baseTitle)
		}
		return fmt.Sprintf("%s, 기사보다 먼저 꺼내볼 기록", baseTitle)
	}

	suffix := map[string]string{
		entities.MarketingFormatQuestion:        "질문 메모",
		entities.MarketingFormatConversation:    "대화 메모",
		entities.MarketingFormatContrarian:      "반박 메모",
		entities.MarketingFormatScreenExplainer: "화면 메모",
		entities.MarketingFormatNewsReaction:    "이슈 메모",
	}[idea.FormatStyle]
	if suffix == "" {
		suffix = "메모"
	}

	if channel == entities.MarketingChannelX {
		return fmt.Sprintf("%s | %s", baseTitle, suffix)
	}
	return baseTitle
}

func marketingFallbackOpening(idea *entities.MarketingIdea, channel string) string {
	if marketingNeedsFragmentRewrite(idea, channel) {
		if marketingNeedsAnchorHeavyNewsRewrite(idea, channel) {
			return marketingFallbackFragmentedNewsOpening(idea)
		}
		return marketingFallbackFragmentedXOpening(idea)
	}

	hook := marketingFallbackHook(idea.RawNote)
	problemLine := marketingFallbackProblemLine(idea.AngleType)

	switch idea.FormatStyle {
	case entities.MarketingFormatQuestion:
		return fmt.Sprintf("%s %s", marketingFallbackQuestion(idea), problemLine)
	case entities.MarketingFormatConversation:
		return fmt.Sprintf("대화를 따라가다 보면 같은 장면도 해석이 계속 흔들립니다. %s", hook)
	case entities.MarketingFormatContrarian:
		return fmt.Sprintf("문제는 더 좋은 전략이 없다는 게 아니라, 왜 그렇게 판단했는지가 남지 않는다는 점입니다. %s", hook)
	case entities.MarketingFormatScreenExplainer:
		return fmt.Sprintf("화면 하나를 다시 보면 그때 놓쳤던 맥락이 보일 때가 있습니다. %s", hook)
	case entities.MarketingFormatNewsReaction:
		return fmt.Sprintf("숫자와 헤드라인이 크게 흔들릴수록 먼저 비어 보이는 건 내 판단의 기록입니다. %s", hook)
	default:
		if marketingRawNoteCarriesProblemFrame(hook) {
			return marketingEnsureSentenceEnding(hook)
		}
		return fmt.Sprintf("%s %s", marketingEnsureSentenceEnding(hook), problemLine)
	}
}

func marketingFallbackFragmentedNewsOpening(idea *entities.MarketingIdea) string {
	lead := marketingNewsLeadAnchor(idea)
	if lead == "" {
		lead = "숫자와 헤드라인"
	}
	return fmt.Sprintf("%s가 같이 나오면, 뉴스 요약보다 먼저 비어 보이는 건 %s에 대한 내 기록입니다.", lead, marketingRewriteMemoryFocus(idea))
}

func marketingFallbackFragmentedXOpening(idea *entities.MarketingIdea) string {
	lead := collapseMarketingWhitespace(idea.Title)
	if lead != "" {
		return fmt.Sprintf("%s 같은 장면을 다시 만나면, 가장 먼저 흐려지는 건 %s에 대한 내 기록입니다.", lead, marketingRewriteMemoryFocus(idea))
	}
	return fmt.Sprintf("시간이 조금만 지나도 가장 먼저 흐려지는 건 %s에 대한 내 기록입니다.", marketingRewriteMemoryFocus(idea))
}

func marketingNewsLeadAnchor(idea *entities.MarketingIdea) string {
	if idea == nil {
		return ""
	}

	parts := make([]string, 0, 3)
	appendPart := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		for _, existing := range parts {
			if existing == value {
				return
			}
		}
		parts = append(parts, value)
	}

	title := collapseMarketingWhitespace(idea.Title)
	if title != "" {
		appendPart(title)
	}

	sourceAnchors := marketingPromptSourceAnchors(idea.RawNote)
	if len(sourceAnchors) > 0 {
		appendPart(sourceAnchors[0] + " 업데이트")
	}

	if quoteHint := marketingPromptMarketQuoteHint(idea.RawNote); quoteHint != "" {
		appendPart(quoteHint + " 해석")
	}

	if len(parts) == 0 {
		anchors := marketingPromptAnchorCues(idea)
		for _, anchor := range anchors[:minInt(3, len(anchors))] {
			appendPart(anchor)
		}
	}

	return strings.Join(parts, ", ")
}

func marketingFallbackConnectionLine(idea *entities.MarketingIdea, productName string) string {
	message := marketingPreferredMessagePillar(idea, productName)
	if message == "" {
		message = fmt.Sprintf("%s는 거래 이유와 메모를 함께 남겨, 다음 판단을 기록으로 다시 보게 돕습니다.", productName)
	}

	switch idea.ContentIntent {
	case entities.MarketingContentIntentDirect:
		if idea.EvidenceSource == entities.MarketingEvidenceScreenshot {
			return fmt.Sprintf("%s 화면과 메모 흐름을 함께 보여주면, 기록이 복기로 이어지는 장면을 더 분명하게 설명할 수 있습니다. %s", productName, message)
		}
		return fmt.Sprintf("%s %s", productName, message)
	case entities.MarketingContentIntentNon:
		return "이럴수록 그때의 판단 이유를 남기고 나중에 다시 확인할 수 있는 기록이 더 중요해집니다."
	default:
		if idea.EvidenceSource == entities.MarketingEvidenceNews || idea.EvidenceSource == entities.MarketingEvidenceQuote || idea.FormatStyle == entities.MarketingFormatNewsReaction {
			return fmt.Sprintf("%s에서는 그날의 진입 이유, 정리 이유, 복기 메모를 거래 기록에 함께 남겨 두려고 합니다. 같은 이슈가 다시 왔을 때 기사보다 먼저 내 기준을 다시 꺼내보려면, 그때의 기록이 남아 있어야 하니까요. %s", productName, message)
		}
		if idea.FormatStyle == entities.MarketingFormatReflection || idea.AngleType == entities.MarketingAngleProblem || idea.AngleType == entities.MarketingAnglePersonal {
			return fmt.Sprintf("%s에서는 그날의 진입 이유와 정리 이유를 거래 기록에 남겨 두고, 며칠 뒤에도 복기 메모와 함께 다시 꺼내보게 하려 합니다.", productName)
		}
		return fmt.Sprintf("결국 남는 건 그때의 판단 이유입니다. %s", message)
	}
}

func marketingPreferredMessagePillar(idea *entities.MarketingIdea, productName string) string {
	message := collapseMarketingWhitespace(idea.MessagePillar)
	if message == "" || marketingTextNeedsKoreanFallback(message) {
		return fmt.Sprintf("%s는 지나간 거래를 감각이 아니라 기록과 복기로 다시 이어 보게 돕습니다.", productName)
	}
	return message
}

func marketingTextNeedsKoreanFallback(text string) bool {
	letters := 0
	hangul := 0
	for _, r := range text {
		if unicode.IsLetter(r) {
			letters++
		}
		if r >= '가' && r <= '힣' {
			hangul++
		}
	}
	return letters > 0 && hangul == 0
}

func marketingFallbackQuestion(idea *entities.MarketingIdea) string {
	switch idea.EvidenceSource {
	case entities.MarketingEvidenceTeamChat:
		return "같은 대화를 봐도 왜 사람마다 해석이 다르게 남을까요?"
	case entities.MarketingEvidenceNews:
		return "뉴스를 본 뒤에도 왜 판단 기준은 더 흐려질까요?"
	case entities.MarketingEvidenceScreenshot:
		return "화면은 남는데, 그때의 판단 이유는 왜 같이 안 남을까요?"
	default:
		return "시간이 지나면 왜 그렇게 판단했는지 왜 가장 먼저 흐려질까요?"
	}
}

func marketingFallbackHook(rawNote string) string {
	hook := collapseMarketingWhitespace(rawNote)
	if hook == "" {
		return "거래를 끝내고 나면 왜 그렇게 판단했는지 빠르게 흐려질 때가 있습니다."
	}
	if utf8.RuneCountInString(hook) > 140 {
		return truncateMarketingRunes(hook, 140) + "..."
	}
	return marketingEnsureSentenceEnding(hook)
}

func marketingRawNoteCarriesProblemFrame(text string) bool {
	return marketingContainsAny(text,
		"기록", "복기", "메모", "판단", "대처", "불안", "흐려", "반복", "기준", "왜 그렇게",
	)
}

func marketingEnsureSentenceEnding(text string) string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return trimmed
	}
	lastRune, _ := utf8.DecodeLastRuneInString(trimmed)
	switch lastRune {
	case '.', '!', '?', '…', '。':
		return trimmed
	default:
		return trimmed + "."
	}
}

func marketingFallbackProblemLine(angle string) string {
	switch angle {
	case entities.MarketingAnglePersonal:
		return "문제는 시간이 지나면 그 판단이 내 기준이었는지 순간 감각이었는지 구분이 흐려진다는 점입니다."
	case entities.MarketingAngleDevLog:
		return "그래서 기록이 나중에 다시 읽히도록, 판단 이유와 결과를 한 흐름으로 남기는 쪽으로 만들고 있습니다."
	case entities.MarketingAngleEducation:
		return "핵심은 지식을 더하는 것보다, 실제 판단 맥락을 다시 꺼내볼 수 있게 만드는 것입니다."
	default:
		return "문제는 며칠만 지나도 왜 그렇게 판단했는지 기억이 흐려지고, 같은 실수가 반복되기 쉽다는 점입니다."
	}
}

func truncateMarketingRunes(raw string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}

	var builder strings.Builder
	count := 0
	for _, r := range raw {
		if count >= maxRunes {
			break
		}
		builder.WriteRune(r)
		count++
	}
	return strings.TrimSpace(builder.String())
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
	case entities.MarketingProductMoneyVessel:
		return "MoneyVessel"
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
		"entry":      "진입 타이밍 조언처럼 읽히지 않도록 표현을 다시 확인하세요",
		"exit":       "청산 타이밍 조언처럼 읽히지 않도록 표현을 다시 확인하세요",
		"buy":        "매수 추천처럼 읽히지 않도록 표현을 다시 확인하세요",
		"sell":       "매도 추천처럼 읽히지 않도록 표현을 다시 확인하세요",
		"rsi":        "지표 기반 매매 신호처럼 읽히지 않도록 표현을 다시 확인하세요",
		"수익":         "수익 보장처럼 보이는 표현을 다시 확인하세요",
		"진입":         "진입 타이밍 조언처럼 읽히지 않도록 표현을 다시 확인하세요",
		"청산":         "청산 타이밍 조언처럼 읽히지 않도록 표현을 다시 확인하세요",
		"매수":         "매수 추천처럼 읽히지 않도록 표현을 다시 확인하세요",
		"매도":         "매도 추천처럼 읽히지 않도록 표현을 다시 확인하세요",
		"반등":         "반등 예측이나 매매 신호처럼 읽히지 않도록 표현을 다시 확인하세요",
		"추천":         "매수 추천처럼 보이는 표현을 다시 확인하세요",
		"성공":         "성공을 약속하는 표현처럼 읽히지 않는지 확인하세요",
		"전략":         "전략 우위나 확실한 기준처럼 읽히는 표현을 다시 확인하세요",
		"도움":         "효과를 단정하는 표현이 없는지 다시 확인하세요",
		"더 나은 판단":    "판단 개선을 보장하는 표현이 없는지 다시 확인하세요",
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

	switch idea.EvidenceSource {
	case entities.MarketingEvidenceTeamChat:
		teamChatFlag := "팀 대화 인용이 공개 가능한지, 이름이나 민감 정보가 남아 있지 않은지 확인하세요"
		if _, exists := seen[teamChatFlag]; !exists {
			flags = append(flags, teamChatFlag)
		}
	case entities.MarketingEvidenceQuote:
		quoteFlag := "인용문은 짧게 쓰고 출처와 해석을 구분했는지 다시 확인하세요"
		if _, exists := seen[quoteFlag]; !exists {
			flags = append(flags, quoteFlag)
		}
	case entities.MarketingEvidenceNews:
		newsFlag := "뉴스 요약과 자신의 해석이 섞여 보이지 않도록 출처와 해석을 분리하세요"
		if _, exists := seen[newsFlag]; !exists {
			flags = append(flags, newsFlag)
		}
	case entities.MarketingEvidenceScreenshot:
		screenFlag := "화면 캡처가 실제 현재 기능과 같은지, 가려야 할 정보가 없는지 확인하세요"
		if _, exists := seen[screenFlag]; !exists {
			flags = append(flags, screenFlag)
		}
	case entities.MarketingEvidenceGenerated:
		imageFlag := "생성 이미지를 실제 기능 화면이나 실데이터처럼 보이게 쓰지 않도록 확인하세요"
		if _, exists := seen[imageFlag]; !exists {
			flags = append(flags, imageFlag)
		}
	}
	return flags
}

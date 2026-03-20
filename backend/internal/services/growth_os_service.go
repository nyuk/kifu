package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type GrowthEventInput struct {
	UserID         *uuid.UUID
	GuestSessionID *string
	EventName      string
	SourcePath     *string
	Referrer       *string
	Metadata       map[string]any
	OccurredAt     *time.Time
}

type CreateGrowthFeedbackInput struct {
	ProductKey string
	SourceType string
	Bucket     string
	Title      string
	Body       string
	SourceURL  *string
	Metadata   map[string]any
	CreatedBy  *uuid.UUID
}

type GrowthDailyReportPayload struct {
	GeneratedAt time.Time                  `json:"generated_at"`
	ReportDate  string                     `json:"report_date"`
	Funnel      GrowthFunnelSection        `json:"funnel"`
	Content     GrowthContentSection       `json:"content"`
	Issues      []GrowthIssue              `json:"issues"`
	Feedback    GrowthFeedbackSection      `json:"feedback"`
	Operator    GrowthOperatorHintsSection `json:"operator"`
}

type GrowthFunnelSection struct {
	Counts   map[string]int  `json:"counts"`
	DropOffs []GrowthDropOff `json:"drop_offs"`
	Notes    []string        `json:"notes"`
}

type GrowthDropOff struct {
	From string `json:"from"`
	To   string `json:"to"`
	Lost int    `json:"lost"`
	Note string `json:"note"`
}

type GrowthContentSection struct {
	SourceUserID  *string              `json:"source_user_id,omitempty"`
	SourceStatus  string               `json:"source_status"`
	ReviewSummary string               `json:"review_summary"`
	XDrafts       []GrowthContentDraft `json:"x_drafts"`
}

type GrowthContentDraft struct {
	Kind    string `json:"kind"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

type GrowthIssue struct {
	Code     string `json:"code"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type GrowthFeedbackSection struct {
	InboxCount int `json:"inbox_count"`
	NextCount  int `json:"next_count"`
	LaterCount int `json:"later_count"`
}

type GrowthOperatorHintsSection struct {
	RecommendedActions []string `json:"recommended_actions"`
}

type GrowthOSService struct {
	growthRepo repositories.GrowthRepository
	tradeRepo  repositories.TradeRepository
	now        func() time.Time
	location   *time.Location
}

func NewGrowthOSService(
	growthRepo repositories.GrowthRepository,
	tradeRepo repositories.TradeRepository,
) *GrowthOSService {
	location, err := time.LoadLocation("Asia/Seoul")
	if err != nil {
		location = time.UTC
	}
	return &GrowthOSService{
		growthRepo: growthRepo,
		tradeRepo:  tradeRepo,
		now:        func() time.Time { return time.Now().UTC() },
		location:   location,
	}
}

func (s *GrowthOSService) TrackEvent(ctx context.Context, input GrowthEventInput) error {
	eventName := normalizeGrowthEventName(input.EventName)
	if eventName == "" {
		return fmt.Errorf("invalid event_name")
	}
	now := s.now()
	occurredAt := now
	if input.OccurredAt != nil {
		occurredAt = input.OccurredAt.UTC()
	}
	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return fmt.Errorf("marshal growth metadata: %w", err)
	}
	if len(metadata) == 0 {
		metadata = []byte(`{}`)
	}
	return s.growthRepo.CreateFunnelEvent(ctx, &entities.GrowthFunnelEvent{
		ID:             uuid.New(),
		UserID:         input.UserID,
		GuestSessionID: input.GuestSessionID,
		EventName:      eventName,
		SourcePath:     trimOptional(input.SourcePath),
		Referrer:       trimOptional(input.Referrer),
		Metadata:       metadata,
		OccurredAt:     occurredAt,
		CreatedAt:      now,
	})
}

func (s *GrowthOSService) CreateFeedbackItem(ctx context.Context, input CreateGrowthFeedbackInput) (*entities.GrowthFeedbackItem, error) {
	productKey := strings.TrimSpace(strings.ToLower(input.ProductKey))
	if productKey == "" {
		productKey = entities.GrowthProductKifu
	}
	sourceType := normalizeFeedbackSourceType(input.SourceType)
	if sourceType == "" {
		return nil, fmt.Errorf("invalid source_type")
	}
	bucket := normalizeGrowthBucket(input.Bucket)
	if bucket == "" {
		return nil, fmt.Errorf("invalid bucket")
	}
	title := strings.TrimSpace(input.Title)
	body := strings.TrimSpace(input.Body)
	if title == "" || body == "" {
		return nil, fmt.Errorf("title and body are required")
	}
	now := s.now()
	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return nil, fmt.Errorf("marshal feedback metadata: %w", err)
	}
	if len(metadata) == 0 {
		metadata = []byte(`{}`)
	}
	item := &entities.GrowthFeedbackItem{
		ID:         uuid.New(),
		ProductKey: productKey,
		SourceType: sourceType,
		Bucket:     bucket,
		Title:      title,
		Body:       body,
		SourceURL:  trimOptional(input.SourceURL),
		Metadata:   metadata,
		CreatedBy:  input.CreatedBy,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.growthRepo.CreateFeedbackItem(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *GrowthOSService) GenerateDailyReport(ctx context.Context, reportDate time.Time) (*entities.GrowthDailyReport, error) {
	day := time.Date(reportDate.In(s.location).Year(), reportDate.In(s.location).Month(), reportDate.In(s.location).Day(), 0, 0, 0, 0, s.location)
	if existing, err := s.growthRepo.GetDailyReportByDate(ctx, day); err == nil && existing != nil {
		return existing, nil
	}

	from := day
	to := day.Add(24 * time.Hour)
	funnelCounts, err := s.growthRepo.CountFunnelEventsByRange(ctx, from, to)
	if err != nil {
		return nil, err
	}

	countMap := map[string]int{}
	for _, item := range funnelCounts {
		countMap[item.EventName] = item.Count
	}

	content, issues := s.buildContentSection(ctx, from, to)
	feedbackSection := s.buildFeedbackSection(ctx)
	dropOffs, notes := buildGrowthDropOffs(countMap)
	issues = append(issues, buildFunnelIssues(countMap)...)

	payload := GrowthDailyReportPayload{
		GeneratedAt: s.now(),
		ReportDate:  day.Format("2006-01-02"),
		Funnel: GrowthFunnelSection{
			Counts:   countMap,
			DropOffs: dropOffs,
			Notes:    notes,
		},
		Content:  content,
		Issues:   issues,
		Feedback: feedbackSection,
		Operator: GrowthOperatorHintsSection{
			RecommendedActions: buildOperatorActions(content, countMap, issues),
		},
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal growth daily report payload: %w", err)
	}

	report := &entities.GrowthDailyReport{
		ID:                 uuid.New(),
		ReportDate:         day,
		Status:             "ready",
		Payload:            rawPayload,
		ContentDraftsCount: len(content.XDrafts),
		IssuesCount:        len(issues),
		CreatedAt:          s.now(),
		UpdatedAt:          s.now(),
	}
	if err := s.growthRepo.CreateDailyReport(ctx, report); err != nil {
		return nil, err
	}
	return report, nil
}

func (s *GrowthOSService) GetLatestDailyReport(ctx context.Context) (*entities.GrowthDailyReport, error) {
	return s.growthRepo.GetLatestDailyReport(ctx)
}

func (s *GrowthOSService) buildContentSection(ctx context.Context, from, to time.Time) (GrowthContentSection, []GrowthIssue) {
	sourceUserID := strings.TrimSpace(os.Getenv("GROWTH_CONTENT_USER_ID"))
	if sourceUserID == "" {
		return GrowthContentSection{
				SourceStatus:  "missing_source_user",
				ReviewSummary: "성장용 콘텐츠 소스 유저가 아직 설정되지 않았습니다.",
				XDrafts:       nil,
			}, []GrowthIssue{{
				Code:     "missing_growth_content_user",
				Severity: "warning",
				Message:  "GROWTH_CONTENT_USER_ID가 비어 있어 거래 기반 콘텐츠 초안을 생성하지 못했습니다.",
			}}
	}

	userID, err := uuid.Parse(sourceUserID)
	if err != nil {
		return GrowthContentSection{
				SourceStatus:  "invalid_source_user",
				ReviewSummary: "성장용 콘텐츠 소스 유저 설정이 올바르지 않습니다.",
				XDrafts:       nil,
			}, []GrowthIssue{{
				Code:     "invalid_growth_content_user",
				Severity: "warning",
				Message:  "GROWTH_CONTENT_USER_ID 형식이 잘못되었습니다.",
			}}
	}

	filter := repositories.TradeFilter{
		From:  &from,
		To:    &to,
		Limit: 500,
		Sort:  "desc",
	}
	summary, _, symbols, err := s.tradeRepo.Summary(ctx, userID, filter)
	if err != nil {
		return GrowthContentSection{
				SourceStatus:  "summary_error",
				ReviewSummary: "전일 거래 요약을 생성하지 못했습니다.",
				XDrafts:       nil,
				SourceUserID:  ptrString(userID.String()),
			}, []GrowthIssue{{
				Code:     "trade_summary_failed",
				Severity: "warning",
				Message:  fmt.Sprintf("전일 거래 요약 생성 실패: %v", err),
			}}
	}

	if summary.TotalTrades == 0 {
		return GrowthContentSection{
				SourceStatus:  "no_trades",
				ReviewSummary: "전일 거래가 없어 거래 기반 초안을 만들지 않았습니다.",
				XDrafts:       nil,
				SourceUserID:  ptrString(userID.String()),
			}, []GrowthIssue{{
				Code:     "no_trade_activity",
				Severity: "info",
				Message:  "전일 거래가 없어 X 초안은 생성하지 않았습니다.",
			}}
	}

	return GrowthContentSection{
		SourceStatus:  "ready",
		SourceUserID:  ptrString(userID.String()),
		ReviewSummary: buildReviewSummary(from, summary, symbols),
		XDrafts:       buildXDrafts(from, summary, symbols),
	}, nil
}

func (s *GrowthOSService) buildFeedbackSection(ctx context.Context) GrowthFeedbackSection {
	inbox, _ := s.growthRepo.ListFeedbackByBucket(ctx, entities.GrowthProductKifu, entities.GrowthBucketInbox, 50)
	next, _ := s.growthRepo.ListFeedbackByBucket(ctx, entities.GrowthProductKifu, entities.GrowthBucketNext, 50)
	later, _ := s.growthRepo.ListFeedbackByBucket(ctx, entities.GrowthProductKifu, entities.GrowthBucketLater, 50)
	return GrowthFeedbackSection{
		InboxCount: len(inbox),
		NextCount:  len(next),
		LaterCount: len(later),
	}
}

func buildReviewSummary(day time.Time, summary repositories.TradeSummary, symbols []repositories.TradeSymbolSummary) string {
	topSymbol := "분산"
	if len(symbols) > 0 {
		sort.Slice(symbols, func(i, j int) bool { return symbols[i].TradeCount > symbols[j].TradeCount })
		topSymbol = symbols[0].Symbol
	}
	return fmt.Sprintf(
		"%s 기준 총 %d건의 거래가 있었고, 가장 많이 다룬 심볼은 %s였습니다. 이 요약은 X 초안과 전일 운영 리포트의 공통 근거로 사용합니다.",
		day.In(time.UTC).Format("2006-01-02"),
		summary.TotalTrades,
		topSymbol,
	)
}

func buildXDrafts(day time.Time, summary repositories.TradeSummary, symbols []repositories.TradeSymbolSummary) []GrowthContentDraft {
	topSymbol := "시장에서"
	if len(symbols) > 0 {
		sort.Slice(symbols, func(i, j int) bool { return symbols[i].TradeCount > symbols[j].TradeCount })
		topSymbol = symbols[0].Symbol
	}

	volumeLine := "전일 거래 흐름"
	if summary.RealizedPnLTotal != nil {
		volumeLine = fmt.Sprintf("전일 실현손익 %s", *summary.RealizedPnLTotal)
	}

	return []GrowthContentDraft{
		{
			Kind:  "problem",
			Title: "초안 1 · 기록이 없으면 판단도 없다",
			Content: fmt.Sprintf(
				"어제 %d건의 거래를 다시 복기하면서 느낀 점: 매매보다 더 큰 문제는 기록 누락입니다. KIFU는 %s 같은 실제 거래 흔적을 기준으로 첫 복기까지 바로 이어지게 만들고 있습니다. %s",
				summary.TotalTrades,
				topSymbol,
				volumeLine,
			),
		},
		{
			Kind:  "feature",
			Title: "초안 2 · 첫 복기를 끝내는 제품으로",
			Content: fmt.Sprintf(
				"전일 %d건 거래 데이터로 오늘의 복기 포인트를 자동 정리했습니다. 목표는 기능을 더 붙이는 게 아니라, 실제 사용자가 첫 복기를 끝내도록 만드는 것. KIFU Growth OS v0.1은 그 루프를 측정 가능한 구조로 바꾸는 중입니다.",
				summary.TotalTrades,
			),
		},
		{
			Kind:  "dev_log",
			Title: "초안 3 · 전일 운영 메모",
			Content: fmt.Sprintf(
				"어제 데이터 기준 핵심 메모: 총 %d건 거래, 매수 %d / 매도 %d. 오늘은 이 숫자를 바탕으로 퍼널과 첫 복기 완료 수를 같이 본다. KIFU는 기능 경쟁보다 성장 루프 정착을 우선순위로 잡았다.",
				summary.TotalTrades,
				summary.BuyCount,
				summary.SellCount,
			),
		},
	}
}

func buildGrowthDropOffs(counts map[string]int) ([]GrowthDropOff, []string) {
	transitions := [][2]string{
		{entities.GrowthEventVisit, entities.GrowthEventGuestStart},
		{entities.GrowthEventGuestStart, entities.GrowthEventSignupCompleted},
		{entities.GrowthEventSignupCompleted, entities.GrowthEventCSVUploadComplete},
		{entities.GrowthEventCSVUploadComplete, entities.GrowthEventFirstReviewComplete},
	}
	dropOffs := make([]GrowthDropOff, 0, len(transitions))
	notes := make([]string, 0, len(transitions))
	for _, pair := range transitions {
		fromCount := counts[pair[0]]
		toCount := counts[pair[1]]
		lost := fromCount - toCount
		if lost < 0 {
			lost = 0
		}
		note := fmt.Sprintf("%s -> %s 전환에서 %d명 이탈", pair[0], pair[1], lost)
		dropOffs = append(dropOffs, GrowthDropOff{
			From: pair[0],
			To:   pair[1],
			Lost: lost,
			Note: note,
		})
		notes = append(notes, note)
	}
	return dropOffs, notes
}

func buildFunnelIssues(counts map[string]int) []GrowthIssue {
	issues := make([]GrowthIssue, 0, 3)
	if counts[entities.GrowthEventVisit] > 0 && counts[entities.GrowthEventGuestStart] == 0 {
		issues = append(issues, GrowthIssue{
			Code:     "visit_without_guest_start",
			Severity: "warning",
			Message:  "방문은 있었지만 게스트 시작으로 이어지지 않았습니다.",
		})
	}
	if counts[entities.GrowthEventSignupCompleted] > 0 && counts[entities.GrowthEventCSVUploadComplete] == 0 && counts[entities.GrowthEventAPIConnectComplete] == 0 {
		issues = append(issues, GrowthIssue{
			Code:     "signup_without_import",
			Severity: "warning",
			Message:  "회원가입 이후 CSV 업로드나 API 연결 완료가 없습니다.",
		})
	}
	if counts[entities.GrowthEventFirstReviewComplete] == 0 {
		issues = append(issues, GrowthIssue{
			Code:     "no_first_review_completion",
			Severity: "warning",
			Message:  "첫 복기 완료 이벤트가 아직 기록되지 않았습니다.",
		})
	}
	return issues
}

func buildOperatorActions(content GrowthContentSection, counts map[string]int, issues []GrowthIssue) []string {
	actions := []string{}
	if len(content.XDrafts) > 0 {
		actions = append(actions, "자동 생성된 X 초안 중 오늘 게시할 1개를 선택합니다.")
	}
	if counts[entities.GrowthEventFirstReviewComplete] == 0 {
		actions = append(actions, "첫 복기 완료까지 이어지지 않는 구간을 확인하고 오늘 개선할 1개만 선택합니다.")
	}
	if len(issues) > 0 {
		actions = append(actions, "운영 리포트의 주요 이슈 3개 중 가장 영향이 큰 것부터 정리합니다.")
	}
	if len(actions) == 0 {
		actions = append(actions, "퍼널과 초안을 확인한 뒤 오늘 실험할 한 가지를 정합니다.")
	}
	return actions
}

func normalizeGrowthEventName(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	switch value {
	case entities.GrowthEventVisit,
		entities.GrowthEventGuestStart,
		entities.GrowthEventSignupCompleted,
		entities.GrowthEventCSVUploadComplete,
		entities.GrowthEventAPIConnectComplete,
		entities.GrowthEventFirstReviewComplete,
		entities.GrowthEventDropOff:
		return value
	default:
		return ""
	}
}

func normalizeGrowthBucket(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	switch value {
	case entities.GrowthBucketInbox, entities.GrowthBucketNext, entities.GrowthBucketLater, entities.GrowthBucketDone:
		return value
	default:
		return ""
	}
}

func normalizeFeedbackSourceType(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	switch value {
	case entities.GrowthFeedbackSourceExternal, entities.GrowthFeedbackSourceInternal, entities.GrowthFeedbackSourceIdea:
		return value
	default:
		return ""
	}
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func ptrString(value string) *string {
	return &value
}

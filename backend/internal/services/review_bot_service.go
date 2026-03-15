package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
)

type ReviewBotService struct {
	planRepo    repositories.TradePlanRepository
	channelRepo repositories.NotificationChannelRepository
	alertRepo   repositories.AlertRepository
	tradeRepo   repositories.TradeRepository
	tgSender    *notification.TelegramSender
}

func NewReviewBotService(
	planRepo repositories.TradePlanRepository,
	channelRepo repositories.NotificationChannelRepository,
	alertRepo repositories.AlertRepository,
	tradeRepo repositories.TradeRepository,
	tgSender *notification.TelegramSender,
) *ReviewBotService {
	return &ReviewBotService{
		planRepo:    planRepo,
		channelRepo: channelRepo,
		alertRepo:   alertRepo,
		tradeRepo:   tradeRepo,
		tgSender:    tgSender,
	}
}

// StartTestFlow sends a test plan keyboard for E2E testing.
func (s *ReviewBotService) StartTestFlow(ctx context.Context, chatID int64) error {
	channel, err := s.channelRepo.GetByChatID(ctx, chatID)
	if err != nil || channel == nil {
		if s.tgSender != nil {
			_ = s.tgSender.SendToChatID(ctx, chatID, "먼저 텔레그램 연동을 해주세요.")
		}
		return nil
	}

	// Create a trade plan directly (skip alert creation to avoid FK issues)
	now := time.Now().UTC()
	entryPrice := "95000"
	plan := &entities.TradePlan{
		ID:         uuid.New(),
		UserID:     channel.UserID,
		Symbol:     "BTCUSDT",
		Action:     entities.PlanActionBuy,
		EntryPrice: &entryPrice,
		Status:     entities.PlanStatusPending,
		ChatID:     chatID,
		CreatedAt:  now,
	}

	if err := s.planRepo.Create(ctx, plan); err != nil {
		log.Printf("review bot: create test plan failed: %v", err)
		return err
	}

	// Send reason keyboard directly (skip action step since it's a test)
	keyboard := notification.InlineKeyboard{
		InlineKeyboard: [][]notification.InlineButton{
			{
				{Text: "지표 도달", CallbackData: fmt.Sprintf("reason:%s:indicator", plan.ID)},
				{Text: "트위터/뉴스", CallbackData: fmt.Sprintf("reason:%s:twitter", plan.ID)},
			},
			{
				{Text: "FOMO", CallbackData: fmt.Sprintf("reason:%s:fomo", plan.ID)},
				{Text: "직접 입력", CallbackData: fmt.Sprintf("reason:%s:custom", plan.ID)},
			},
		},
	}

	text := fmt.Sprintf("\xe2\x9c\x85 <b>테스트 복기</b> — BTCUSDT $%s\n\n왜 매수하나요?", entryPrice)
	return s.tgSender.SendKeyboardToChatID(ctx, chatID, text, &keyboard)
}

// SendPlanKeyboard sends inline keyboard after an alert notification.
func (s *ReviewBotService) SendPlanKeyboard(ctx context.Context, userID uuid.UUID, alert *entities.Alert) {
	if s.tgSender == nil {
		return
	}

	// Get past plans for this symbol to show pattern
	pastPlans, _ := s.planRepo.ListBySymbol(ctx, userID, alert.Symbol, 10)
	patternText := buildPatternSummary(pastPlans)

	text := fmt.Sprintf("\xf0\x9f\x93\x8b <b>거래 복기</b> — %s\n\n", alert.Symbol)
	if patternText != "" {
		text += patternText + "\n"
	}
	text += "이 알림을 보고 매수할 건가요?"

	keyboard := notification.InlineKeyboard{
		InlineKeyboard: [][]notification.InlineButton{
			{
				{Text: "매수한다", CallbackData: fmt.Sprintf("plan:buy:%s", alert.ID)},
				{Text: "안 한다", CallbackData: fmt.Sprintf("plan:skip:%s", alert.ID)},
			},
		},
	}

	if err := s.tgSender.SendWithKeyboard(ctx, userID, text, keyboard); err != nil {
		log.Printf("review bot: send plan keyboard failed: %v", err)
	}
}

// HandleAction processes the buy/skip callback.
func (s *ReviewBotService) HandleAction(ctx context.Context, chatID int64, alertIDStr string, action string) (string, *notification.InlineKeyboard) {
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		return "잘못된 알림 ID입니다.", nil
	}

	// Resolve user from chatID
	channel, err := s.channelRepo.GetByChatID(ctx, chatID)
	if err != nil || channel == nil {
		return "텔레그램 연동 정보를 찾을 수 없습니다.", nil
	}
	userID := channel.UserID

	// Get alert for symbol/price
	alert, err := s.alertRepo.GetByID(ctx, alertID)
	if err != nil || alert == nil {
		return "알림 정보를 찾을 수 없습니다.", nil
	}

	planAction := entities.PlanActionBuy
	if action == "skip" {
		planAction = entities.PlanActionSkip
	}

	now := time.Now().UTC()
	entryPrice := alert.TriggerPrice
	plan := &entities.TradePlan{
		ID:         uuid.New(),
		UserID:     userID,
		AlertID:    &alertID,
		Symbol:     alert.Symbol,
		Action:     planAction,
		EntryPrice: &entryPrice,
		Status:     entities.PlanStatusPending,
		ChatID:     chatID,
		CreatedAt:  now,
	}

	if err := s.planRepo.Create(ctx, plan); err != nil {
		log.Printf("review bot: create plan failed: %v", err)
		return "기록 저장 실패. 다시 시도해주세요.", nil
	}

	if action == "skip" {
		plan.Status = entities.PlanStatusComplete
		plan.CompletedAt = &now
		_ = s.planRepo.Update(ctx, plan)
		return fmt.Sprintf("\xe2\x8f\xad <b>%s</b> 패스 기록 완료\n\n나중에 결과를 비교해드릴게요.", alert.Symbol), nil
	}

	// Buy — ask for reason
	keyboard := notification.InlineKeyboard{
		InlineKeyboard: [][]notification.InlineButton{
			{
				{Text: "지표 도달", CallbackData: fmt.Sprintf("reason:%s:indicator", plan.ID)},
				{Text: "트위터/뉴스", CallbackData: fmt.Sprintf("reason:%s:twitter", plan.ID)},
			},
			{
				{Text: "FOMO", CallbackData: fmt.Sprintf("reason:%s:fomo", plan.ID)},
				{Text: "직접 입력", CallbackData: fmt.Sprintf("reason:%s:custom", plan.ID)},
			},
		},
	}

	return fmt.Sprintf("\xe2\x9c\x85 <b>%s</b> 매수 기록\n\n왜 매수하나요?", alert.Symbol), &keyboard
}

// HandleReason processes the reason callback.
func (s *ReviewBotService) HandleReason(ctx context.Context, planIDStr string, reason string) (string, *notification.InlineKeyboard) {
	planID, err := uuid.Parse(planIDStr)
	if err != nil {
		return "잘못된 계획 ID입니다.", nil
	}

	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return "계획을 찾을 수 없습니다.", nil
	}
	if plan.Status == entities.PlanStatusComplete {
		return "이미 완료된 계획입니다.", nil
	}

	plan.Reason = &reason
	if err := s.planRepo.Update(ctx, plan); err != nil {
		log.Printf("review bot: update reason failed: %v", err)
		return "기록 저장 실패.", nil
	}

	if reason == "custom" {
		return "이유를 직접 입력해주세요:", nil
	}

	return fmt.Sprintf("\xf0\x9f\x93\x9d 이유: %s\n\n손절가를 입력해주세요 (숫자만):", reasonToLabel(reason)), nil
}

// HandleText processes free text messages (stop-loss price or custom reason).
func (s *ReviewBotService) HandleText(ctx context.Context, chatID int64, text string) (string, *notification.InlineKeyboard) {
	plan, err := s.planRepo.GetLatestByChatID(ctx, chatID, entities.PlanStatusPending)
	if err != nil || plan == nil {
		return "", nil // No pending plan, ignore
	}

	// Custom reason text not yet filled
	if plan.Reason != nil && *plan.Reason == "custom" && plan.ReasonText == nil {
		plan.ReasonText = &text
		if err := s.planRepo.Update(ctx, plan); err != nil {
			log.Printf("review bot: update custom reason failed: %v", err)
			return "기록 저장 실패.", nil
		}
		return fmt.Sprintf("\xf0\x9f\x93\x9d 이유: %s\n\n손절가를 입력해주세요 (숫자만):", text), nil
	}

	// Stop-loss price
	trimmed := strings.TrimSpace(text)
	if !isNumericish(trimmed) {
		return "숫자만 입력해주세요 (예: 58000):", nil
	}

	plan.StopLoss = &trimmed
	plan.Status = entities.PlanStatusComplete
	now := time.Now().UTC()
	plan.CompletedAt = &now

	if err := s.planRepo.Update(ctx, plan); err != nil {
		log.Printf("review bot: update stop loss failed: %v", err)
		return "기록 저장 실패.", nil
	}

	reasonLabel := "직접입력"
	if plan.Reason != nil && *plan.Reason != "custom" {
		reasonLabel = reasonToLabel(*plan.Reason)
	} else if plan.ReasonText != nil {
		reasonLabel = *plan.ReasonText
	}

	entry := "N/A"
	if plan.EntryPrice != nil {
		entry = *plan.EntryPrice
	}

	return fmt.Sprintf("\xe2\x9c\x85 <b>거래 계획 저장 완료!</b>\n\n"+
		"\xf0\x9f\x93\x8c %s\n"+
		"\xf0\x9f\x92\xb0 진입: $%s\n"+
		"\xf0\x9f\x9b\x91 손절: $%s\n"+
		"\xf0\x9f\x93\x9d 이유: %s\n\n"+
		"거래소에서 직접 실행하세요.\n"+
		"나중에 실제 거래와 자동 비교해드릴게요.",
		plan.Symbol, entry, trimmed, reasonLabel), nil
}

// GetRecentPlans returns recent trade plans for a user.
func (s *ReviewBotService) GetRecentPlans(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.TradePlan, error) {
	return s.planRepo.ListByUser(ctx, userID, limit)
}

func buildPatternSummary(plans []*entities.TradePlan) string {
	if len(plans) == 0 {
		return ""
	}

	var buyCount, skipCount int
	var buyPnLSum, skipPnLSum float64
	var buyWithPnL, skipWithPnL int

	for _, p := range plans {
		if p.Action == entities.PlanActionBuy {
			buyCount++
			if p.PlanPnLPercent != nil {
				var pnl float64
				fmt.Sscanf(*p.PlanPnLPercent, "%f", &pnl)
				buyPnLSum += pnl
				buyWithPnL++
			}
		} else {
			skipCount++
			if p.PlanPnLPercent != nil {
				var pnl float64
				fmt.Sscanf(*p.PlanPnLPercent, "%f", &pnl)
				skipPnLSum += pnl
				skipWithPnL++
			}
		}
	}

	var b strings.Builder
	b.WriteString(fmt.Sprintf("\xf0\x9f\x93\x8a 지난 %d번 비슷한 상황:\n", len(plans)))
	if buyCount > 0 {
		avg := ""
		if buyWithPnL > 0 {
			avg = fmt.Sprintf(" \xe2\x86\x92 평균 %.1f%%", buyPnLSum/float64(buyWithPnL))
		}
		b.WriteString(fmt.Sprintf(" \xe2\x80\xa2 %d번 매수%s\n", buyCount, avg))
	}
	if skipCount > 0 {
		avg := ""
		if skipWithPnL > 0 {
			avg = fmt.Sprintf(" \xe2\x86\x92 평균 %.1f%%", skipPnLSum/float64(skipWithPnL))
		}
		b.WriteString(fmt.Sprintf(" \xe2\x80\xa2 %d번 패스%s\n", skipCount, avg))
	}

	return b.String()
}

func reasonToLabel(reason string) string {
	switch reason {
	case "indicator":
		return "지표 도달"
	case "twitter":
		return "트위터/뉴스"
	case "fomo":
		return "FOMO"
	case "custom":
		return "직접입력"
	default:
		return reason
	}
}

func isNumericish(s string) bool {
	if s == "" {
		return false
	}
	dotSeen := false
	for i, c := range s {
		if c == '-' && i == 0 {
			continue
		}
		if c == '.' && !dotSeen {
			dotSeen = true
			continue
		}
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

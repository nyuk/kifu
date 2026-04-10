package jobs

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
)

type PlanMatcher struct {
	planRepo             repositories.TradePlanRepository
	tgSender             *notification.TelegramSender
	disabledMissingTable bool
}

func NewPlanMatcher(
	planRepo repositories.TradePlanRepository,
	tgSender *notification.TelegramSender,
) *PlanMatcher {
	return &PlanMatcher{
		planRepo: planRepo,
		tgSender: tgSender,
	}
}

func (m *PlanMatcher) Start(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.runOnce(ctx)
			}
		}
	}()
}

func (m *PlanMatcher) runOnce(ctx context.Context) {
	if m.disabledMissingTable {
		return
	}

	// 1) Single JOIN query: find all unmatched plans that have a matching trade
	matches, err := m.planRepo.MatchWithTrades(ctx, 100)
	if err != nil {
		if isMissingTradePlansTable(err) {
			m.disabledMissingTable = true
			log.Printf("plan matcher: trade_plans 테이블이 없어 비활성화합니다. backend/migrations/032_trade_plans.sql 적용 후 재시작하면 다시 활성화됩니다.")
			return
		}
		log.Printf("plan matcher: match query failed: %v", err)
		return
	}

	for _, match := range matches {
		plan := match.Plan
		now := time.Now().UTC()
		plan.MatchedTradeID = &match.TradeID
		plan.MatchedAt = &now

		if plan.EntryPrice != nil {
			pnl := calculatePlanPnL(*plan.EntryPrice, match.TradePrice)
			if pnl != "" {
				plan.PlanPnLPercent = &pnl
			}
		}

		if err := m.planRepo.Update(ctx, plan); err != nil {
			log.Printf("plan matcher: update plan %s failed: %v", plan.ID, err)
			continue
		}

		log.Printf("plan matcher: matched plan %s -> trade %s", plan.ID, match.TradeID)

		if m.tgSender != nil && plan.ChatID != 0 {
			m.sendMatchNotification(ctx, plan, match.TradePrice)
		}
	}

	// 2) Single UPDATE: expire plans older than 24h with no trade match
	expired, err := m.planRepo.ExpireOld(ctx, 24*time.Hour)
	if err != nil {
		if isMissingTradePlansTable(err) {
			m.disabledMissingTable = true
			log.Printf("plan matcher: trade_plans 테이블이 없어 비활성화합니다. backend/migrations/032_trade_plans.sql 적용 후 재시작하면 다시 활성화됩니다.")
			return
		}
		log.Printf("plan matcher: expire failed: %v", err)
	} else if expired > 0 {
		log.Printf("plan matcher: expired %d unmatched plans", expired)
	}
}

func isMissingTradePlansTable(err error) bool {
	if err == nil {
		return false
	}
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "trade_plans") &&
		(strings.Contains(text, "sqlstate 42p01") ||
			strings.Contains(text, "relation") ||
			strings.Contains(text, "릴레이션"))
}

func (m *PlanMatcher) sendMatchNotification(ctx context.Context, plan *entities.TradePlan, tradePrice string) {
	entry := "N/A"
	if plan.EntryPrice != nil {
		entry = *plan.EntryPrice
	}

	pnlText := ""
	if plan.PlanPnLPercent != nil {
		pnlText = fmt.Sprintf("\n\xf0\x9f\x93\x89 계획 vs 실제: %s%%", *plan.PlanPnLPercent)
	}

	stopLossText := ""
	if plan.StopLoss != nil {
		stopLossText = fmt.Sprintf("\n\xf0\x9f\x9b\x91 손절가: $%s", *plan.StopLoss)
	}

	text := fmt.Sprintf("\xf0\x9f\x94\x97 <b>거래 매칭 완료!</b>\n\n"+
		"\xf0\x9f\x93\x8c %s\n"+
		"\xf0\x9f\x93\x9d 계획 진입가: $%s\n"+
		"\xf0\x9f\x92\xb0 실제 체결가: $%s%s%s\n\n"+
		"계획대로 실행했는지 확인해보세요.",
		plan.Symbol, entry, tradePrice, pnlText, stopLossText)

	_ = m.tgSender.SendToChatID(ctx, plan.ChatID, text)
}

func calculatePlanPnL(entryPrice, tradePrice string) string {
	entry, ok := parsePlanDecimal(entryPrice)
	if !ok {
		return ""
	}
	actual, ok := parsePlanDecimal(tradePrice)
	if !ok {
		return ""
	}
	if entry.Sign() == 0 {
		return ""
	}

	diff := new(big.Rat).Sub(actual, entry)
	ratio := new(big.Rat).Quo(diff, entry)
	ratio.Mul(ratio, big.NewRat(100, 1))
	return formatPlanDecimal(ratio, 4)
}

func parsePlanDecimal(value string) (*big.Rat, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, false
	}
	rat := new(big.Rat)
	if _, ok := rat.SetString(value); !ok {
		return nil, false
	}
	return rat, true
}

func formatPlanDecimal(value *big.Rat, scale int) string {
	if value == nil {
		return ""
	}
	formatted := value.FloatString(scale)
	formatted = strings.TrimRight(formatted, "0")
	formatted = strings.TrimRight(formatted, ".")
	if formatted == "" || formatted == "-" {
		return "0"
	}
	return formatted
}

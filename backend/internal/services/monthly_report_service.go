package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type MonthlyReportService struct {
	reportRepo   repositories.MonthlyReportRepository
	tradeRepo    repositories.TradeRepository
	bubbleRepo   repositories.BubbleRepository
	accuracyRepo repositories.AIOpinionAccuracyRepository
	safetyRepo   repositories.TradeSafetyReviewRepository
}

func NewMonthlyReportService(
	reportRepo repositories.MonthlyReportRepository,
	tradeRepo repositories.TradeRepository,
	bubbleRepo repositories.BubbleRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
	safetyRepo repositories.TradeSafetyReviewRepository,
) *MonthlyReportService {
	return &MonthlyReportService{
		reportRepo:   reportRepo,
		tradeRepo:    tradeRepo,
		bubbleRepo:   bubbleRepo,
		accuracyRepo: accuracyRepo,
		safetyRepo:   safetyRepo,
	}
}

// Generate creates a monthly report for the given user and month.
func (s *MonthlyReportService) Generate(ctx context.Context, userID uuid.UUID, year, month int) (*entities.MonthlyReport, error) {
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, 0)

	payload := entities.MonthlyReportPayload{
		SchemaVersion: "monthly_report_v1",
		Period: entities.MonthlyReportPeriod{
			Year:  year,
			Month: month,
			Label: fmt.Sprintf("%d년 %d월", year, month),
		},
	}

	// 1. Trade summary + top symbols (single trade fetch)
	trades, err := s.tradeRepo.ListByTimeRange(ctx, userID, from, to)
	if err != nil {
		log.Printf("monthly report: list trades failed: %v", err)
		trades = nil
	}
	payload.TradeSummary = buildTradeSummary(trades)
	payload.TopSymbols = buildTopSymbols(trades)

	// 2. Decision stats (bubbles) — use existing GetReviewStats
	payload.DecisionStats = s.buildDecisionStats(ctx, userID)

	// 3. AI accuracy — use existing GetProviderStats
	payload.AIAccuracy = s.buildAIAccuracy(ctx, userID)

	// 4. Mistake report (safety reviews) — use existing ListDaily
	payload.MistakeReport = s.buildMistakeReport(ctx, userID, from, to)

	// 5. Month-over-month comparison
	prevYear, prevMonth := prevMonthOf(year, month)
	prevReport, err := s.reportRepo.GetByMonth(ctx, userID, prevYear, prevMonth)
	if err != nil {
		log.Printf("monthly report: get previous month failed: %v", err)
	}
	if prevReport != nil {
		payload.Comparison = buildComparison(payload, prevReport)
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}

	report := &entities.MonthlyReport{
		ReportID:  uuid.New(),
		UserID:    userID,
		Year:      year,
		Month:     month,
		Payload:   payloadJSON,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.reportRepo.Create(ctx, report); err != nil {
		return nil, fmt.Errorf("save report: %w", err)
	}

	return report, nil
}

func buildTradeSummary(trades []*entities.Trade) entities.MonthlyTradeSummary {
	summary := entities.MonthlyTradeSummary{}
	if len(trades) == 0 {
		return summary
	}

	summary.TotalTrades = len(trades)
	var totalPnL float64
	wins := 0
	counted := 0

	for _, t := range trades {
		side := strings.ToUpper(t.Side)
		if side == "BUY" {
			summary.BuyCount++
		} else if side == "SELL" {
			summary.SellCount++
		}

		pnl := parseFloatStr(t.RealizedPnL)
		totalPnL += pnl

		if pnl != 0 {
			counted++
			if pnl > 0 {
				wins++
			}
		}
	}

	summary.RealizedPnL = totalPnL
	if counted > 0 {
		summary.WinRate = float64(wins) / float64(counted) * 100
		summary.AvgPnL = totalPnL / float64(counted)
	}

	return summary
}

func (s *MonthlyReportService) buildDecisionStats(ctx context.Context, userID uuid.UUID) entities.MonthlyDecisionStats {
	stats := entities.MonthlyDecisionStats{}

	// Use existing GetReviewStats with "30d" period as a reasonable proxy.
	// For the first version, this gives us bubble win rate and counts.
	reviewStats, err := s.bubbleRepo.GetReviewStats(ctx, userID, "30d", "", "", "", "")
	if err != nil {
		log.Printf("monthly report: get review stats failed: %v", err)
		return stats
	}
	if reviewStats == nil {
		return stats
	}

	stats.TotalBubbles = reviewStats.TotalBubbles
	stats.BubblesWithOutcome = reviewStats.BubblesWithOutcome
	stats.BubbleWinRate = reviewStats.Overall.WinRate

	avgPnL := parseFloatStr(strPtr(reviewStats.Overall.AvgPnL))
	stats.AvgBubblePnL = avgPnL

	return stats
}

func (s *MonthlyReportService) buildAIAccuracy(ctx context.Context, userID uuid.UUID) entities.MonthlyAIAccuracy {
	result := entities.MonthlyAIAccuracy{}

	providerStats, err := s.accuracyRepo.GetProviderStats(ctx, userID, "30d", "", "", "")
	if err != nil {
		log.Printf("monthly report: get provider stats failed: %v", err)
		return result
	}

	total, _, err := s.accuracyRepo.GetTotalStats(ctx, userID, "30d", "", "", "")
	if err != nil {
		log.Printf("monthly report: get total stats failed: %v", err)
	}
	result.TotalOpinions = total

	for provider, ps := range providerStats {
		result.ByProvider = append(result.ByProvider, entities.MonthlyProviderStats{
			Provider:     provider,
			TotalChecked: ps.Evaluated,
			CorrectCount: ps.Correct,
			Accuracy:     ps.Accuracy,
		})
	}

	sort.Slice(result.ByProvider, func(i, j int) bool {
		return result.ByProvider[i].Accuracy > result.ByProvider[j].Accuracy
	})

	return result
}

func (s *MonthlyReportService) buildMistakeReport(ctx context.Context, userID uuid.UUID, from, to time.Time) entities.MonthlyMistakeReport {
	result := entities.MonthlyMistakeReport{}

	items, _, err := s.safetyRepo.ListDaily(ctx, userID, repositories.DailySafetyFilter{
		From:  from,
		To:    to,
		Limit: 1000,
	})
	if err != nil {
		log.Printf("monthly report: list safety reviews failed: %v", err)
		return result
	}

	mistakePatterns := map[string]int{}

	for _, item := range items {
		if item.Verdict == nil {
			continue
		}
		verdict := *item.Verdict
		result.TotalReviewed++
		switch verdict {
		case "mistake":
			result.MistakeCount++
			side := ""
			if item.Side != nil {
				side = *item.Side
			}
			key := item.Symbol + ":" + side
			mistakePatterns[key]++
		case "intended":
			result.IntendedCount++
		case "unsure":
			result.UnsureCount++
		}
	}

	type kv struct {
		key   string
		count int
	}
	var sorted []kv
	for k, v := range mistakePatterns {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].count > sorted[j].count
	})

	limit := 5
	if len(sorted) < limit {
		limit = len(sorted)
	}
	for _, item := range sorted[:limit] {
		symbol := item.key
		side := ""
		if idx := strings.LastIndex(item.key, ":"); idx >= 0 {
			symbol = item.key[:idx]
			side = item.key[idx+1:]
		}
		result.TopMistakes = append(result.TopMistakes, entities.MonthlyMistake{
			Symbol: symbol,
			Side:   side,
			Count:  item.count,
		})
	}

	return result
}

func buildTopSymbols(trades []*entities.Trade) []entities.MonthlySymbolPerf {
	if len(trades) == 0 {
		return nil
	}

	type symbolAgg struct {
		count int
		pnl   float64
		wins  int
	}
	bySymbol := map[string]*symbolAgg{}

	for _, t := range trades {
		if t.Symbol == "" {
			continue
		}
		agg, ok := bySymbol[t.Symbol]
		if !ok {
			agg = &symbolAgg{}
			bySymbol[t.Symbol] = agg
		}
		agg.count++
		pnl := parseFloatStr(t.RealizedPnL)
		agg.pnl += pnl
		if pnl > 0 {
			agg.wins++
		}
	}

	var result []entities.MonthlySymbolPerf
	for sym, agg := range bySymbol {
		winRate := 0.0
		if agg.count > 0 {
			winRate = float64(agg.wins) / float64(agg.count) * 100
		}
		result = append(result, entities.MonthlySymbolPerf{
			Symbol:      sym,
			TradeCount:  agg.count,
			RealizedPnL: agg.pnl,
			WinRate:     winRate,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].TradeCount > result[j].TradeCount
	})

	if len(result) > 10 {
		result = result[:10]
	}
	return result
}

func buildComparison(current entities.MonthlyReportPayload, prevReport *entities.MonthlyReport) *entities.MonthlyComparison {
	var prev entities.MonthlyReportPayload
	if err := json.Unmarshal(prevReport.Payload, &prev); err != nil {
		log.Printf("monthly report: unmarshal previous report failed: %v", err)
		return nil
	}

	comp := &entities.MonthlyComparison{
		PnLChange:       current.TradeSummary.RealizedPnL - prev.TradeSummary.RealizedPnL,
		WinRateChange:   current.TradeSummary.WinRate - prev.TradeSummary.WinRate,
		TradeCountDiff:  current.TradeSummary.TotalTrades - prev.TradeSummary.TotalTrades,
		BubbleCountDiff: current.DecisionStats.TotalBubbles - prev.DecisionStats.TotalBubbles,
	}

	if len(current.AIAccuracy.ByProvider) > 0 && len(prev.AIAccuracy.ByProvider) > 0 {
		comp.AccuracyChange = current.AIAccuracy.ByProvider[0].Accuracy - prev.AIAccuracy.ByProvider[0].Accuracy
	}

	return comp
}

func prevMonthOf(year, month int) (int, int) {
	if month == 1 {
		return year - 1, 12
	}
	return year, month - 1
}

func parseFloatStr(v *string) float64 {
	if v == nil {
		return 0
	}
	var f float64
	fmt.Sscanf(*v, "%f", &f)
	return f
}

func strPtr(s string) *string {
	return &s
}

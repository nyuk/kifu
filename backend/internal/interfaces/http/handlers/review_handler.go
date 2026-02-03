package handlers

import (
	"fmt"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ReviewHandler struct {
	bubbleRepo   repositories.BubbleRepository
	outcomeRepo  repositories.OutcomeRepository
	accuracyRepo repositories.AIOpinionAccuracyRepository
}

func NewReviewHandler(
	bubbleRepo repositories.BubbleRepository,
	outcomeRepo repositories.OutcomeRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *ReviewHandler {
	return &ReviewHandler{
		bubbleRepo:   bubbleRepo,
		outcomeRepo:  outcomeRepo,
		accuracyRepo: accuracyRepo,
	}
}

type ReviewStatsResponse struct {
	Period             string                 `json:"period"`
	TotalBubbles       int                    `json:"total_bubbles"`
	BubblesWithOutcome int                    `json:"bubbles_with_outcome"`
	Overall            OverallStats           `json:"overall"`
	ByPeriod           map[string]PeriodStats `json:"by_period"`
	ByTag              map[string]TagStats    `json:"by_tag"`
	BySymbol           map[string]SymbolStats `json:"by_symbol"`
}

type OverallStats struct {
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

// GetStats returns review statistics
func (h *ReviewHandler) GetStats(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")
	symbol := c.Query("symbol", "")
	tag := c.Query("tag", "")

	stats, err := h.bubbleRepo.GetReviewStats(c.Context(), userID, period, symbol, tag)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(stats)
}

type AccuracyResponse struct {
	Period            string                                         `json:"period"`
	OutcomePeriod     string                                         `json:"outcome_period"`
	TotalOpinions     int                                            `json:"total_opinions"`
	EvaluatedOpinions int                                            `json:"evaluated_opinions"`
	ByProvider        map[string]*repositories.ProviderAccuracyStats `json:"by_provider"`
	Ranking           []ProviderRanking                              `json:"ranking"`
}

type ProviderRanking struct {
	Provider string  `json:"provider"`
	Accuracy float64 `json:"accuracy"`
	Rank     int     `json:"rank"`
}

// GetAccuracy returns AI provider accuracy statistics
func (h *ReviewHandler) GetAccuracy(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")
	outcomePeriod := c.Query("outcome_period", "1h")

	// Get provider stats
	byProvider, err := h.accuracyRepo.GetProviderStats(c.Context(), userID, period, outcomePeriod)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get total stats
	totalOpinions, evaluatedOpinions, err := h.accuracyRepo.GetTotalStats(c.Context(), userID, period, outcomePeriod)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Build ranking
	ranking := buildProviderRanking(byProvider)

	response := AccuracyResponse{
		Period:            period,
		OutcomePeriod:     outcomePeriod,
		TotalOpinions:     totalOpinions,
		EvaluatedOpinions: evaluatedOpinions,
		ByProvider:        byProvider,
		Ranking:           ranking,
	}

	return c.JSON(response)
}

func buildProviderRanking(byProvider map[string]*repositories.ProviderAccuracyStats) []ProviderRanking {
	ranking := make([]ProviderRanking, 0, len(byProvider))
	for provider, stats := range byProvider {
		ranking = append(ranking, ProviderRanking{
			Provider: provider,
			Accuracy: stats.Accuracy,
		})
	}

	// Sort by accuracy descending
	sort.Slice(ranking, func(i, j int) bool {
		return ranking[i].Accuracy > ranking[j].Accuracy
	})

	// Assign ranks
	for i := range ranking {
		ranking[i].Rank = i + 1
	}

	return ranking
}

type CalendarResponse struct {
	From string                              `json:"from"`
	To   string                              `json:"to"`
	Days map[string]repositories.CalendarDay `json:"days"`
}

// GetCalendar returns calendar view data
func (h *ReviewHandler) GetCalendar(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	fromStr := c.Query("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	toStr := c.Query("to", time.Now().Format("2006-01-02"))

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid from date"})
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid to date"})
	}

	calendarData, err := h.bubbleRepo.GetCalendarData(c.Context(), userID, from, to)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(CalendarResponse{
		From: fromStr,
		To:   toStr,
		Days: calendarData,
	})
}

type BubbleAccuracyResponse struct {
	BubbleID   uuid.UUID            `json:"bubble_id"`
	Accuracies []BubbleAccuracyItem `json:"accuracies"`
}

type BubbleAccuracyItem struct {
	OpinionID          uuid.UUID          `json:"opinion_id"`
	Provider           string             `json:"provider"`
	Period             string             `json:"period"`
	PredictedDirection entities.Direction `json:"predicted_direction"`
	ActualDirection    entities.Direction `json:"actual_direction"`
	IsCorrect          bool               `json:"is_correct"`
	PnLPercent         string             `json:"pnl_percent,omitempty"`
}

// GetBubbleAccuracy returns AI accuracy for a specific bubble
func (h *ReviewHandler) GetBubbleAccuracy(c *fiber.Ctx) error {
	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bubble id"})
	}

	accuracies, err := h.accuracyRepo.GetByBubbleID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get outcomes for PnL info
	outcomes, err := h.outcomeRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	outcomeMap := make(map[string]string) // period -> pnl_percent
	for _, o := range outcomes {
		outcomeMap[o.Period] = o.PnLPercent
	}

	items := make([]BubbleAccuracyItem, 0, len(accuracies))
	for _, acc := range accuracies {
		item := BubbleAccuracyItem{
			OpinionID:          acc.OpinionID,
			Provider:           acc.Provider,
			Period:             acc.Period,
			PredictedDirection: acc.PredictedDirection,
			ActualDirection:    acc.ActualDirection,
			IsCorrect:          acc.IsCorrect,
			PnLPercent:         outcomeMap[acc.Period],
		}
		items = append(items, item)
	}

	return c.JSON(BubbleAccuracyResponse{
		BubbleID:   bubbleID,
		Accuracies: items,
	})
}

type TrendDataPoint struct {
	Date          string  `json:"date"`
	PnL           float64 `json:"pnl"`
	CumulativePnL float64 `json:"cumulative_pnl"`
	WinRate       float64 `json:"win_rate"`
	BubbleCount   int     `json:"bubble_count"`
}

type TrendResponse struct {
	Period string           `json:"period"`
	Data   []TrendDataPoint `json:"data"`
}

// GetTrend returns performance trend data over time
func (h *ReviewHandler) GetTrend(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")

	// Calculate date range
	var days int
	switch period {
	case "7d":
		days = 7
	case "30d":
		days = 30
	case "all":
		days = 365 // max 1 year
	default:
		days = 30
	}

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	// Get bubbles with outcomes in the period
	bubbles, _, err := h.bubbleRepo.ListByUser(c.Context(), userID, 1000, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get all outcomes
	outcomes, err := h.outcomeRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Create outcome map by bubble ID
	outcomeMap := make(map[uuid.UUID]*entities.Outcome)
	for _, o := range outcomes {
		if o.Period == "1h" { // Use 1h as default
			outcomeMap[o.BubbleID] = o
		}
	}

	// Aggregate by date
	dailyData := make(map[string]*TrendDataPoint)
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		dailyData[dateStr] = &TrendDataPoint{
			Date: dateStr,
		}
	}

	for _, bubble := range bubbles {
		dateStr := bubble.CreatedAt.Format("2006-01-02")
		if dp, exists := dailyData[dateStr]; exists {
			dp.BubbleCount++

			if outcome, hasOutcome := outcomeMap[bubble.ID]; hasOutcome {
				pnl := parsePnL(outcome.PnLPercent)
				dp.PnL += pnl
				if pnl > 0 {
					dp.WinRate += 1
				}
			}
		}
	}

	// Build sorted data and calculate cumulative
	data := make([]TrendDataPoint, 0, len(dailyData))
	var dates []string
	for date := range dailyData {
		dates = append(dates, date)
	}
	sort.Strings(dates)

	cumulative := 0.0
	for _, date := range dates {
		dp := dailyData[date]
		cumulative += dp.PnL
		dp.CumulativePnL = cumulative
		if dp.BubbleCount > 0 {
			dp.WinRate = (dp.WinRate / float64(dp.BubbleCount)) * 100
		}
		data = append(data, *dp)
	}

	return c.JSON(TrendResponse{
		Period: period,
		Data:   data,
	})
}

func parsePnL(pnlStr string) float64 {
	var pnl float64
	// Remove % sign and parse
	pnlStr = pnlStr[:len(pnlStr)-1]
	fmt.Sscanf(pnlStr, "%f", &pnl)
	return pnl
}

func getUserIDFromContext(c *fiber.Ctx) (uuid.UUID, error) {
	userID := c.Locals("userID")
	if userID == nil {
		return uuid.UUID{}, fiber.ErrUnauthorized
	}
	return userID.(uuid.UUID), nil
}

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
)

type SimReportHandler struct {
	pool             *pgxpool.Pool
	userRepo         repositories.UserRepository
	subscriptionRepo repositories.SubscriptionRepository
	tradeRepo        repositories.TradeRepository
	bubbleRepo       repositories.BubbleRepository
	guidedReviewRepo repositories.GuidedReviewRepository
	noteRepo         repositories.ReviewNoteRepository
	alertRuleRepo    repositories.AlertRuleRepository
	aiProviderRepo   repositories.AIProviderRepository
	userAIKeyRepo    repositories.UserAIKeyRepository
	userSymbolRepo   repositories.UserSymbolRepository
	portfolioRepo    repositories.PortfolioRepository
	manualPosRepo    repositories.ManualPositionRepository
	outcomeRepo      repositories.OutcomeRepository
	aiOpinionRepo    repositories.AIOpinionRepository
	accuracyRepo     repositories.AIOpinionAccuracyRepository
}

func NewSimReportHandler(
	pool *pgxpool.Pool,
	userRepo repositories.UserRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	tradeRepo repositories.TradeRepository,
	bubbleRepo repositories.BubbleRepository,
	guidedReviewRepo repositories.GuidedReviewRepository,
	noteRepo repositories.ReviewNoteRepository,
	alertRuleRepo repositories.AlertRuleRepository,
	aiProviderRepo repositories.AIProviderRepository,
	userAIKeyRepo repositories.UserAIKeyRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	portfolioRepo repositories.PortfolioRepository,
	manualPosRepo repositories.ManualPositionRepository,
	outcomeRepo repositories.OutcomeRepository,
	aiOpinionRepo repositories.AIOpinionRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *SimReportHandler {
	return &SimReportHandler{
		pool:             pool,
		userRepo:         userRepo,
		subscriptionRepo: subscriptionRepo,
		tradeRepo:        tradeRepo,
		bubbleRepo:       bubbleRepo,
		guidedReviewRepo: guidedReviewRepo,
		noteRepo:         noteRepo,
		alertRuleRepo:    alertRuleRepo,
		aiProviderRepo:   aiProviderRepo,
		userAIKeyRepo:    userAIKeyRepo,
		userSymbolRepo:   userSymbolRepo,
		portfolioRepo:    portfolioRepo,
		manualPosRepo:    manualPosRepo,
		outcomeRepo:      outcomeRepo,
		aiOpinionRepo:    aiOpinionRepo,
		accuracyRepo:     accuracyRepo,
	}
}

type SimReportRunRequest struct {
	Days            int      `json:"days"`
	StartDate       string   `json:"start_date"`
	Timezone        string   `json:"timezone"`
	NoTradeRate     *float64 `json:"no_trade_rate"`
	Seed            *int64   `json:"seed"`
	IncludeNotes    *bool    `json:"include_notes"`
	IncludeAlerts   *bool    `json:"include_alerts"`
	IncludeAIProbe  *bool    `json:"include_ai_probe"`
	TargetMode      string   `json:"target_mode"`
	SandboxEmail    string   `json:"sandbox_email"`
	SandboxPassword string   `json:"sandbox_password"`
	SandboxReset    *bool    `json:"sandbox_reset"`
}

type SimReportTotals struct {
	TradesCreated      int `json:"trades_created"`
	BubblesCreated     int `json:"bubbles_created"`
	OutcomesCreated    int `json:"outcomes_created"`
	AIOpinionsCreated  int `json:"ai_opinions_created"`
	AccuracyRows       int `json:"accuracy_rows"`
	AINotesCreated     int `json:"ai_notes_created"`
	TradeEventsCreated int `json:"trade_events_created"`
	TradeEventsSkipped int `json:"trade_events_skipped"`
	StockEventsCreated int `json:"stock_events_created"`
	ReviewDaysTouched  int `json:"review_days_touched"`
	ReviewDaysComplete int `json:"review_days_complete"`
	ItemsTotal         int `json:"items_total"`
	ItemsSubmitted     int `json:"items_submitted"`
	NoTradeDays        int `json:"no_trade_days"`
	NotesCreated       int `json:"notes_created"`
	ManualPositions    int `json:"manual_positions_created"`
	UserSymbolsUpdated int `json:"user_symbols_updated"`
	AlertRulesCreated  int `json:"alert_rules_created"`
	AIProbePass        int `json:"ai_probe_pass"`
	AIProbeFail        int `json:"ai_probe_fail"`
}

type SimReportStreak struct {
	Current       int     `json:"current"`
	Longest       int     `json:"longest"`
	LastReviewDay *string `json:"last_review_day,omitempty"`
}

type SimStepResult struct {
	Step    string `json:"step"`
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

type SimReportDay struct {
	Date           string          `json:"date"`
	NoTradeDay     bool            `json:"no_trade_day"`
	TradesCreated  int             `json:"trades_created"`
	BubblesCreated int             `json:"bubbles_created"`
	ReviewID       string          `json:"review_id,omitempty"`
	ReviewStatus   string          `json:"review_status,omitempty"`
	Items          int             `json:"items"`
	Submitted      int             `json:"submitted"`
	Completed      bool            `json:"completed"`
	Symbols        []string        `json:"symbols,omitempty"`
	Steps          []SimStepResult `json:"steps,omitempty"`
	Error          string          `json:"error,omitempty"`
}

type SimReportRunResponse struct {
	RunID         string                 `json:"run_id"`
	Seed          int64                  `json:"seed"`
	Timezone      string                 `json:"timezone"`
	StartDate     string                 `json:"start_date"`
	EndDate       string                 `json:"end_date"`
	Days          int                    `json:"days"`
	StartedAt     time.Time              `json:"started_at"`
	FinishedAt    time.Time              `json:"finished_at"`
	Totals        SimReportTotals        `json:"totals"`
	Streak        SimReportStreak        `json:"streak"`
	EffectiveUser SimReportEffectiveUser `json:"effective_user"`
	Results       []SimReportDay         `json:"results"`
	Warnings      []string               `json:"warnings,omitempty"`
}

type SimReportEffectiveUser struct {
	Mode           string `json:"mode"`
	UserID         string `json:"user_id"`
	Email          string `json:"email"`
	Password       string `json:"password,omitempty"`
	ResetPerformed bool   `json:"reset_performed"`
}

func (h *SimReportHandler) Run(c *fiber.Ctx) error {
	ownerUserID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	req := SimReportRunRequest{
		Days:       30,
		Timezone:   "UTC",
		StartDate:  "",
		TargetMode: "sandbox",
	}
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid json body"})
		}
	}

	if req.Days <= 0 {
		req.Days = 30
	}
	if req.Days > 180 {
		req.Days = 180
	}
	includeNotes := boolOrDefault(req.IncludeNotes, true)
	includeAlerts := boolOrDefault(req.IncludeAlerts, true)
	includeAIProbe := boolOrDefault(req.IncludeAIProbe, true)
	sandboxReset := boolOrDefault(req.SandboxReset, true)
	targetMode := strings.ToLower(strings.TrimSpace(req.TargetMode))
	if targetMode == "" {
		targetMode = "sandbox"
	}
	if targetMode != "self" && targetMode != "sandbox" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "target_mode must be self or sandbox"})
	}

	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" {
		timezone = "UTC"
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "timezone is invalid"})
	}

	anchorDate, err := parseSimStartDate(req.StartDate, location)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "start_date must be YYYY-MM-DD"})
	}
	simStartDate := anchorDate.AddDate(0, 0, -(req.Days - 1))

	noTradeRate := 0.25
	if req.NoTradeRate != nil {
		noTradeRate = *req.NoTradeRate
	}
	if noTradeRate < 0 {
		noTradeRate = 0
	}
	if noTradeRate > 0.95 {
		noTradeRate = 0.95
	}

	seed := time.Now().UnixNano()
	if req.Seed != nil {
		seed = *req.Seed
	}
	rng := rand.New(rand.NewSource(seed))
	startedAt := time.Now().UTC()
	runID := uuid.New().String()

	totals := SimReportTotals{}
	results := make([]SimReportDay, 0, req.Days)
	warnings := make([]string, 0)
	finalStreak := SimReportStreak{}
	effectiveUser := SimReportEffectiveUser{
		Mode: targetMode,
	}

	executionUserID := ownerUserID
	if targetMode == "self" {
		ownerUser, ownerErr := h.userRepo.GetByID(c.Context(), ownerUserID)
		if ownerErr != nil || ownerUser == nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "failed to load current user"})
		}
		effectiveUser.UserID = ownerUserID.String()
		effectiveUser.Email = ownerUser.Email
		effectiveUser.ResetPerformed = false
	} else {
		sandboxUser, plainPassword, createdOrUpdated, sandboxErr := h.ensureSandboxUser(c.Context(), ownerUserID, req.SandboxEmail, req.SandboxPassword)
		if sandboxErr != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": sandboxErr.Error()})
		}
		executionUserID = sandboxUser.ID
		effectiveUser.UserID = sandboxUser.ID.String()
		effectiveUser.Email = sandboxUser.Email
		effectiveUser.Password = plainPassword
		effectiveUser.ResetPerformed = false
		if createdOrUpdated {
			warnings = append(warnings, "sandbox user credential was refreshed")
		}
		if sandboxReset {
			if resetErr := h.resetSandboxUserData(c.Context(), sandboxUser.ID); resetErr != nil {
				return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": fmt.Sprintf("sandbox reset failed: %s", resetErr.Error())})
			}
			effectiveUser.ResetPerformed = true
		}
	}

	for dayIndex := 0; dayIndex < req.Days; dayIndex++ {
		currentDate := simStartDate.AddDate(0, 0, dayIndex)
		currentDateText := currentDate.Format("2006-01-02")
		dayResult := SimReportDay{
			Date:  currentDateText,
			Steps: make([]SimStepResult, 0, 12),
		}

		noTradeDay := rng.Float64() < noTradeRate
		dayResult.NoTradeDay = noTradeDay
		if noTradeDay {
			totals.NoTradeDays++
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "trade_phase", OK: true, Message: "no-trade day"})
		}

		var createdBubbles []*entities.Bubble
		if !noTradeDay {
			createdTrades, createdBubbleCount, symbols, bubblesForDay, createErr := h.createSyntheticActivity(
				c.Context(),
				executionUserID,
				currentDate,
				location,
				dayIndex,
				seed,
				rng,
			)
			dayResult.TradesCreated = createdTrades
			dayResult.BubblesCreated = createdBubbleCount
			dayResult.Symbols = symbols
			createdBubbles = bubblesForDay
			totals.TradesCreated += createdTrades
			totals.BubblesCreated += createdBubbleCount
			if createErr != nil {
				dayResult.Error = createErr.Error()
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "trade_phase", OK: false, Message: createErr.Error()})
				results = append(results, dayResult)
				warnings = append(warnings, fmt.Sprintf("%s activity creation failed: %s", currentDateText, createErr.Error()))
				continue
			}
			dayResult.Steps = append(dayResult.Steps, SimStepResult{
				Step:    "trade_phase",
				OK:      true,
				Message: fmt.Sprintf("trades=%d bubbles=%d", createdTrades, createdBubbleCount),
			})

			outcomesCreated, opinionsCreated, accuracyRows, aiErr := h.createSyntheticAIArtifacts(
				c.Context(),
				executionUserID,
				createdBubbles,
				rng,
			)
			if aiErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_mock", OK: false, Message: aiErr.Error()})
				warnings = append(warnings, fmt.Sprintf("%s ai mock failed: %s", currentDateText, aiErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{
					Step:    "ai_mock",
					OK:      true,
					Message: fmt.Sprintf("outcomes=%d opinions=%d accuracy=%d", outcomesCreated, opinionsCreated, accuracyRows),
				})
				totals.OutcomesCreated += outcomesCreated
				totals.AIOpinionsCreated += opinionsCreated
				totals.AccuracyRows += accuracyRows

				if len(createdBubbles) > 0 {
					aiNoteID, aiNoteErr := h.createSyntheticAINote(c.Context(), executionUserID, createdBubbles[0], rng)
					if aiNoteErr != nil {
						dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_note", OK: false, Message: aiNoteErr.Error()})
						warnings = append(warnings, fmt.Sprintf("%s ai note failed: %s", currentDateText, aiNoteErr.Error()))
					} else {
						dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_note", OK: true, Message: aiNoteID.String()})
						totals.AINotesCreated++
					}
				}
			}
		}

		review, items, reviewErr := h.guidedReviewRepo.GetOrCreateToday(c.Context(), executionUserID, currentDateText)
		if reviewErr != nil {
			dayResult.Error = reviewErr.Error()
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_load", OK: false, Message: reviewErr.Error()})
			results = append(results, dayResult)
			warnings = append(warnings, fmt.Sprintf("%s review load failed: %s", currentDateText, reviewErr.Error()))
			continue
		}
		dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_load", OK: true, Message: "loaded"})

		dayResult.ReviewID = review.ID.String()
		dayResult.ReviewStatus = review.Status
		dayResult.Items = len(items)
		totals.ReviewDaysTouched++
		totals.ItemsTotal += len(items)

		submittedCount := 0
		for _, item := range items {
			if item.Intent != nil && strings.TrimSpace(*item.Intent) != "" {
				continue
			}
			if err := h.submitSyntheticAnswer(c.Context(), executionUserID, item, rng); err != nil {
				dayResult.Error = err.Error()
				break
			}
			submittedCount++
		}
		dayResult.Submitted = submittedCount
		totals.ItemsSubmitted += submittedCount
		if dayResult.Error != "" {
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_submit", OK: false, Message: dayResult.Error})
			results = append(results, dayResult)
			warnings = append(warnings, fmt.Sprintf("%s item submit failed: %s", currentDateText, dayResult.Error))
			continue
		}
		dayResult.Steps = append(dayResult.Steps, SimStepResult{
			Step:    "guided_review_submit",
			OK:      true,
			Message: fmt.Sprintf("submitted=%d", submittedCount),
		})

		streak, completeErr := h.guidedReviewRepo.CompleteReview(c.Context(), executionUserID, review.ID)
		if completeErr != nil {
			dayResult.Error = completeErr.Error()
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_complete", OK: false, Message: completeErr.Error()})
			results = append(results, dayResult)
			warnings = append(warnings, fmt.Sprintf("%s complete failed: %s", currentDateText, completeErr.Error()))
			continue
		}
		dayResult.Completed = true
		dayResult.ReviewStatus = entities.GuidedReviewStatusCompleted
		dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_complete", OK: true, Message: "completed"})
		totals.ReviewDaysComplete++
		finalStreak = SimReportStreak{
			Current:       streak.CurrentStreak,
			Longest:       streak.LongestStreak,
			LastReviewDay: streak.LastReviewDate,
		}

		if includeNotes {
			var noteBubbleID *uuid.UUID
			if len(createdBubbles) > 0 {
				noteBubbleID = &createdBubbles[0].ID
			}
			noteID, noteErr := h.createSyntheticNote(c.Context(), executionUserID, currentDateText, noteBubbleID, rng)
			if noteErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "note_create", OK: false, Message: noteErr.Error()})
				warnings = append(warnings, fmt.Sprintf("%s note create failed: %s", currentDateText, noteErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "note_create", OK: true, Message: noteID.String()})
				totals.NotesCreated++
			}
		}

		if includeAlerts && len(dayResult.Symbols) > 0 {
			alertID, alertErr := h.createSyntheticAlertRule(c.Context(), executionUserID, dayResult.Symbols[0], currentDateText)
			if alertErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_create", OK: false, Message: alertErr.Error()})
				warnings = append(warnings, fmt.Sprintf("%s alert create failed: %s", currentDateText, alertErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_create", OK: true, Message: alertID.String()})
				totals.AlertRulesCreated++
				if cleanupErr := h.alertRuleRepo.Delete(c.Context(), alertID, executionUserID); cleanupErr != nil {
					dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_cleanup", OK: false, Message: cleanupErr.Error()})
					warnings = append(warnings, fmt.Sprintf("%s alert cleanup failed: %s", currentDateText, cleanupErr.Error()))
				} else {
					dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_cleanup", OK: true, Message: "deleted"})
				}
			}
		}

		if includeAIProbe {
			ok, message, probeErr := h.runAIProbe(c.Context(), executionUserID)
			if probeErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_probe", OK: false, Message: probeErr.Error()})
				totals.AIProbeFail++
				warnings = append(warnings, fmt.Sprintf("%s ai probe failed: %s", currentDateText, probeErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_probe", OK: ok, Message: message})
				if ok {
					totals.AIProbePass++
				} else {
					totals.AIProbeFail++
				}
			}
		}

		results = append(results, dayResult)
	}

	tradeEventsCreated, tradeEventsSkipped, stockEventsCreated, portfolioErr := h.syncPortfolioFromTradesAndStocks(
		c.Context(),
		executionUserID,
		simStartDate,
		anchorDate,
		rng,
	)
	if portfolioErr != nil {
		warnings = append(warnings, fmt.Sprintf("portfolio sync failed: %s", portfolioErr.Error()))
	} else {
		totals.TradeEventsCreated += tradeEventsCreated
		totals.TradeEventsSkipped += tradeEventsSkipped
		totals.StockEventsCreated += stockEventsCreated
	}

	manualPositionsCreated, manualPosErr := h.seedManualPositionsFromPortfolio(c.Context(), executionUserID, rng)
	if manualPosErr != nil {
		warnings = append(warnings, fmt.Sprintf("manual position seed failed: %s", manualPosErr.Error()))
	} else {
		totals.ManualPositions += manualPositionsCreated
	}

	userSymbolsUpdated, symbolErr := h.syncUserSymbolsFromTrades(c.Context(), executionUserID)
	if symbolErr != nil {
		warnings = append(warnings, fmt.Sprintf("user symbol sync failed: %s", symbolErr.Error()))
	} else {
		totals.UserSymbolsUpdated = userSymbolsUpdated
	}

	if finalStreak.Current == 0 && finalStreak.Longest == 0 {
		streak, streakErr := h.guidedReviewRepo.GetStreak(c.Context(), executionUserID)
		if streakErr == nil && streak != nil {
			finalStreak = SimReportStreak{
				Current:       streak.CurrentStreak,
				Longest:       streak.LongestStreak,
				LastReviewDay: streak.LastReviewDate,
			}
		}
	}

	endDate := anchorDate.Format("2006-01-02")
	response := SimReportRunResponse{
		RunID:         runID,
		Seed:          seed,
		Timezone:      timezone,
		StartDate:     simStartDate.Format("2006-01-02"),
		EndDate:       endDate,
		Days:          req.Days,
		StartedAt:     startedAt,
		FinishedAt:    time.Now().UTC(),
		Totals:        totals,
		Streak:        finalStreak,
		EffectiveUser: effectiveUser,
		Results:       results,
		Warnings:      warnings,
	}

	return c.Status(200).JSON(response)
}

func boolOrDefault(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func parseSimStartDate(value string, location *time.Location) (time.Time, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		now := time.Now().In(location)
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location), nil
	}
	parsed, err := time.ParseInLocation("2006-01-02", raw, location)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, location), nil
}

func (h *SimReportHandler) createSyntheticActivity(
	ctx context.Context,
	userID uuid.UUID,
	currentDate time.Time,
	location *time.Location,
	dayIndex int,
	seed int64,
	rng *rand.Rand,
) (int, int, []string, []*entities.Bubble, error) {
	exchanges := []string{"binance_futures", "upbit"}
	byExchangeSymbols := map[string][]string{
		"binance_futures": {"BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT"},
		"upbit":           {"KRW-BTC", "KRW-ETH", "KRW-SOL", "KRW-XRP", "KRW-ADA"},
	}
	seenSymbols := map[string]struct{}{}
	createdBubbles := make([]*entities.Bubble, 0, 4)
	tradeCount := 2 + rng.Intn(4)
	tradesCreated := 0
	bubblesCreated := 0

	for i := 0; i < tradeCount; i++ {
		exchange := exchanges[rng.Intn(len(exchanges))]
		symbols := byExchangeSymbols[exchange]
		symbol := symbols[rng.Intn(len(symbols))]
		side := "BUY"
		if rng.Intn(2) == 1 {
			side = "SELL"
		}

		basePrice := syntheticPrice(symbol)
		priceWithNoise := basePrice * (1 + (rng.Float64()-0.5)*0.08)
		quantity := 0.05 + rng.Float64()*1.8
		tradeTimeLocal := time.Date(
			currentDate.Year(),
			currentDate.Month(),
			currentDate.Day(),
			9+rng.Intn(11),
			rng.Intn(60),
			0,
			0,
			location,
		)

		var realizedPnL *string
		if side == "SELL" && rng.Float64() < 0.7 {
			pnlValue := (rng.Float64()*2 - 1) * 120
			pnlText := fmt.Sprintf("%.2f", pnlValue)
			realizedPnL = &pnlText
		}

		seedAbs := int64(math.Abs(float64(seed % 100000000)))
		binanceTradeID := seedAbs*100000 + int64(dayIndex*100+i+1)
		trade := &entities.Trade{
			ID:             uuid.New(),
			UserID:         userID,
			Exchange:       exchange,
			BinanceTradeID: binanceTradeID,
			Symbol:         symbol,
			Side:           side,
			Quantity:       fmt.Sprintf("%.6f", quantity),
			Price:          fmt.Sprintf("%.4f", priceWithNoise),
			RealizedPnL:    realizedPnL,
			TradeTime:      tradeTimeLocal.UTC(),
		}
		if err := h.tradeRepo.Create(ctx, trade); err != nil {
			return tradesCreated, bubblesCreated, sortedKeys(seenSymbols), createdBubbles, fmt.Errorf("trade create failed: %w", err)
		}
		tradesCreated++
		seenSymbols[symbol] = struct{}{}

		// Roughly 70% of synthetic trades emit a bubble.
		if rng.Float64() > 0.7 {
			continue
		}

		timeframes := []string{"1d", "1d", "4h", "1h"}
		timeframe := timeframes[rng.Intn(len(timeframes))]
		memo := fmt.Sprintf("Simulated note day %d: %s %s @ %.4f", dayIndex+1, symbol, side, priceWithNoise)
		assetClass := "crypto"
		venueName := exchange
		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     userID,
			Symbol:     strings.ToUpper(strings.TrimSpace(strings.ReplaceAll(symbol, "-", ""))),
			Timeframe:  timeframe,
			CandleTime: floorSyntheticCandle(trade.TradeTime, timeframe),
			Price:      trade.Price,
			BubbleType: "manual",
			AssetClass: &assetClass,
			VenueName:  &venueName,
			Memo:       &memo,
			Tags:       []string{"sim", strings.ToLower(strings.ReplaceAll(symbol, "-", ""))},
			CreatedAt:  time.Now().UTC(),
		}
		if err := h.bubbleRepo.Create(ctx, bubble); err != nil {
			return tradesCreated, bubblesCreated, sortedKeys(seenSymbols), createdBubbles, fmt.Errorf("bubble create failed: %w", err)
		}
		bubblesCreated++
		createdBubbles = append(createdBubbles, bubble)
	}

	return tradesCreated, bubblesCreated, sortedKeys(seenSymbols), createdBubbles, nil
}

func (h *SimReportHandler) submitSyntheticAnswer(ctx context.Context, userID uuid.UUID, item *entities.GuidedReviewItem, rng *rand.Rand) error {
	intentCandidates := []string{
		entities.IntentTechnicalSignal,
		entities.IntentPlannedRegular,
		entities.IntentNewsEvent,
		entities.IntentEmotional,
	}
	patternCandidates := []string{
		entities.PatternSameDecision,
		entities.PatternAdjustTiming,
		entities.PatternReduceSize,
		entities.PatternChangeSlTp,
	}
	emotionCandidates := []string{
		entities.EmotionGRConfident,
		entities.EmotionGRCalm,
		entities.EmotionGRHalfDoubtful,
		entities.EmotionGRAnxious,
		entities.EmotionGRAsPlanned,
	}

	intent := intentCandidates[rng.Intn(len(intentCandidates))]
	if item.Symbol == "__NO_TRADE__" {
		intent = entities.IntentOther
	}
	pattern := patternCandidates[rng.Intn(len(patternCandidates))]
	emotion := []string{emotionCandidates[rng.Intn(len(emotionCandidates))]}
	if rng.Float64() < 0.35 {
		emotion = append(emotion, emotionCandidates[rng.Intn(len(emotionCandidates))])
	}
	emotionsJSON, _ := json.Marshal(emotion)
	memo := fmt.Sprintf("simulated review for %s", item.Symbol)

	return h.guidedReviewRepo.SubmitItem(
		ctx,
		userID,
		item.ID,
		repositories.SubmitItemInput{
			Intent:       intent,
			Emotions:     emotionsJSON,
			PatternMatch: pattern,
			Memo:         memo,
		},
	)
}

func (h *SimReportHandler) createSyntheticNote(
	ctx context.Context,
	userID uuid.UUID,
	dateText string,
	bubbleID *uuid.UUID,
	rng *rand.Rand,
) (uuid.UUID, error) {
	emotions := []entities.Emotion{
		entities.EmotionCalm,
		entities.EmotionConfident,
		entities.EmotionUncertain,
		entities.EmotionFearful,
	}
	note := &entities.ReviewNote{
		UserID:        userID,
		BubbleID:      bubbleID,
		Title:         fmt.Sprintf("Sim Review %s", dateText),
		Content:       "자동 시뮬레이션에서 생성한 복기 노트입니다.",
		Tags:          []string{"sim", "daily-review"},
		LessonLearned: "빠른 테스트에서 기능 연결 상태를 확인했습니다.",
		Emotion:       emotions[rng.Intn(len(emotions))],
	}
	if err := h.noteRepo.Create(ctx, note); err != nil {
		return uuid.Nil, err
	}
	return note.ID, nil
}

func (h *SimReportHandler) createSyntheticAlertRule(
	ctx context.Context,
	userID uuid.UUID,
	symbol string,
	dateText string,
) (uuid.UUID, error) {
	config, _ := json.Marshal(map[string]string{
		"direction":       "both",
		"threshold_type":  "percent",
		"threshold_value": "2.0",
		"reference":       "24h",
	})
	rule := &entities.AlertRule{
		UserID:          userID,
		Name:            fmt.Sprintf("SIM %s %s", dateText, symbol),
		Symbol:          symbol,
		RuleType:        entities.RuleTypePriceChange,
		Config:          config,
		CooldownMinutes: 60,
		Enabled:         true,
	}
	if err := h.alertRuleRepo.Create(ctx, rule); err != nil {
		return uuid.Nil, err
	}
	return rule.ID, nil
}

func (h *SimReportHandler) runAIProbe(ctx context.Context, userID uuid.UUID) (bool, string, error) {
	providers, err := h.aiProviderRepo.ListEnabled(ctx)
	if err != nil {
		return false, "", err
	}
	if len(providers) == 0 {
		return false, "enabled providers not found", nil
	}

	available := make([]string, 0, len(providers))
	missing := make([]string, 0, len(providers))
	for _, provider := range providers {
		ok, checkErr := h.isProviderAvailableForUser(ctx, userID, provider.Name)
		if checkErr != nil {
			return false, "", checkErr
		}
		if ok {
			available = append(available, provider.Name)
		} else {
			missing = append(missing, provider.Name)
		}
	}

	if len(available) == 0 {
		return false, fmt.Sprintf("no keys configured (missing=%s)", strings.Join(missing, ",")), nil
	}
	if len(missing) == 0 {
		return true, fmt.Sprintf("all providers available (%s)", strings.Join(available, ",")), nil
	}
	return true, fmt.Sprintf("partial providers available (%s), missing (%s)", strings.Join(available, ","), strings.Join(missing, ",")), nil
}

func (h *SimReportHandler) isProviderAvailableForUser(ctx context.Context, userID uuid.UUID, provider string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "openai":
		if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) != "" {
			return true, nil
		}
	case "claude":
		if strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")) != "" {
			return true, nil
		}
	case "gemini":
		if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) != "" {
			return true, nil
		}
	}

	key, err := h.userAIKeyRepo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		return false, err
	}
	return key != nil && strings.TrimSpace(key.APIKeyEnc) != "", nil
}

func (h *SimReportHandler) ensureSandboxUser(
	ctx context.Context,
	ownerUserID uuid.UUID,
	requestedEmail string,
	requestedPassword string,
) (*entities.User, string, bool, error) {
	ownerPrefix := strings.ReplaceAll(ownerUserID.String(), "-", "")
	if len(ownerPrefix) > 12 {
		ownerPrefix = ownerPrefix[:12]
	}

	email := strings.ToLower(strings.TrimSpace(requestedEmail))
	if email == "" {
		email = fmt.Sprintf("sim.%s@kifu.local", ownerPrefix)
	}

	plainPassword := strings.TrimSpace(requestedPassword)
	if plainPassword == "" {
		plainPassword = "SimPass123!"
	}
	passwordHash, err := auth.HashPassword(plainPassword)
	if err != nil {
		return nil, "", false, err
	}

	now := time.Now().UTC()
	user, err := h.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", false, err
	}

	updated := false
	if user == nil {
		user = &entities.User{
			ID:            uuid.New(),
			Email:         email,
			PasswordHash:  passwordHash,
			Name:          "Simulation Sandbox",
			AIAllowlisted: true,
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		if err := h.userRepo.Create(ctx, user); err != nil {
			return nil, "", false, err
		}
		updated = true
	} else {
		user.PasswordHash = passwordHash
		user.Name = "Simulation Sandbox"
		user.AIAllowlisted = true
		user.UpdatedAt = now
		if err := h.userRepo.Update(ctx, user); err != nil {
			return nil, "", false, err
		}
		updated = true
	}

	subscription, err := h.subscriptionRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		return nil, "", false, err
	}
	if subscription == nil {
		subscription = &entities.Subscription{
			ID:               uuid.New(),
			UserID:           user.ID,
			Tier:             "free",
			AIQuotaRemaining: 200,
			AIQuotaLimit:     200,
			LastResetAt:      now,
		}
		if err := h.subscriptionRepo.Create(ctx, subscription); err != nil {
			return nil, "", false, err
		}
		updated = true
	}

	return user, plainPassword, updated, nil
}

func (h *SimReportHandler) resetSandboxUserData(ctx context.Context, userID uuid.UUID) error {
	if h.pool == nil {
		return fmt.Errorf("database pool is not configured")
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	queries := []string{
		`DELETE FROM trade_safety_reviews WHERE user_id = $1`,
		`DELETE FROM alert_decisions WHERE user_id = $1`,
		`DELETE FROM alerts WHERE user_id = $1`,
		`DELETE FROM alert_rules WHERE user_id = $1`,
		`DELETE FROM review_notes WHERE user_id = $1`,
		`DELETE FROM guided_reviews WHERE user_id = $1`,
		`DELETE FROM user_streaks WHERE user_id = $1`,
		`DELETE FROM manual_positions WHERE user_id = $1`,
		`DELETE FROM position_events WHERE position_id IN (SELECT id FROM positions WHERE user_id = $1)`,
		`DELETE FROM positions WHERE user_id = $1`,
		`DELETE FROM trade_events WHERE user_id = $1`,
		`DELETE FROM accounts WHERE user_id = $1`,
		`DELETE FROM user_symbols WHERE user_id = $1`,
		`DELETE FROM ai_opinion_accuracies WHERE bubble_id IN (SELECT id FROM bubbles WHERE user_id = $1)`,
		`DELETE FROM ai_opinions WHERE bubble_id IN (SELECT id FROM bubbles WHERE user_id = $1)`,
		`DELETE FROM outcomes WHERE bubble_id IN (SELECT id FROM bubbles WHERE user_id = $1)`,
		`DELETE FROM trades WHERE user_id = $1`,
		`DELETE FROM bubbles WHERE user_id = $1`,
		`DELETE FROM trade_sync_state WHERE user_id = $1`,
	}

	for _, query := range queries {
		if _, err := tx.Exec(ctx, query, userID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (h *SimReportHandler) createSyntheticAIArtifacts(
	ctx context.Context,
	userID uuid.UUID,
	bubbles []*entities.Bubble,
	rng *rand.Rand,
) (int, int, int, error) {
	if len(bubbles) == 0 {
		return 0, 0, 0, nil
	}

	periodSpecs := []struct {
		period   string
		duration time.Duration
		maxAbs   float64
	}{
		{period: "1h", duration: time.Hour, maxAbs: 1.4},
		{period: "4h", duration: 4 * time.Hour, maxAbs: 3.0},
		{period: "1d", duration: 24 * time.Hour, maxAbs: 6.2},
	}
	providers := []struct {
		name  string
		model string
	}{
		{name: "openai", model: "gpt-5-mini"},
		{name: "claude", model: "claude-3-5-sonnet"},
		{name: "gemini", model: "gemini-2.0-flash"},
	}

	outcomesCreated := 0
	aiOpinionsCreated := 0
	accuracyRows := 0

	for _, bubble := range bubbles {
		if bubble == nil {
			continue
		}
		referencePrice := parseFloatOrFallback(bubble.Price, syntheticPrice(bubble.Symbol))
		periodPnL := make(map[string]float64, len(periodSpecs))

		for _, spec := range periodSpecs {
			pnl := (rng.Float64()*2 - 1) * spec.maxAbs
			if math.Abs(pnl) < 0.07 {
				pnl = 0
			}
			periodPnL[spec.period] = pnl
			outcomePrice := referencePrice * (1 + pnl/100)

			outcome := &entities.Outcome{
				ID:             uuid.New(),
				BubbleID:       bubble.ID,
				Period:         spec.period,
				ReferencePrice: fmt.Sprintf("%.8f", referencePrice),
				OutcomePrice:   fmt.Sprintf("%.8f", outcomePrice),
				PnLPercent:     fmt.Sprintf("%.4f", pnl),
				CalculatedAt:   bubble.CandleTime.Add(spec.duration),
			}

			created, err := h.outcomeRepo.CreateIfNotExists(ctx, outcome)
			if err != nil {
				return outcomesCreated, aiOpinionsCreated, accuracyRows, err
			}
			if created {
				outcomesCreated++
			}
		}

		outcomeRows, err := h.outcomeRepo.ListByBubble(ctx, bubble.ID)
		if err != nil {
			return outcomesCreated, aiOpinionsCreated, accuracyRows, err
		}
		outcomeByPeriod := make(map[string]*entities.Outcome, len(outcomeRows))
		for _, outcome := range outcomeRows {
			outcomeByPeriod[strings.TrimSpace(outcome.Period)] = outcome
		}
		if len(outcomeByPeriod) == 0 {
			continue
		}

		predictedDirection := pickPredictedDirection(periodPnL["1h"], rng)
		promptTemplate := "simulated_packet_v1"
		responseText := buildSyntheticAIResponse(bubble.Symbol, bubble.Timeframe, periodPnL["1h"], predictedDirection)

		for _, provider := range providers {
			tokensUsed := 180 + rng.Intn(260)
			opinion := &entities.AIOpinion{
				ID:             uuid.New(),
				BubbleID:       bubble.ID,
				Provider:       provider.name,
				Model:          provider.model,
				PromptTemplate: promptTemplate,
				Response:       responseText,
				TokensUsed:     &tokensUsed,
				CreatedAt:      time.Now().UTC(),
			}
			if err := h.aiOpinionRepo.Create(ctx, opinion); err != nil {
				return outcomesCreated, aiOpinionsCreated, accuracyRows, err
			}
			aiOpinionsCreated++

			for _, spec := range periodSpecs {
				outcome := outcomeByPeriod[spec.period]
				if outcome == nil {
					continue
				}
				actualDirection := directionFromPnL(parseFloatOrFallback(outcome.PnLPercent, 0))
				accuracy := &entities.AIOpinionAccuracy{
					ID:                 uuid.New(),
					OpinionID:          opinion.ID,
					OutcomeID:          outcome.ID,
					BubbleID:           bubble.ID,
					Provider:           provider.name,
					Period:             spec.period,
					PredictedDirection: predictedDirection,
					ActualDirection:    actualDirection,
					IsCorrect:          predictedDirection == actualDirection,
					CreatedAt:          time.Now().UTC(),
				}
				if err := h.accuracyRepo.Create(ctx, accuracy); err != nil {
					return outcomesCreated, aiOpinionsCreated, accuracyRows, err
				}
				accuracyRows++
			}
		}
	}

	_ = userID // reserved for future provider personalization
	return outcomesCreated, aiOpinionsCreated, accuracyRows, nil
}

func (h *SimReportHandler) createSyntheticAINote(
	ctx context.Context,
	userID uuid.UUID,
	bubble *entities.Bubble,
	rng *rand.Rand,
) (uuid.UUID, error) {
	if bubble == nil {
		return uuid.Nil, fmt.Errorf("bubble is nil")
	}
	verdict := "관망"
	if rng.Float64() < 0.45 {
		verdict = "조건부 진입"
	}
	content := fmt.Sprintf(
		"상황\n%s %s 구간 재점검\n핵심 근거\n- 변동성 대비 거래량 비율 점검\n- 직전 지지/저항 위치 확인\n리스크\n- 손절 미준수 시 손실 확장 가능\n행동 제안\n%s\n결론\n조건 충족 시에만 실행하고 체크리스트를 유지하세요.",
		bubble.Symbol,
		strings.ToUpper(strings.TrimSpace(bubble.Timeframe)),
		verdict,
	)
	note := &entities.ReviewNote{
		UserID:        userID,
		BubbleID:      &bubble.ID,
		Title:         fmt.Sprintf("AI 요약 · %s", bubble.Symbol),
		Content:       content,
		Tags:          []string{"ai", "one-shot", "sim"},
		LessonLearned: "시뮬레이션 생성 AI 요약 노트",
		Emotion:       entities.EmotionCalm,
	}
	if err := h.noteRepo.Create(ctx, note); err != nil {
		return uuid.Nil, err
	}
	return note.ID, nil
}

func (h *SimReportHandler) syncPortfolioFromTradesAndStocks(
	ctx context.Context,
	userID uuid.UUID,
	startDate time.Time,
	endDate time.Time,
	rng *rand.Rand,
) (int, int, int, error) {
	processed := 0
	created := 0
	skipped := 0
	page := 1
	limit := 1000

	for {
		filter := repositories.TradeFilter{
			Limit:  limit,
			Offset: (page - 1) * limit,
			Sort:   "asc",
		}
		trades, _, err := h.tradeRepo.List(ctx, userID, filter)
		if err != nil {
			return created, skipped, 0, err
		}
		if len(trades) == 0 {
			break
		}

		for _, trade := range trades {
			event, buildErr := h.buildEventFromTradeForSim(ctx, userID, trade)
			if buildErr != nil {
				skipped++
				continue
			}
			if err := h.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
				if isUniqueViolationError(err) {
					skipped++
					continue
				}
				return created, skipped, 0, err
			}
			created++
		}

		processed += len(trades)
		if len(trades) < limit {
			break
		}
		page++
	}

	stockEventsCreated, stockErr := h.createSyntheticStockEvents(ctx, userID, startDate, endDate, rng)
	if stockErr != nil {
		return created, skipped, stockEventsCreated, stockErr
	}

	if processed > 0 || stockEventsCreated > 0 {
		if err := h.portfolioRepo.RebuildPositions(ctx, userID); err != nil {
			return created, skipped, stockEventsCreated, err
		}
	}

	return created, skipped, stockEventsCreated, nil
}

func (h *SimReportHandler) buildEventFromTradeForSim(ctx context.Context, userID uuid.UUID, trade *entities.Trade) (*entities.TradeEvent, error) {
	if trade == nil {
		return nil, fmt.Errorf("trade is nil")
	}
	symbol := strings.ToUpper(strings.TrimSpace(trade.Symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol is empty")
	}

	venueCode, venueType, venueName := resolveVenueFromExchange(trade.Exchange)
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, venueType, venueName, "")
	if err != nil {
		return nil, err
	}

	base, quote, normalizedSymbol := parseInstrumentSymbol(symbol, venueCode)
	instrumentID, err := h.portfolioRepo.UpsertInstrument(ctx, "crypto", base, quote, normalizedSymbol)
	if err != nil {
		return nil, err
	}
	_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, symbol)

	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "sim-api", nil, "api")
	if err != nil {
		return nil, err
	}

	side := strings.ToLower(strings.TrimSpace(trade.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(trade.Quantity)
	price := normalizeOptionalLiteral(trade.Price)

	externalID := trade.ID.String()
	if trade.BinanceTradeID != 0 {
		externalID = fmt.Sprintf("%s-%d", strings.ToLower(strings.TrimSpace(trade.Exchange)), trade.BinanceTradeID)
	}

	eventType := resolveEventType(trade.Exchange)
	eventRecord := &portfolioTradeEventRecord{
		Symbol:     normalizedSymbol,
		EventType:  eventType,
		Side:       &side,
		Qty:        qty,
		Price:      price,
		ExecutedAt: trade.TradeTime,
		ExternalID: &externalID,
	}

	dedupe := buildTradeEventDedupeKey(venueCode, "crypto", eventRecord)
	metadata := map[string]string{
		"trade_id": trade.ID.String(),
		"exchange": trade.Exchange,
		"source":   "sim",
	}
	metadataRaw, _ := json.Marshal(metadata)
	raw := json.RawMessage(metadataRaw)

	return &entities.TradeEvent{
		ID:           uuid.New(),
		UserID:       userID,
		AccountID:    &accountID,
		VenueID:      &venueID,
		InstrumentID: &instrumentID,
		AssetClass:   "crypto",
		VenueType:    venueType,
		EventType:    eventType,
		Side:         &side,
		Qty:          qty,
		Price:        price,
		ExecutedAt:   trade.TradeTime,
		Source:       "api",
		ExternalID:   &externalID,
		Metadata:     &raw,
		DedupeKey:    &dedupe,
	}, nil
}

func (h *SimReportHandler) createSyntheticStockEvents(
	ctx context.Context,
	userID uuid.UUID,
	startDate time.Time,
	endDate time.Time,
	rng *rand.Rand,
) (int, error) {
	venueCode := "kis"
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, "broker", "KIS", "")
	if err != nil {
		return 0, err
	}
	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "sim-kis", nil, "api")
	if err != nil {
		return 0, err
	}

	stockUniverse := []struct {
		symbol string
		quote  string
		price  float64
	}{
		{symbol: "005930.KS", quote: "KRW", price: 76000},
		{symbol: "035420.KS", quote: "KRW", price: 184000},
		{symbol: "AAPL", quote: "USD", price: 205},
		{symbol: "MSFT", quote: "USD", price: 425},
	}

	days := int(endDate.Sub(startDate).Hours()/24) + 1
	if days <= 0 {
		days = 1
	}

	created := 0
	for i := 0; i < days; i++ {
		if rng.Float64() > 0.20 {
			continue
		}
		tradeDay := startDate.AddDate(0, 0, i)
		stock := stockUniverse[rng.Intn(len(stockUniverse))]
		basePrice := stock.price * (1 + (rng.Float64()-0.5)*0.10)
		qty := 1 + rng.Float64()*8
		side := "buy"
		if rng.Intn(2) == 1 {
			side = "sell"
		}

		instrumentID, upsertErr := h.portfolioRepo.UpsertInstrument(ctx, "stock", stock.symbol, stock.quote, stock.symbol)
		if upsertErr != nil {
			return created, upsertErr
		}
		_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, stock.symbol)

		qtyText := fmt.Sprintf("%.4f", qty)
		priceText := fmt.Sprintf("%.4f", basePrice)
		executedAt := time.Date(tradeDay.Year(), tradeDay.Month(), tradeDay.Day(), 10+rng.Intn(6), rng.Intn(60), 0, 0, time.UTC)
		externalID := fmt.Sprintf("sim-stock-%d-%s", i+1, strings.ReplaceAll(stock.symbol, ".", ""))

		eventRecord := &portfolioTradeEventRecord{
			Symbol:     stock.symbol,
			EventType:  "spot_trade",
			Side:       &side,
			Qty:        &qtyText,
			Price:      &priceText,
			ExecutedAt: executedAt,
			ExternalID: &externalID,
		}
		dedupe := buildTradeEventDedupeKey(venueCode, "stock", eventRecord)
		metadataRaw, _ := json.Marshal(map[string]string{
			"source": "sim",
			"type":   "stock_seed",
		})
		raw := json.RawMessage(metadataRaw)

		event := &entities.TradeEvent{
			ID:           uuid.New(),
			UserID:       userID,
			AccountID:    &accountID,
			VenueID:      &venueID,
			InstrumentID: &instrumentID,
			AssetClass:   "stock",
			VenueType:    "broker",
			EventType:    "spot_trade",
			Side:         &side,
			Qty:          &qtyText,
			Price:        &priceText,
			ExecutedAt:   executedAt,
			Source:       "api",
			ExternalID:   &externalID,
			Metadata:     &raw,
			DedupeKey:    &dedupe,
		}

		if err := h.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
			if isUniqueViolationError(err) {
				continue
			}
			return created, err
		}
		created++
	}

	return created, nil
}

func (h *SimReportHandler) seedManualPositionsFromPortfolio(ctx context.Context, userID uuid.UUID, rng *rand.Rand) (int, error) {
	existing, err := h.manualPosRepo.List(ctx, userID, repositories.ManualPositionFilter{Status: "open"})
	if err != nil {
		return 0, err
	}
	if len(existing) > 0 {
		return 0, nil
	}

	positions, err := h.portfolioRepo.ListPositions(ctx, userID, repositories.PositionFilter{
		Status: "open",
		Limit:  10,
	})
	if err != nil {
		return 0, err
	}
	if len(positions) == 0 {
		return 0, nil
	}

	created := 0
	maxCreate := 2
	if len(positions) < maxCreate {
		maxCreate = len(positions)
	}
	for i := 0; i < maxCreate; i++ {
		position := positions[i]
		netQty := parseFloatOrFallback(position.NetQty, 0)
		side := "long"
		if netQty < 0 {
			side = "short"
		}
		sizeText := strings.TrimSpace(position.NetQty)
		if sizeText == "" {
			sizeText = fmt.Sprintf("%.4f", math.Abs(netQty))
		}
		if strings.HasPrefix(sizeText, "-") {
			sizeText = strings.TrimPrefix(sizeText, "-")
		}

		entryPrice := strings.TrimSpace(position.AvgEntry)
		venue := position.VenueCode
		now := time.Now().UTC()
		openAt := now.Add(-time.Duration(rng.Intn(120)+10) * time.Minute)

		manual := &entities.ManualPosition{
			UserID:       userID,
			Symbol:       position.Instrument,
			AssetClass:   position.AssetClass,
			Venue:        &venue,
			PositionSide: side,
			Size:         &sizeText,
			EntryPrice:   &entryPrice,
			Status:       "open",
			OpenedAt:     &openAt,
		}
		if err := h.manualPosRepo.Create(ctx, manual); err != nil {
			return created, err
		}
		created++
	}
	return created, nil
}

func (h *SimReportHandler) syncUserSymbolsFromTrades(ctx context.Context, userID uuid.UUID) (int, error) {
	_, _, bySymbol, err := h.tradeRepo.Summary(ctx, userID, repositories.TradeFilter{})
	if err != nil {
		return 0, err
	}
	if len(bySymbol) == 0 {
		return 0, nil
	}

	now := time.Now().UTC()
	maxSymbols := 12
	if len(bySymbol) < maxSymbols {
		maxSymbols = len(bySymbol)
	}
	symbols := make([]*entities.UserSymbol, 0, maxSymbols)
	for i := 0; i < maxSymbols; i++ {
		symbol := strings.ToUpper(strings.TrimSpace(bySymbol[i].Symbol))
		if symbol == "" {
			continue
		}
		timeframe := "1d"
		if strings.HasSuffix(symbol, "USDT") || strings.HasPrefix(symbol, "KRW-") {
			timeframe = "4h"
		}
		symbols = append(symbols, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           symbol,
			TimeframeDefault: timeframe,
			CreatedAt:        now,
		})
	}
	if len(symbols) == 0 {
		return 0, nil
	}

	if err := h.userSymbolRepo.ReplaceByUser(ctx, userID, symbols); err != nil {
		return 0, err
	}
	return len(symbols), nil
}

func parseFloatOrFallback(raw string, fallback float64) float64 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(trimmed, 64)
	if err != nil || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return fallback
	}
	return parsed
}

func directionFromPnL(pnl float64) entities.Direction {
	if pnl > 0.05 {
		return entities.DirectionUp
	}
	if pnl < -0.05 {
		return entities.DirectionDown
	}
	return entities.DirectionNeutral
}

func pickPredictedDirection(pnl float64, rng *rand.Rand) entities.Direction {
	actual := directionFromPnL(pnl)
	if rng.Float64() < 0.62 {
		return actual
	}
	if actual == entities.DirectionUp {
		return entities.DirectionDown
	}
	if actual == entities.DirectionDown {
		return entities.DirectionUp
	}
	return []entities.Direction{entities.DirectionUp, entities.DirectionDown, entities.DirectionNeutral}[rng.Intn(3)]
}

func buildSyntheticAIResponse(symbol string, timeframe string, pnl1h float64, predicted entities.Direction) string {
	stance := "관망"
	switch predicted {
	case entities.DirectionUp:
		stance = "조건부 매수"
	case entities.DirectionDown:
		stance = "리스크 축소"
	}
	return fmt.Sprintf(
		"상황\n%s %s 기준 변동성 점검이 필요합니다.\n핵심 근거\n- 단기 추세 강도와 거래량 변화를 확인했습니다.\n- 1h 기대 손익은 %.2f%%로 추정됩니다.\n리스크\n- 손절 조건 미준수 시 연속 손실로 이어질 수 있습니다.\n행동 제안\n%s\n결론\n체크리스트 확인 후 계획된 규모로만 실행하세요.",
		symbol,
		strings.ToUpper(strings.TrimSpace(timeframe)),
		pnl1h,
		stance,
	)
}

func syntheticPrice(symbol string) float64 {
	switch strings.ToUpper(symbol) {
	case "BTCUSDT", "KRW-BTC":
		return 98000
	case "ETHUSDT", "KRW-ETH":
		return 3200
	case "SOLUSDT", "KRW-SOL":
		return 180
	case "XRPUSDT", "KRW-XRP":
		return 1.1
	case "ADAUSDT", "KRW-ADA":
		return 0.8
	default:
		return 100
	}
}

func floorSyntheticCandle(value time.Time, timeframe string) time.Time {
	utc := value.UTC()
	switch timeframe {
	case "1d":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	case "4h":
		hour := (utc.Hour() / 4) * 4
		return time.Date(utc.Year(), utc.Month(), utc.Day(), hour, 0, 0, 0, time.UTC)
	case "1h":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
	default:
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	}
}

func sortedKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type SimilarHandler struct {
	bubbleRepo repositories.BubbleRepository
}

func NewSimilarHandler(bubbleRepo repositories.BubbleRepository) *SimilarHandler {
	return &SimilarHandler{bubbleRepo: bubbleRepo}
}

type SimilarBubbleItem struct {
	ID         uuid.UUID    `json:"id"`
	Symbol     string       `json:"symbol"`
	Timeframe  string       `json:"timeframe"`
	CandleTime string       `json:"candle_time"`
	Price      string       `json:"price"`
	BubbleType string       `json:"bubble_type"`
	Memo       *string      `json:"memo,omitempty"`
	Tags       []string     `json:"tags,omitempty"`
	Outcome    *OutcomeItem `json:"outcome,omitempty"`
}

type OutcomeItem struct {
	Period     string  `json:"period"`
	PnLPercent *string `json:"pnl_percent"`
}

type SimilarSummaryResponse struct {
	Period string  `json:"period"`
	Wins   int     `json:"wins"`
	Losses int     `json:"losses"`
	AvgPnL *string `json:"avg_pnl"`
}

func (h *SimilarHandler) SimilarByBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	period := normalizePeriod(c.Query("period"))
	if period == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "period is invalid"})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	if len(bubble.Tags) == 0 {
		return c.Status(200).JSON(fiber.Map{
			"similar_count": 0,
			"summary":       SimilarSummaryResponse{Period: period, Wins: 0, Losses: 0, AvgPnL: nil},
			"bubbles":       []SimilarBubbleItem{},
		})
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	items, total, err := h.bubbleRepo.ListSimilar(c.Context(), userID, bubble.Symbol, bubble.Tags, &bubble.ID, period, limit, (page-1)*limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	summary, err := h.bubbleRepo.SummarySimilar(c.Context(), userID, bubble.Symbol, bubble.Tags, &bubble.ID, period)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"similar_count": total,
		"summary":       SimilarSummaryResponse{Period: period, Wins: summary.Wins, Losses: summary.Losses, AvgPnL: summary.AvgPnL},
		"bubbles":       mapSimilarItems(items),
	})
}

func (h *SimilarHandler) Search(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	if symbol == "" || !bubbleSymbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is invalid"})
	}

	period := normalizePeriod(c.Query("period"))
	if period == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "period is invalid"})
	}

	queryTags, err := normalizeTags(splitTags(c.Query("tags")))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
	}
	if len(queryTags) == 0 {
		return c.Status(200).JSON(fiber.Map{
			"page":  1,
			"limit": 50,
			"total": 0,
			"items": []SimilarBubbleItem{},
		})
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	items, total, err := h.bubbleRepo.ListSimilar(c.Context(), userID, symbol, queryTags, nil, period, limit, (page-1)*limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"page":  page,
		"limit": limit,
		"total": total,
		"items": mapSimilarItems(items),
	})
}

func mapSimilarItems(items []*repositories.BubbleWithOutcome) []SimilarBubbleItem {
	response := make([]SimilarBubbleItem, 0, len(items))
	for _, item := range items {
		bubble := item.Bubble
		if bubble == nil {
			continue
		}
		var outcome *OutcomeItem
		if item.Outcome != nil {
			pnl := item.Outcome.PnLPercent
			outcome = &OutcomeItem{Period: item.Outcome.Period, PnLPercent: &pnl}
		}
		response = append(response, SimilarBubbleItem{
			ID:         bubble.ID,
			Symbol:     bubble.Symbol,
			Timeframe:  bubble.Timeframe,
			CandleTime: bubble.CandleTime.Format(time.RFC3339),
			Price:      bubble.Price,
			BubbleType: bubble.BubbleType,
			Memo:       bubble.Memo,
			Tags:       bubble.Tags,
			Outcome:    outcome,
		})
	}
	return response
}

func normalizePeriod(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "1h"
	}
	if value == "1h" || value == "4h" || value == "1d" {
		return value
	}
	return ""
}

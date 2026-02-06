package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ExportHandler struct {
	bubbleRepo   repositories.BubbleRepository
	outcomeRepo  repositories.OutcomeRepository
	accuracyRepo repositories.AIOpinionAccuracyRepository
}

func NewExportHandler(
	bubbleRepo repositories.BubbleRepository,
	outcomeRepo repositories.OutcomeRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *ExportHandler {
	return &ExportHandler{
		bubbleRepo:   bubbleRepo,
		outcomeRepo:  outcomeRepo,
		accuracyRepo: accuracyRepo,
	}
}

// ExportStats exports review statistics as CSV
func (h *ExportHandler) ExportStats(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")

	stats, err := h.bubbleRepo.GetReviewStats(c.Context(), userID, period, "", "", "", "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"Category", "Metric", "Value"})

	// Overall Stats
	writer.Write([]string{"Overall", "Total Bubbles", fmt.Sprintf("%d", stats.TotalBubbles)})
	writer.Write([]string{"Overall", "Bubbles with Outcome", fmt.Sprintf("%d", stats.BubblesWithOutcome)})
	writer.Write([]string{"Overall", "Win Rate", fmt.Sprintf("%.2f%%", stats.Overall.WinRate)})
	writer.Write([]string{"Overall", "Average PnL", stats.Overall.AvgPnL})
	writer.Write([]string{"Overall", "Total PnL", stats.Overall.TotalPnL})
	writer.Write([]string{"Overall", "Max Gain", stats.Overall.MaxGain})
	writer.Write([]string{"Overall", "Max Loss", stats.Overall.MaxLoss})

	// Period Stats
	for period, periodStats := range stats.ByPeriod {
		writer.Write([]string{fmt.Sprintf("Period %s", period), "Win Rate", fmt.Sprintf("%.2f%%", periodStats.WinRate)})
		writer.Write([]string{fmt.Sprintf("Period %s", period), "Average PnL", periodStats.AvgPnL})
		writer.Write([]string{fmt.Sprintf("Period %s", period), "Count", fmt.Sprintf("%d", periodStats.Count)})
	}

	// Tag Stats
	for tag, tagStats := range stats.ByTag {
		writer.Write([]string{fmt.Sprintf("Tag: %s", tag), "Count", fmt.Sprintf("%d", tagStats.Count)})
		writer.Write([]string{fmt.Sprintf("Tag: %s", tag), "Win Rate", fmt.Sprintf("%.2f%%", tagStats.WinRate)})
		writer.Write([]string{fmt.Sprintf("Tag: %s", tag), "Average PnL", tagStats.AvgPnL})
	}

	// Symbol Stats
	for symbol, symbolStats := range stats.BySymbol {
		writer.Write([]string{fmt.Sprintf("Symbol: %s", symbol), "Count", fmt.Sprintf("%d", symbolStats.Count)})
		writer.Write([]string{fmt.Sprintf("Symbol: %s", symbol), "Win Rate", fmt.Sprintf("%.2f%%", symbolStats.WinRate)})
		writer.Write([]string{fmt.Sprintf("Symbol: %s", symbol), "Average PnL", symbolStats.AvgPnL})
	}

	writer.Flush()

	filename := fmt.Sprintf("kifu_stats_%s.csv", time.Now().Format("2006-01-02"))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Type", "text/csv")

	return c.Send(buf.Bytes())
}

// ExportAccuracy exports AI accuracy data as CSV
func (h *ExportHandler) ExportAccuracy(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")
	outcomePeriod := c.Query("outcome_period", "1h")

	providerStats, err := h.accuracyRepo.GetProviderStats(c.Context(), userID, period, outcomePeriod, "", "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"Provider", "Total Predictions", "Correct Predictions", "Accuracy %", "BUY Predictions", "BUY Correct", "BUY Accuracy", "SELL Predictions", "SELL Correct", "SELL Accuracy"})

	for provider, stats := range providerStats {
		buyStats := stats.ByDirection["BUY"]
		sellStats := stats.ByDirection["SELL"]

		writer.Write([]string{
			provider,
			fmt.Sprintf("%d", stats.Total),
			fmt.Sprintf("%d", stats.Correct),
			fmt.Sprintf("%.2f", stats.Accuracy),
			fmt.Sprintf("%d", buyStats.Predicted),
			fmt.Sprintf("%d", buyStats.Correct),
			fmt.Sprintf("%.2f", buyStats.Accuracy),
			fmt.Sprintf("%d", sellStats.Predicted),
			fmt.Sprintf("%d", sellStats.Correct),
			fmt.Sprintf("%.2f", sellStats.Accuracy),
		})
	}

	writer.Flush()

	filename := fmt.Sprintf("kifu_ai_accuracy_%s.csv", time.Now().Format("2006-01-02"))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Type", "text/csv")

	return c.Send(buf.Bytes())
}

// ExportBubbles exports bubble data as CSV
func (h *ExportHandler) ExportBubbles(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	bubbles, _, err := h.bubbleRepo.ListByUser(c.Context(), userID, 1000, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"ID", "Symbol", "Timeframe", "Candle Time", "Price", "Type", "Asset Class", "Venue", "Memo", "Tags", "Created At"})

	for _, bubble := range bubbles {
		tags := ""
		if len(bubble.Tags) > 0 {
			for i, t := range bubble.Tags {
				if i > 0 {
					tags += ", "
				}
				tags += t
			}
		}

		memo := ""
		if bubble.Memo != nil {
			memo = *bubble.Memo
		}

		writer.Write([]string{
			bubble.ID.String(),
			bubble.Symbol,
			bubble.Timeframe,
			bubble.CandleTime.Format("2006-01-02 15:04:05"),
			bubble.Price,
			bubble.BubbleType,
			safeCsvValue(bubble.AssetClass),
			safeCsvValue(bubble.VenueName),
			memo,
			tags,
			bubble.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	writer.Flush()

	filename := fmt.Sprintf("kifu_bubbles_%s.csv", time.Now().Format("2006-01-02"))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Type", "text/csv")

	return c.Send(buf.Bytes())
}

func safeCsvValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

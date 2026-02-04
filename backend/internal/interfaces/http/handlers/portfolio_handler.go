package handlers

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PortfolioHandler struct {
	portfolioRepo repositories.PortfolioRepository
}

func NewPortfolioHandler(portfolioRepo repositories.PortfolioRepository) *PortfolioHandler {
	return &PortfolioHandler{portfolioRepo: portfolioRepo}
}

type TimelineItem struct {
	ID           string           `json:"id"`
	ExecutedAt   string           `json:"executed_at"`
	AssetClass   string           `json:"asset_class"`
	VenueType    string           `json:"venue_type"`
	Venue        string           `json:"venue"`
	VenueName    string           `json:"venue_name"`
	AccountLabel *string          `json:"account_label,omitempty"`
	Instrument   string           `json:"instrument"`
	EventType    string           `json:"event_type"`
	Side         *string          `json:"side,omitempty"`
	Qty          *string          `json:"qty,omitempty"`
	Price        *string          `json:"price,omitempty"`
	Fee          *string          `json:"fee,omitempty"`
	FeeAsset     *string          `json:"fee_asset,omitempty"`
	Source       string           `json:"source"`
	ExternalID   *string          `json:"external_id,omitempty"`
	Metadata     *json.RawMessage `json:"metadata,omitempty"`
}

type PositionItem struct {
	Key            string  `json:"key"`
	Instrument     string  `json:"instrument"`
	Venue          string  `json:"venue"`
	VenueName      string  `json:"venue_name"`
	AccountLabel   *string `json:"account_label,omitempty"`
	AssetClass     string  `json:"asset_class"`
	VenueType      string  `json:"venue_type"`
	Status         string  `json:"status"`
	NetQty         string  `json:"net_qty"`
	AvgEntry       string  `json:"avg_entry"`
	BuyQty         string  `json:"buy_qty"`
	SellQty        string  `json:"sell_qty"`
	BuyNotional    string  `json:"buy_notional"`
	SellNotional   string  `json:"sell_notional"`
	LastExecutedAt string  `json:"last_executed_at"`
}

// Timeline returns unified timeline events
func (h *PortfolioHandler) Timeline(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 50
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	var fromPtr *time.Time
	fromStr := strings.TrimSpace(c.Query("from"))
	if fromStr != "" {
		parsed, ok := parseTime(fromStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
		}
		fromPtr = &parsed
	}

	var toPtr *time.Time
	toStr := strings.TrimSpace(c.Query("to"))
	if toStr != "" {
		parsed, ok := parseTime(toStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
		}
		toPtr = &parsed
	}

	cursorStr := strings.TrimSpace(c.Query("cursor"))
	var cursor *repositories.TimelineCursor
	if cursorStr != "" {
		decoded, err := decodeCursor(cursorStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "cursor is invalid"})
		}
		cursor = decoded
	}

	filter := repositories.TimelineFilter{
		From:         fromPtr,
		To:           toPtr,
		AssetClasses: splitListQuery(c.Query("asset_class")),
		Venues:       splitListQuery(c.Query("venue")),
		Sources:      splitListQuery(c.Query("source")),
		EventTypes:   splitListQuery(c.Query("event_type")),
		Limit:        limit,
		Cursor:       cursor,
	}

	events, err := h.portfolioRepo.ListTimeline(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]TimelineItem, 0, len(events))
	for _, event := range events {
		items = append(items, TimelineItem{
			ID:           event.ID.String(),
			ExecutedAt:   event.ExecutedAt.Format(time.RFC3339),
			AssetClass:   event.AssetClass,
			VenueType:    event.VenueType,
			Venue:        event.VenueCode,
			VenueName:    event.VenueName,
			AccountLabel: event.AccountLabel,
			Instrument:   event.Instrument,
			EventType:    event.EventType,
			Side:         event.Side,
			Qty:          event.Qty,
			Price:        event.Price,
			Fee:          event.Fee,
			FeeAsset:     event.FeeAsset,
			Source:       event.Source,
			ExternalID:   event.ExternalID,
			Metadata:     event.Metadata,
		})
	}

	var nextCursor *string
	if len(events) == limit {
		last := events[len(events)-1]
		encoded := encodeCursor(last.ExecutedAt, last.ID)
		nextCursor = &encoded
	}

	return c.Status(200).JSON(fiber.Map{
		"items":       items,
		"next_cursor": nextCursor,
	})
}

// Positions returns position summaries (stub)
func (h *PortfolioHandler) Positions(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 50
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	status := strings.ToLower(strings.TrimSpace(c.Query("status")))
	if status != "" && status != "open" && status != "closed" && status != "all" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "status must be open, closed, or all"})
	}

	var fromPtr *time.Time
	fromStr := strings.TrimSpace(c.Query("from"))
	if fromStr != "" {
		parsed, ok := parseTime(fromStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
		}
		fromPtr = &parsed
	}

	var toPtr *time.Time
	toStr := strings.TrimSpace(c.Query("to"))
	if toStr != "" {
		parsed, ok := parseTime(toStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
		}
		toPtr = &parsed
	}

	filter := repositories.PositionFilter{
		From:         fromPtr,
		To:           toPtr,
		AssetClasses: splitListQuery(c.Query("asset_class")),
		Venues:       splitListQuery(c.Query("venue")),
		Status:       status,
		Limit:        limit,
	}

	positions, err := h.portfolioRepo.ListPositions(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]PositionItem, 0, len(positions))
	for _, position := range positions {
		key := position.VenueCode + "|" + position.Instrument + "|" + position.AssetClass
		items = append(items, PositionItem{
			Key:            key,
			Instrument:     position.Instrument,
			Venue:          position.VenueCode,
			VenueName:      position.VenueName,
			AccountLabel:   position.AccountLabel,
			AssetClass:     position.AssetClass,
			VenueType:      position.VenueType,
			Status:         position.Status,
			NetQty:         position.NetQty,
			AvgEntry:       position.AvgEntry,
			BuyQty:         position.BuyQty,
			SellQty:        position.SellQty,
			BuyNotional:    position.BuyNotional,
			SellNotional:   position.SellNotional,
			LastExecutedAt: position.LastExecutedAt.Format(time.RFC3339),
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"positions": items,
		"count":     len(items),
	})
}

// BackfillBubbles creates auto bubbles from trade events (stocks/DEX included)
func (h *PortfolioHandler) BackfillBubbles(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	updated, err := h.portfolioRepo.BackfillBubblesFromEvents(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"created": updated})
}

// Instruments returns normalized instruments (stub)
func (h *PortfolioHandler) Instruments(c *fiber.Ctx) error {
	if _, err := ExtractUserID(c); err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	return c.Status(200).JSON(fiber.Map{
		"items": []fiber.Map{},
	})
}

func splitListQuery(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.ToLower(strings.TrimSpace(part))
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func encodeCursor(timeValue time.Time, id uuid.UUID) string {
	payload := timeValue.UTC().Format(time.RFC3339Nano) + "|" + id.String()
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func decodeCursor(raw string) (*repositories.TimelineCursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}
	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 {
		return nil, errors.New("invalid cursor format")
	}
	parsedTime, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, err
	}
	parsedID, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, err
	}
	return &repositories.TimelineCursor{Time: parsedTime, ID: parsedID}, nil
}

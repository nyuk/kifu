package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PortfolioHandler struct {
	portfolioRepo repositories.PortfolioRepository
	tradeRepo     repositories.TradeRepository
}

func NewPortfolioHandler(portfolioRepo repositories.PortfolioRepository, tradeRepo repositories.TradeRepository) *PortfolioHandler {
	return &PortfolioHandler{
		portfolioRepo: portfolioRepo,
		tradeRepo:     tradeRepo,
	}
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

// BackfillEventsFromTrades creates trade_events from trades table (API syncs)
func (h *PortfolioHandler) BackfillEventsFromTrades(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 1000
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 5000 {
			parsed = 5000
		}
		limit = parsed
	}

	processed := 0
	created := 0
	skipped := 0
	page := 1

	for {
		filter := repositories.TradeFilter{
			Limit:  limit,
			Offset: (page - 1) * limit,
			Sort:   "asc",
		}
		trades, _, err := h.tradeRepo.List(c.Context(), userID, filter)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if len(trades) == 0 {
			break
		}

		for _, trade := range trades {
			event, err := h.buildEventFromTrade(c.Context(), userID, trade)
			if err != nil {
				skipped += 1
				continue
			}
			if err := h.portfolioRepo.CreateTradeEvent(c.Context(), event); err != nil {
				if isUniqueViolationError(err) {
					skipped += 1
					continue
				}
				return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
			}
			created += 1
		}

		processed += len(trades)
		if len(trades) < limit {
			break
		}
		page += 1
	}

	positionsRefreshed := false
	var positionRefreshError string
	if created > 0 {
		if err := h.portfolioRepo.RebuildPositions(c.Context(), userID); err != nil {
			positionRefreshError = err.Error()
		} else {
			positionsRefreshed = true
		}
	}

	return c.Status(200).JSON(fiber.Map{
		"processed":               processed,
		"created":                 created,
		"skipped":                 skipped,
		"positions_refreshed":     positionsRefreshed,
		"positions_refresh_error": positionRefreshError,
	})
}

func (h *PortfolioHandler) buildEventFromTrade(ctx context.Context, userID uuid.UUID, trade *entities.Trade) (*entities.TradeEvent, error) {
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

	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "api-sync", nil, "api")
	if err != nil {
		return nil, err
	}

	side := strings.ToLower(strings.TrimSpace(trade.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(trade.Quantity)
	price := normalizeOptionalLiteral(trade.Price)

	externalID := ""
	if trade.BinanceTradeID != 0 {
		externalID = fmt.Sprintf("%d", trade.BinanceTradeID)
	} else {
		externalID = trade.ID.String()
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

type portfolioTradeEventRecord struct {
	Symbol     string
	EventType  string
	Side       *string
	Qty        *string
	Price      *string
	Fee        *string
	FeeAsset   *string
	ExecutedAt time.Time
	ExternalID *string
}

func resolveVenueFromExchange(exchange string) (code string, venueType string, displayName string) {
	normalized := strings.ToLower(strings.TrimSpace(exchange))
	if normalized == "" {
		return "unknown", "cex", "Unknown"
	}
	switch normalized {
	case "binance_futures":
		return normalized, "cex", "Binance Futures"
	case "binance_spot":
		return normalized, "cex", "Binance Spot"
	case "upbit":
		return normalized, "cex", "Upbit"
	default:
		return normalized, "cex", titleizeVenue(normalized)
	}
}

func titleizeVenue(value string) string {
	parts := strings.Split(value, "_")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

func parseInstrumentSymbol(symbol string, venueCode string) (base string, quote string, normalized string) {
	normalized = strings.ToUpper(strings.TrimSpace(symbol))
	if normalized == "" {
		return "UNKNOWN", portfolioDefaultQuoteForVenue(venueCode), "UNKNOWN"
	}
	if strings.Contains(normalized, "-") {
		parts := strings.Split(normalized, "-")
		if len(parts) == 2 {
			quote = parts[0]
			base = parts[1]
			normalized = base + quote
			return base, quote, normalized
		}
	}

	quotes := []string{"USDT", "USDC", "USD", "KRW", "BTC", "ETH"}
	for _, q := range quotes {
		if strings.HasSuffix(normalized, q) && len(normalized) > len(q) {
			base = strings.TrimSuffix(normalized, q)
			quote = q
			return base, quote, normalized
		}
	}

	quote = portfolioDefaultQuoteForVenue(venueCode)
	base = normalized
	return base, quote, normalized
}

func portfolioDefaultQuoteForVenue(venue string) string {
	switch venue {
	case "upbit", "bithumb", "kis":
		return "KRW"
	default:
		return "USDT"
	}
}

func resolveEventType(exchange string) string {
	value := strings.ToLower(strings.TrimSpace(exchange))
	if strings.Contains(value, "futures") || strings.Contains(value, "perp") {
		return "perp_trade"
	}
	return "spot_trade"
}

func buildTradeEventDedupeKey(venue string, assetClass string, record *portfolioTradeEventRecord) string {
	parts := []string{
		strings.ToLower(strings.TrimSpace(venue)),
		strings.ToLower(strings.TrimSpace(assetClass)),
		record.Symbol,
		record.EventType,
	}
	if record.Side != nil {
		parts = append(parts, *record.Side)
	}
	if record.Qty != nil {
		parts = append(parts, *record.Qty)
	}
	if record.Price != nil {
		parts = append(parts, *record.Price)
	}
	if record.Fee != nil {
		parts = append(parts, *record.Fee)
	}
	if record.FeeAsset != nil {
		parts = append(parts, *record.FeeAsset)
	}
	parts = append(parts, record.ExecutedAt.UTC().Format(time.RFC3339Nano))
	if record.ExternalID != nil {
		parts = append(parts, *record.ExternalID)
	}
	payload := strings.Join(parts, "|")
	hash := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(hash[:])
}

func isUniqueViolationError(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func normalizeOptionalLiteral(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

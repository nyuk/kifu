package handlers

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const defaultExchange = "binance_futures"

var allowedExchanges = map[string]struct{}{
	"binance_futures": {},
	"binance_spot":    {},
	"upbit":           {},
}

type TradeHandler struct {
	tradeRepo      repositories.TradeRepository
	bubbleRepo     repositories.BubbleRepository
	userSymbolRepo repositories.UserSymbolRepository
	portfolioRepo  repositories.PortfolioRepository
}

func NewTradeHandler(
	tradeRepo repositories.TradeRepository,
	bubbleRepo repositories.BubbleRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	portfolioRepo repositories.PortfolioRepository,
) *TradeHandler {
	return &TradeHandler{
		tradeRepo:      tradeRepo,
		bubbleRepo:     bubbleRepo,
		userSymbolRepo: userSymbolRepo,
		portfolioRepo:  portfolioRepo,
	}
}

type TradeItem struct {
	ID             string  `json:"id"`
	BubbleID       *string `json:"bubble_id,omitempty"`
	Exchange       string  `json:"exchange"`
	Symbol         string  `json:"symbol"`
	Side           string  `json:"side"`
	PositionSide   *string `json:"position_side,omitempty"`
	OpenClose      *string `json:"open_close,omitempty"`
	ReduceOnly     *bool   `json:"reduce_only,omitempty"`
	Quantity       string  `json:"quantity"`
	Price          string  `json:"price"`
	RealizedPnL    *string `json:"realized_pnl,omitempty"`
	TradeTime      string  `json:"trade_time"`
	BinanceTradeID int64   `json:"binance_trade_id"`
}

type TradeListResponse struct {
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
	Total int         `json:"total"`
	Items []TradeItem `json:"items"`
}

type TradeImportResponse struct {
	Imported int `json:"imported"`
	Skipped  int `json:"skipped"`
}

type TradeConvertResponse struct {
	Created int `json:"created"`
	Skipped int `json:"skipped"`
}

type TradeSummaryResponse struct {
	Exchange   string                              `json:"exchange"`
	Totals     repositories.TradeSummary           `json:"totals"`
	ByExchange []repositories.TradeExchangeSummary `json:"by_exchange"`
	BySide     []repositories.TradeSideSummary     `json:"by_side"`
	BySymbol   []repositories.TradeSymbolSummary   `json:"by_symbol"`
}

func (h *TradeHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	exchange := strings.TrimSpace(c.Query("exchange"))
	if exchange != "" {
		if _, ok := allowedExchanges[exchange]; !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
		}
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	side := strings.ToUpper(strings.TrimSpace(c.Query("side")))
	if side != "" && side != "BUY" && side != "SELL" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "side is invalid"})
	}

	from, err := parseTimeQuery(c.Query("from"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
	}
	to, err := parseTimeQuery(c.Query("to"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
	}

	filter := repositories.TradeFilter{
		Exchange: exchange,
		Symbol:   symbol,
		Side:     side,
		From:     from,
		To:       to,
		Limit:    limit,
		Offset:   (page - 1) * limit,
		Sort:     strings.ToLower(strings.TrimSpace(c.Query("sort"))),
	}

	trades, total, err := h.tradeRepo.List(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]TradeItem, 0, len(trades))
	for _, trade := range trades {
		item := TradeItem{
			ID:             trade.ID.String(),
			Exchange:       trade.Exchange,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
			PositionSide:   trade.PositionSide,
			OpenClose:      trade.OpenClose,
			ReduceOnly:     trade.ReduceOnly,
			Quantity:       trade.Quantity,
			Price:          trade.Price,
			RealizedPnL:    trade.RealizedPnL,
			TradeTime:      trade.TradeTime.Format(time.RFC3339),
			BinanceTradeID: trade.BinanceTradeID,
		}
		if trade.BubbleID != nil {
			id := trade.BubbleID.String()
			item.BubbleID = &id
		}
		items = append(items, item)
	}

	return c.Status(200).JSON(TradeListResponse{Page: page, Limit: limit, Total: total, Items: items})
}

func (h *TradeHandler) Summary(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	exchange := strings.TrimSpace(c.Query("exchange"))
	if exchange != "" {
		if _, ok := allowedExchanges[exchange]; !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
		}
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	side := strings.ToUpper(strings.TrimSpace(c.Query("side")))
	if side != "" && side != "BUY" && side != "SELL" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "side is invalid"})
	}

	from, err := parseTimeQuery(c.Query("from"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
	}
	to, err := parseTimeQuery(c.Query("to"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
	}

	filter := repositories.TradeFilter{
		Exchange: exchange,
		Symbol:   symbol,
		Side:     side,
		From:     from,
		To:       to,
	}

	totals, bySide, bySymbol, err := h.tradeRepo.Summary(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var byExchange []repositories.TradeExchangeSummary
	if exchange == "" {
		byExchange, err = h.tradeRepo.SummaryByExchange(c.Context(), userID, filter)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
	} else {
		byExchange = []repositories.TradeExchangeSummary{
			{
				Exchange:         exchange,
				TotalTrades:      totals.TotalTrades,
				RealizedPnLTotal: totals.RealizedPnLTotal,
			},
		}
	}

	response := TradeSummaryResponse{
		Exchange:   exchange,
		Totals:     totals,
		ByExchange: byExchange,
		BySide:     bySide,
		BySymbol:   bySymbol,
	}
	return c.Status(200).JSON(response)
}

func (h *TradeHandler) Import(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "csv file is required"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to open csv"})
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	header, err := reader.Read()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to read header"})
	}

	index := mapCsvHeader(header)
	missing := missingCsvColumns(index, []string{"exchange", "symbol", "side", "quantity", "price", "trade_time"})
	if len(missing) > 0 {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "missing columns: " + strings.Join(missing, ", ")})
	}

	imported := 0
	skipped := 0
	for {
		row, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to read csv"})
		}

		payload, err := parseCsvTradeRow(row, index)
		if err != nil {
			skipped += 1
			continue
		}

		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     userID,
			Symbol:     payload.Symbol,
			Timeframe:  payload.Timeframe,
			CandleTime: floorToTimeframe(payload.TradeTime, payload.Timeframe),
			Price:      payload.Price,
			BubbleType: "auto",
			AssetClass: normalizeOptionalLabelPtr("crypto"),
			VenueName:  normalizeOptionalLabelPtr(payload.Exchange),
			Memo:       payload.Memo,
			Tags:       payload.Tags,
			CreatedAt:  time.Now().UTC(),
		}

		if err := h.bubbleRepo.Create(c.Context(), bubble); err != nil {
			skipped += 1
			continue
		}

		trade := &entities.Trade{
			ID:             uuid.New(),
			UserID:         userID,
			BubbleID:       &bubble.ID,
			BinanceTradeID: payload.TradeID,
			Exchange:       payload.Exchange,
			Symbol:         payload.Symbol,
			Side:           payload.Side,
			Quantity:       payload.Quantity,
			Price:          payload.Price,
			RealizedPnL:    payload.RealizedPnL,
			TradeTime:      payload.TradeTime,
		}

		if err := h.tradeRepo.Create(c.Context(), trade); err != nil {
			if isUniqueViolation(err) {
				_, _ = h.bubbleRepo.DeleteByIDAndUser(c.Context(), bubble.ID, userID)
				skipped += 1
				continue
			}
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		if h.portfolioRepo != nil {
			if err := h.syncTradeEventFromCSV(c.Context(), userID, payload, trade); err != nil {
				// Keep CSV import resilient; log and continue.
				fmt.Printf("trade import: trade_event sync failed user=%s exchange=%s trade=%s err=%v\n", userID.String(), payload.Exchange, trade.ID.String(), err)
			}
		}

		imported += 1
	}

	return c.Status(200).JSON(TradeImportResponse{Imported: imported, Skipped: skipped})
}

func (h *TradeHandler) ConvertBubbles(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 500
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed <= 0 {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 2000 {
			parsed = 2000
		}
		limit = parsed
	}

	defaultTimeframe := strings.ToLower(strings.TrimSpace(c.Query("default_timeframe")))
	if defaultTimeframe == "" {
		defaultTimeframe = "1d"
	}
	if defaultTimeframe != "1m" && defaultTimeframe != "15m" && defaultTimeframe != "1h" && defaultTimeframe != "4h" && defaultTimeframe != "1d" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "default_timeframe is invalid"})
	}

	symbols, err := h.userSymbolRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	symbolTimeframes := map[string]string{}
	for _, symbol := range symbols {
		symbolTimeframes[symbol.Symbol] = symbol.TimeframeDefault
	}

	created := 0
	skipped := 0
	for {
		trades, err := h.tradeRepo.ListUnlinked(c.Context(), userID, limit)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if len(trades) == 0 {
			break
		}

		for _, trade := range trades {
			if trade.BubbleID != nil {
				skipped += 1
				continue
			}

			timeframe := symbolTimeframes[trade.Symbol]
			if timeframe == "" {
				timeframe = defaultTimeframe
			}

			memo := fmt.Sprintf("Trade sync: %s %s @ %s", trade.Symbol, trade.Side, trade.Price)
			memoPtr := &memo
			tags := buildSideTags(trade.Side, "")

			bubble := &entities.Bubble{
				ID:         uuid.New(),
				UserID:     trade.UserID,
				Symbol:     trade.Symbol,
				Timeframe:  timeframe,
				CandleTime: floorToTimeframe(trade.TradeTime, timeframe),
				Price:      trade.Price,
				BubbleType: "auto",
				AssetClass: normalizeOptionalLabelPtr("crypto"),
				VenueName:  normalizeOptionalLabelPtr(trade.Exchange),
				Memo:       memoPtr,
				Tags:       tags,
				CreatedAt:  time.Now().UTC(),
			}

			if err := h.bubbleRepo.Create(c.Context(), bubble); err != nil {
				skipped += 1
				continue
			}

			if err := h.tradeRepo.UpdateBubbleID(c.Context(), trade.ID, bubble.ID); err != nil {
				_, _ = h.bubbleRepo.DeleteByIDAndUser(c.Context(), bubble.ID, userID)
				return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
			}

			created += 1
		}
	}

	return c.Status(200).JSON(TradeConvertResponse{Created: created, Skipped: skipped})
}

func (h *TradeHandler) BackfillBubbles(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	updated, err := h.tradeRepo.BackfillBubbleMetadata(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"updated": updated})
}

type csvTradePayload struct {
	Exchange    string
	Symbol      string
	Side        string
	Quantity    string
	Price       string
	RealizedPnL *string
	TradeTime   time.Time
	Timeframe   string
	Tags        []string
	Memo        *string
	TradeID     int64
}

func mapCsvHeader(header []string) map[string]int {
	index := make(map[string]int)
	for i, name := range header {
		trimmed := strings.ToLower(strings.TrimSpace(name))
		if trimmed == "" {
			continue
		}
		index[trimmed] = i
	}
	return index
}

func normalizeOptionalLabelPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	normalized := strings.ToLower(trimmed)
	return &normalized
}

func missingCsvColumns(index map[string]int, columns []string) []string {
	missing := []string{}
	for _, column := range columns {
		if _, ok := index[column]; !ok {
			missing = append(missing, column)
		}
	}
	return missing
}

func parseCsvTradeRow(row []string, index map[string]int) (csvTradePayload, error) {
	get := func(key string) string {
		idx, ok := index[key]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	exchange := strings.ToLower(get("exchange"))
	if exchange == "" || (exchange != "binance_futures" && exchange != "upbit") {
		return csvTradePayload{}, errors.New("invalid exchange")
	}

	symbol := strings.ToUpper(get("symbol"))
	if !csvSymbolPattern.MatchString(symbol) {
		return csvTradePayload{}, errors.New("invalid symbol")
	}

	side := normalizeCsvSide(get("side"))
	if side == "" {
		return csvTradePayload{}, errors.New("invalid side")
	}

	quantity := get("quantity")
	price := get("price")
	if quantity == "" || price == "" {
		return csvTradePayload{}, errors.New("missing quantity or price")
	}

	tradeTime, err := time.Parse(time.RFC3339, get("trade_time"))
	if err != nil {
		return csvTradePayload{}, errors.New("invalid trade_time")
	}

	var realizedPnL *string
	if value := get("realized_pnl"); value != "" {
		pnl := value
		realizedPnL = &pnl
	}

	tradeID := deriveCsvTradeID(exchange, symbol, side, quantity, price, tradeTime, realizedPnL)
	annotation := fmt.Sprintf("CSV import: %s %s @ %s", symbol, side, price)
	annotationPtr := &annotation

	return csvTradePayload{
		Exchange:    exchange,
		Symbol:      symbol,
		Side:        side,
		Quantity:    quantity,
		Price:       price,
		RealizedPnL: realizedPnL,
		TradeTime:   tradeTime,
		Timeframe:   normalizeCsvTimeframe(get("timeframe")),
		Tags:        buildSideTags(side, get("tags")),
		Memo:        annotationPtr,
		TradeID:     tradeID,
	}, nil
}

var csvSymbolPattern = regexp.MustCompile(`^[A-Z0-9-]{3,20}$`)

func normalizeCsvSide(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	switch trimmed {
	case "buy", "bid":
		return "BUY"
	case "sell", "ask":
		return "SELL"
	default:
		return ""
	}
}

func normalizeCsvTimeframe(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	switch trimmed {
	case "1m", "15m", "1h", "4h", "1d":
		return trimmed
	default:
		return "1d"
	}
}

func buildSideTags(side string, rawTags string) []string {
	tags := []string{}
	for _, value := range strings.Split(rawTags, ",") {
		trimmed := strings.ToLower(strings.TrimSpace(value))
		if trimmed == "" {
			continue
		}
		tags = append(tags, trimmed)
	}
	if side == "BUY" {
		tags = append(tags, "buy")
	}
	if side == "SELL" {
		tags = append(tags, "sell")
	}
	return tags
}

func deriveCsvTradeID(exchange string, symbol string, side string, quantity string, price string, tradeTime time.Time, pnl *string) int64 {
	value := exchange + "|" + symbol + "|" + side + "|" + quantity + "|" + price + "|" + tradeTime.Format(time.RFC3339)
	if pnl != nil {
		value = value + "|" + *pnl
	}
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(value))
	return int64(hasher.Sum64())
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func floorToTimeframe(timeValue time.Time, timeframe string) time.Time {
	utc := timeValue.UTC()
	switch timeframe {
	case "1d":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	case "4h":
		hour := (utc.Hour() / 4) * 4
		return time.Date(utc.Year(), utc.Month(), utc.Day(), hour, 0, 0, 0, time.UTC)
	case "1h":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
	case "15m":
		minute := (utc.Minute() / 15) * 15
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), minute, 0, 0, time.UTC)
	default:
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), utc.Minute(), 0, 0, time.UTC)
	}
}

func parseTimeQuery(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (h *TradeHandler) syncTradeEventFromCSV(ctx context.Context, userID uuid.UUID, payload csvTradePayload, trade *entities.Trade) error {
	if trade == nil {
		return fmt.Errorf("trade is nil")
	}

	venueCode, venueType, venueName := resolveVenueFromExchange(payload.Exchange)
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, venueType, venueName, "")
	if err != nil {
		return err
	}

	base, quote, normalizedSymbol := parseInstrumentSymbol(payload.Symbol, venueCode)
	instrumentID, err := h.portfolioRepo.UpsertInstrument(ctx, "crypto", base, quote, normalizedSymbol)
	if err != nil {
		return err
	}
	_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, payload.Symbol)

	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "csv-import", nil, "csv")
	if err != nil {
		return err
	}

	side := strings.ToLower(strings.TrimSpace(payload.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(payload.Quantity)
	price := normalizeOptionalLiteral(payload.Price)

	externalID := ""
	if payload.TradeID != 0 {
		externalID = fmt.Sprintf("%d", payload.TradeID)
	} else {
		externalID = trade.ID.String()
	}

	eventType := resolveEventType(payload.Exchange)
	record := &portfolioTradeEventRecord{
		Symbol:     normalizedSymbol,
		EventType:  eventType,
		Side:       &side,
		Qty:        qty,
		Price:      price,
		ExecutedAt: payload.TradeTime,
		ExternalID: &externalID,
	}
	dedupe := buildTradeEventDedupeKey(venueCode, "crypto", record)

	metadata := map[string]string{
		"trade_id": trade.ID.String(),
		"exchange": payload.Exchange,
	}
	metadataRaw, _ := json.Marshal(metadata)
	raw := json.RawMessage(metadataRaw)

	event := &entities.TradeEvent{
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
		ExecutedAt:   payload.TradeTime,
		Source:       "csv",
		ExternalID:   &externalID,
		Metadata:     &raw,
		DedupeKey:    &dedupe,
	}

	if err := h.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
		if isUniqueViolationError(err) {
			return nil
		}
		return err
	}
	return nil
}

type LinkTradeRequest struct {
	TradeID  string `json:"trade_id"`
	BubbleID string `json:"bubble_id"`
}

type UnlinkTradeRequest struct {
	TradeID string `json:"trade_id"`
}

// LinkToBubble links a trade to a bubble
func (h *TradeHandler) LinkToBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req LinkTradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid request body"})
	}

	tradeID, err := uuid.Parse(req.TradeID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid trade_id"})
	}

	bubbleID, err := uuid.Parse(req.BubbleID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid bubble_id"})
	}

	// Verify trade belongs to user
	trade, err := h.tradeRepo.GetByID(c.Context(), tradeID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "trade not found"})
	}
	if trade.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "trade does not belong to user"})
	}

	// Verify bubble belongs to user
	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "bubble does not belong to user"})
	}

	// Link trade to bubble
	if err := h.tradeRepo.UpdateBubbleID(c.Context(), tradeID, bubbleID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"success": true, "trade_id": tradeID.String(), "bubble_id": bubbleID.String()})
}

// UnlinkFromBubble unlinks a trade from its bubble
func (h *TradeHandler) UnlinkFromBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UnlinkTradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid request body"})
	}

	tradeID, err := uuid.Parse(req.TradeID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid trade_id"})
	}

	// Verify trade belongs to user
	trade, err := h.tradeRepo.GetByID(c.Context(), tradeID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "trade not found"})
	}
	if trade.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "trade does not belong to user"})
	}

	// Unlink trade from bubble
	if err := h.tradeRepo.ClearBubbleID(c.Context(), tradeID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"success": true, "trade_id": tradeID.String()})
}

// ListByBubble returns trades linked to a specific bubble
func (h *TradeHandler) ListByBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("bubbleId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid bubble_id"})
	}

	// Verify bubble belongs to user
	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "bubble does not belong to user"})
	}

	trades, err := h.tradeRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]TradeItem, 0, len(trades))
	for _, trade := range trades {
		item := TradeItem{
			ID:             trade.ID.String(),
			Exchange:       trade.Exchange,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
			Quantity:       trade.Quantity,
			Price:          trade.Price,
			RealizedPnL:    trade.RealizedPnL,
			TradeTime:      trade.TradeTime.Format(time.RFC3339),
			BinanceTradeID: trade.BinanceTradeID,
		}
		if trade.BubbleID != nil {
			id := trade.BubbleID.String()
			item.BubbleID = &id
		}
		items = append(items, item)
	}

	return c.Status(200).JSON(fiber.Map{"trades": items})
}

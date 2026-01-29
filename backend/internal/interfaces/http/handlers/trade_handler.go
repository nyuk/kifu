package handlers

import (
	"encoding/csv"
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
	"upbit":           {},
}

type TradeHandler struct {
	tradeRepo      repositories.TradeRepository
	bubbleRepo     repositories.BubbleRepository
	userSymbolRepo repositories.UserSymbolRepository
}

func NewTradeHandler(
	tradeRepo repositories.TradeRepository,
	bubbleRepo repositories.BubbleRepository,
	userSymbolRepo repositories.UserSymbolRepository,
) *TradeHandler {
	return &TradeHandler{
		tradeRepo:      tradeRepo,
		bubbleRepo:     bubbleRepo,
		userSymbolRepo: userSymbolRepo,
	}
}

type TradeItem struct {
	ID             string  `json:"id"`
	BubbleID       *string `json:"bubble_id,omitempty"`
	Exchange       string  `json:"exchange"`
	Symbol         string  `json:"symbol"`
	Side           string  `json:"side"`
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

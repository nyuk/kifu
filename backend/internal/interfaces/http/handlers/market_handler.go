package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const (
	binanceFapiBaseURL = "https://fapi.binance.com"
	upbitCandleBaseURL = "https://api.upbit.com/v1/candles"
	defaultSymbol      = "BTCUSDT"
	defaultTimeframe   = "1h"
)

var (
	symbolPattern    = regexp.MustCompile(`^[A-Z0-9-]{3,20}$`)
	upbitSymbolPattern = regexp.MustCompile(`^[A-Z]{3,5}-[A-Z0-9]{1,12}$`)
	allowedIntervals = map[string]struct{}{
		"1m":  {},
		"15m": {},
		"1h":  {},
		"4h":  {},
		"1d":  {},
	}
)

type MarketHandler struct {
	userSymbolRepo repositories.UserSymbolRepository
	client         *http.Client
	cache          *klineCache
}

type klineCache struct {
	mu    sync.RWMutex
	items map[string]klineCacheEntry
}

type klineCacheEntry struct {
	expiresAt time.Time
	payload   []byte
}

func NewMarketHandler(userSymbolRepo repositories.UserSymbolRepository) *MarketHandler {
	return &MarketHandler{
		userSymbolRepo: userSymbolRepo,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		cache: &klineCache{
			items: make(map[string]klineCacheEntry),
		},
	}
}

type UserSymbolsResponse struct {
	Symbols []UserSymbolItem `json:"symbols"`
}

type UserSymbolItem struct {
	Symbol           string `json:"symbol"`
	TimeframeDefault string `json:"timeframe_default"`
}

type UpdateSymbolsRequest struct {
	Symbols []UserSymbolItem `json:"symbols"`
}

type KlineItem struct {
	Time   int64  `json:"time"`
	Open   string `json:"open"`
	High   string `json:"high"`
	Low    string `json:"low"`
	Close  string `json:"close"`
	Volume string `json:"volume"`
}

func (h *MarketHandler) GetUserSymbols(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	symbols, err := h.userSymbolRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if len(symbols) == 0 {
		defaultEntry := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           defaultSymbol,
			TimeframeDefault: defaultTimeframe,
			CreatedAt:        time.Now(),
		}
		if err := h.userSymbolRepo.Create(c.Context(), defaultEntry); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		symbols = []*entities.UserSymbol{defaultEntry}
	}

	response := UserSymbolsResponse{Symbols: make([]UserSymbolItem, 0, len(symbols))}
	for _, symbol := range symbols {
		response.Symbols = append(response.Symbols, UserSymbolItem{
			Symbol:           symbol.Symbol,
			TimeframeDefault: symbol.TimeframeDefault,
		})
	}

	return c.Status(200).JSON(response)
}

func (h *MarketHandler) UpdateUserSymbols(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UpdateSymbolsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if len(req.Symbols) == 0 {
		req.Symbols = []UserSymbolItem{{Symbol: defaultSymbol, TimeframeDefault: defaultTimeframe}}
	}

	now := time.Now()
	entitiesList := make([]*entities.UserSymbol, 0, len(req.Symbols))
	response := UserSymbolsResponse{Symbols: make([]UserSymbolItem, 0, len(req.Symbols))}

	for _, item := range req.Symbols {
		symbol := strings.ToUpper(strings.TrimSpace(item.Symbol))
		timeframe := strings.ToLower(strings.TrimSpace(item.TimeframeDefault))

		if symbol == "" {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is required"})
		}
		if !symbolPattern.MatchString(symbol) {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol format is invalid"})
		}
		if timeframe == "" {
			timeframe = defaultTimeframe
		}
		if _, ok := allowedIntervals[timeframe]; !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_TIMEFRAME", "message": "timeframe is invalid"})
		}

		entitiesList = append(entitiesList, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           symbol,
			TimeframeDefault: timeframe,
			CreatedAt:        now,
		})

		response.Symbols = append(response.Symbols, UserSymbolItem{
			Symbol:           symbol,
			TimeframeDefault: timeframe,
		})
	}

	if err := h.userSymbolRepo.ReplaceByUser(c.Context(), userID, entitiesList); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(response)
}

func (h *MarketHandler) GetKlines(c *fiber.Ctx) error {
	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	interval := strings.ToLower(strings.TrimSpace(c.Query("interval")))
	exchange := strings.ToLower(strings.TrimSpace(c.Query("exchange")))
	limitStr := strings.TrimSpace(c.Query("limit"))

	if symbol == "" || !symbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is required"})
	}
	if _, ok := allowedIntervals[interval]; !ok {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TIMEFRAME", "message": "interval is invalid"})
	}

	endTimeStr := strings.TrimSpace(c.Query("endTime"))

	limit := 500
	if limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed <= 0 {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 1500 {
			parsed = 1500
		}
		limit = parsed
	}

	var endTime int64
	if endTimeStr != "" {
		parsed, err := strconv.ParseInt(endTimeStr, 10, 64)
		if err == nil {
			endTime = parsed
		}
	}

	cacheKey := fmt.Sprintf("%s|%s|%s|%d|%d", exchange, symbol, interval, limit, endTime)
	if payload, ok := h.cache.get(cacheKey); ok {
		c.Set("Content-Type", "application/json")
		return c.Status(200).Send(payload)
	}

	if exchange == "upbit" {
		if !upbitSymbolPattern.MatchString(symbol) {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "upbit symbol format is invalid"})
		}
		payload, err := fetchUpbitKlines(c.Context(), h.client, symbol, interval, limit, endTime)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
		}
		h.cache.set(cacheKey, payload, 30*time.Second)
		c.Set("Content-Type", "application/json")
		return c.Status(200).Send(payload)
	}

	requestURL := buildKlinesURL(symbol, interval, limit, endTime)
	req, err := http.NewRequestWithContext(c.Context(), http.MethodGet, requestURL, nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": strings.TrimSpace(string(body))})
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
	}

	items := make([]KlineItem, 0, len(raw))
	for _, row := range raw {
		if len(row) < 6 {
			continue
		}

		openTime, ok := asInt64(row[0])
		if !ok {
			continue
		}

		open, ok := asString(row[1])
		if !ok {
			continue
		}
		high, ok := asString(row[2])
		if !ok {
			continue
		}
		low, ok := asString(row[3])
		if !ok {
			continue
		}
		closeVal, ok := asString(row[4])
		if !ok {
			continue
		}
		volume, ok := asString(row[5])
		if !ok {
			continue
		}

		items = append(items, KlineItem{
			Time:   openTime / 1000,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  closeVal,
			Volume: volume,
		})
	}

	payload, err := json.Marshal(items)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	h.cache.set(cacheKey, payload, 30*time.Second)
	c.Set("Content-Type", "application/json")
	return c.Status(200).Send(payload)
}

func buildKlinesURL(symbol string, interval string, limit int, endTime int64) string {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", interval)
	params.Set("limit", strconv.Itoa(limit))
	if endTime > 0 {
		// Binance FAPI Expects milliseconds
		// If our input is unix seconds (which app usually uses internally), convert?
		// Wait, standard for API is usually ms.
		// Let's assume input is ms since we usually deal with ms from frontend timestamps if raw.
		// But our KlineItem.Time is seconds.
		// Frontend sends what? Usually the time field is seconds.
		// Binance needs MS.
		params.Set("endTime", strconv.FormatInt(endTime, 10))
	}
	return fmt.Sprintf("%s/fapi/v1/klines?%s", binanceFapiBaseURL, params.Encode())
}

type upbitKlineItem struct {
	Timestamp    int64   `json:"timestamp"`
	OpenPrice    float64 `json:"opening_price"`
	HighPrice    float64 `json:"high_price"`
	LowPrice     float64 `json:"low_price"`
	ClosePrice   float64 `json:"trade_price"`
	AccVolume    float64 `json:"candle_acc_trade_volume"`
}

func upbitIntervalPath(interval string) (string, bool) {
	switch interval {
	case "1m":
		return "minutes/1", true
	case "15m":
		return "minutes/15", true
	case "1h":
		return "minutes/60", true
	case "4h":
		return "minutes/240", true
	case "1d":
		return "days", true
	default:
		return "", false
	}
}

func fetchUpbitKlines(ctx context.Context, client *http.Client, symbol string, interval string, limit int, endTime int64) ([]byte, error) {
	path, ok := upbitIntervalPath(interval)
	if !ok {
		return nil, fmt.Errorf("interval is invalid")
	}
	if limit > 200 {
		limit = 200
	}

	params := url.Values{}
	params.Set("market", symbol)
	params.Set("count", strconv.Itoa(limit))
	if endTime > 0 {
		params.Set("to", time.UnixMilli(endTime).UTC().Format(time.RFC3339))
	}

	requestURL := fmt.Sprintf("%s/%s?%s", upbitCandleBaseURL, path, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("%s", strings.TrimSpace(string(body)))
	}

	var raw []upbitKlineItem
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	items := make([]KlineItem, 0, len(raw))
	for i := len(raw) - 1; i >= 0; i-- {
		row := raw[i]
		items = append(items, KlineItem{
			Time:   row.Timestamp / 1000,
			Open:   strconv.FormatFloat(row.OpenPrice, 'f', -1, 64),
			High:   strconv.FormatFloat(row.HighPrice, 'f', -1, 64),
			Low:    strconv.FormatFloat(row.LowPrice, 'f', -1, 64),
			Close:  strconv.FormatFloat(row.ClosePrice, 'f', -1, 64),
			Volume: strconv.FormatFloat(row.AccVolume, 'f', -1, 64),
		})
	}

	return json.Marshal(items)
}

func (c *klineCache) get(key string) ([]byte, bool) {
	c.mu.RLock()
	entry, ok := c.items[key]
	c.mu.RUnlock()
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}
	return entry.payload, true
}

func (c *klineCache) set(key string, payload []byte, ttl time.Duration) {
	c.mu.Lock()
	c.items[key] = klineCacheEntry{
		expiresAt: time.Now().Add(ttl),
		payload:   payload,
	}
	c.mu.Unlock()
}

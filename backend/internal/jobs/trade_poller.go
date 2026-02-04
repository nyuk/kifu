package jobs

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

const (
	binanceFapiBaseURL  = "https://fapi.binance.com"
	binanceAPIBaseURL   = "https://api.binance.com"
	upbitAPIBaseURL     = "https://api.upbit.com"
	binanceFuturesID    = "binance_futures"
	binanceSpotID       = "binance_spot"
	upbitExchangeID     = "upbit"
	defaultPollInterval = 300 * time.Second
)

type TradePoller struct {
	pool           *pgxpool.Pool
	exchangeRepo   repositories.ExchangeCredentialRepository
	userSymbolRepo repositories.UserSymbolRepository
	syncStateRepo  repositories.TradeSyncStateRepository
	encryptionKey  []byte
	pollInterval   time.Duration
	client         *http.Client
	runningPollers map[string]context.CancelFunc
	mu             sync.Mutex
	useMockTrades  bool
	mockTradesPath string
}

type SyncOptions struct {
	FullBackfill bool
	HistoryDays  int
}

type normalizedTrade struct {
	ID           int64
	Symbol       string
	Side         string
	PositionSide *string
	OpenClose    *string
	ReduceOnly   *bool
	Quantity     string
	Price        string
	RealizedPnL  string
	TradeTime    int64
}

type binanceFuturesTrade struct {
	ID           int64  `json:"id"`
	Symbol       string `json:"symbol"`
	Side         string `json:"side"`
	Quantity     string `json:"qty"`
	Price        string `json:"price"`
	RealizedPnL  string `json:"realizedPnl"`
	TradeTime    int64  `json:"time"`
	PositionSide string `json:"positionSide"`
	Maker        bool   `json:"maker"`
}

type binanceSpotTrade struct {
	ID        int64  `json:"id"`
	Symbol    string `json:"symbol"`
	Price     string `json:"price"`
	Quantity  string `json:"qty"`
	TradeTime int64  `json:"time"`
	IsBuyer   bool   `json:"isBuyer"`
}

type upbitClosedOrder struct {
	UUID           string            `json:"uuid"`
	Side           string            `json:"side"`
	OrdType        string            `json:"ord_type"`
	Price          string            `json:"price"`
	AvgPrice       string            `json:"avg_price"`
	Funds          string            `json:"funds"`
	State          string            `json:"state"`
	Market         string            `json:"market"`
	CreatedAt      string            `json:"created_at"`
	ExecutedVolume string            `json:"executed_volume"`
	ExecutedFund   *string           `json:"executed_fund"`
	ExecutedFunds  *string           `json:"executed_funds"`
	Trades         []upbitOrderTrade `json:"trades"`
}

type upbitOrderTrade struct {
	Price  string `json:"price"`
	Volume string `json:"volume"`
}

type mockTrade struct {
	ID        int64  `json:"id"`
	Symbol    string `json:"symbol"`
	Side      string `json:"side"`
	Quantity  string `json:"qty"`
	Price     string `json:"price"`
	TradeTime string `json:"trade_time"`
}

func NewTradePoller(
	pool *pgxpool.Pool,
	exchangeRepo repositories.ExchangeCredentialRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	syncStateRepo repositories.TradeSyncStateRepository,
	encryptionKey []byte,
) *TradePoller {
	useMock := strings.EqualFold(os.Getenv("MOCK_BINANCE_TRADES"), "true")
	mockPath := filepath.Join("kifu", "backend", "fixtures", "trades.json")
	if pathOverride := os.Getenv("MOCK_BINANCE_TRADES_PATH"); pathOverride != "" {
		mockPath = pathOverride
	}

	return &TradePoller{
		pool:           pool,
		exchangeRepo:   exchangeRepo,
		userSymbolRepo: userSymbolRepo,
		syncStateRepo:  syncStateRepo,
		encryptionKey:  encryptionKey,
		pollInterval:   defaultPollInterval,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		runningPollers: make(map[string]context.CancelFunc),
		useMockTrades:  useMock,
		mockTradesPath: mockPath,
	}
}

func (p *TradePoller) Start(ctx context.Context) {
	for _, exchange := range []string{binanceFuturesID, binanceSpotID, upbitExchangeID} {
		creds, err := p.exchangeRepo.ListValid(ctx, exchange)
		if err != nil {
			log.Printf("trade poller: failed to list exchange credentials (%s): %v", exchange, err)
			continue
		}

		for _, cred := range creds {
			p.startUserPoller(ctx, cred)
		}
	}
}

func (p *TradePoller) startUserPoller(ctx context.Context, cred *entities.ExchangeCredential) {
	key := fmt.Sprintf("%s|%s", cred.UserID.String(), cred.Exchange)

	p.mu.Lock()
	if _, exists := p.runningPollers[key]; exists {
		p.mu.Unlock()
		return
	}
	userCtx, cancel := context.WithCancel(ctx)
	p.runningPollers[key] = cancel
	p.mu.Unlock()

	log.Printf("trade poller: starting for user %s (%s)", cred.UserID.String(), cred.Exchange)

	go func() {
		ticker := time.NewTicker(p.pollInterval)
		defer ticker.Stop()
		for {
			if err := p.pollOnce(userCtx, cred, nil); err != nil {
				log.Printf("trade poller: user %s (%s) error: %v", cred.UserID.String(), cred.Exchange, err)
			}
			select {
			case <-userCtx.Done():
				log.Printf("trade poller: stopped for user %s (%s)", cred.UserID.String(), cred.Exchange)
				return
			case <-ticker.C:
			}
		}
	}()
}

func (p *TradePoller) pollOnce(ctx context.Context, cred *entities.ExchangeCredential, options *SyncOptions) error {
	if cred.Exchange != binanceFuturesID && cred.Exchange != binanceSpotID && cred.Exchange != upbitExchangeID {
		return ErrUnsupportedExchange
	}

	apiKey, err := cryptoutil.Decrypt(cred.APIKeyEnc, p.encryptionKey)
	if err != nil {
		return err
	}
	apiSecret, err := cryptoutil.Decrypt(cred.APISecretEnc, p.encryptionKey)
	if err != nil {
		return err
	}

	symbols, err := p.userSymbolRepo.ListByUser(ctx, cred.UserID)
	if err != nil {
		return err
	}
	if len(symbols) == 0 {
		defaultSymbol := "BTCUSDT"
		if cred.Exchange == upbitExchangeID {
			defaultSymbol = "KRW-BTC"
		}
		defaultEntry := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           cred.UserID,
			Symbol:           defaultSymbol,
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		}
		if err := p.userSymbolRepo.Create(ctx, defaultEntry); err != nil {
			return err
		}
		symbols = []*entities.UserSymbol{defaultEntry}
	}

	if len(symbols) > 20 {
		log.Printf("trade poller: user %s has %d symbols, limiting to 20", cred.UserID.String(), len(symbols))
		symbols = symbols[:20]
	}

	if cred.Exchange == upbitExchangeID {
		symbols = normalizeUpbitSymbols(symbols)
	}

	if cred.Exchange == upbitExchangeID {
		virtualSymbol := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           cred.UserID,
			Symbol:           "ALL_KRW",
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		}
		if p.useMockTrades {
			err = p.handleMockTrades(ctx, cred.UserID, cred.Exchange, virtualSymbol)
		} else {
			err = p.fetchAndStoreTrades(ctx, cred.UserID, cred.Exchange, virtualSymbol, apiKey, apiSecret, options)
		}
		if err != nil {
			log.Printf("trade poller: user %s (%s) symbol %s error: %v", cred.UserID.String(), cred.Exchange, virtualSymbol.Symbol, err)
		}
		return nil
	}

	for _, symbol := range symbols {
		if p.useMockTrades {
			err = p.handleMockTrades(ctx, cred.UserID, cred.Exchange, symbol)
		} else {
			err = p.fetchAndStoreTrades(ctx, cred.UserID, cred.Exchange, symbol, apiKey, apiSecret, options)
		}
		if err != nil {
			log.Printf("trade poller: user %s (%s) symbol %s error: %v", cred.UserID.String(), cred.Exchange, symbol.Symbol, err)
		}
	}

	return nil
}

func (p *TradePoller) SyncCredentialOnce(ctx context.Context, cred *entities.ExchangeCredential) error {
	if cred == nil {
		return fmt.Errorf("credential is required")
	}
	return p.pollOnce(ctx, cred, nil)
}

func (p *TradePoller) SyncCredentialOnceWithOptions(ctx context.Context, cred *entities.ExchangeCredential, options SyncOptions) error {
	if cred == nil {
		return fmt.Errorf("credential is required")
	}
	return p.pollOnce(ctx, cred, &options)
}

func (p *TradePoller) fetchAndStoreTrades(ctx context.Context, userID uuid.UUID, exchange string, symbol *entities.UserSymbol, apiKey string, apiSecret string, options *SyncOptions) error {
	state, err := p.syncStateRepo.GetByUserAndSymbol(ctx, userID, exchange, symbol.Symbol)
	if err != nil {
		return err
	}

	fromID := int64(0)
	useFromID := false
	startTime := int64(0)
	if options != nil && options.FullBackfill {
		if exchange == binanceFuturesID || exchange == binanceSpotID {
			// Binance userTrades supports cursor paging by fromId; use it for deep history backfill.
			useFromID = true
			fromID = 0
		} else {
			historyDays := options.HistoryDays
			if historyDays <= 0 {
				historyDays = 365
			}
			if historyDays > 3650 {
				historyDays = 3650
			}
			startTime = time.Now().Add(time.Duration(-historyDays) * 24 * time.Hour).UnixMilli()
		}
	} else if exchange == upbitExchangeID && state != nil {
		startTime = state.LastSyncAt.Add(-1 * time.Minute).UnixMilli()
	} else if state != nil && state.LastTradeID > 0 {
		fromID = state.LastTradeID + 1
		useFromID = true
	} else {
		startTime = time.Now().Add(-7 * 24 * time.Hour).UnixMilli()
	}

	var latestID int64
	for {
		var trades []normalizedTrade
		var lastID int64
		switch exchange {
		case binanceFuturesID:
			trades, lastID, err = p.requestFuturesTrades(ctx, apiKey, apiSecret, symbol.Symbol, fromID, useFromID, startTime)
		case binanceSpotID:
			trades, lastID, err = p.requestSpotTrades(ctx, apiKey, apiSecret, symbol.Symbol, fromID, useFromID, startTime)
		case upbitExchangeID:
			trades, lastID, err = p.requestUpbitTrades(ctx, apiKey, apiSecret, symbol.Symbol, startTime, useFromID)
		default:
			return ErrUnsupportedExchange
		}
		if err != nil {
			return err
		}
		if len(trades) == 0 {
			break
		}

		if lastID > latestID {
			latestID = lastID
		}

		if err := p.persistTrades(ctx, userID, exchange, symbol, trades); err != nil {
			return err
		}

		if len(trades) < 1000 {
			break
		}
		if exchange == upbitExchangeID {
			break
		}

		fromID = lastID + 1
		useFromID = true
		startTime = 0
	}

	if latestID > 0 {
		lastSync := time.Now().UTC()
		if exchange == upbitExchangeID {
			lastSync = time.UnixMilli(latestID).UTC()
		}
		stateToSave := &entities.TradeSyncState{
			ID:          uuid.New(),
			UserID:      userID,
			Exchange:    exchange,
			Symbol:      symbol.Symbol,
			LastTradeID: latestID,
			LastSyncAt:  lastSync,
		}
		if err := p.syncStateRepo.Upsert(ctx, stateToSave); err != nil {
			return err
		}
	}

	return nil
}

func (p *TradePoller) requestFuturesTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, fromID int64, useFromID bool, startTime int64) ([]normalizedTrade, int64, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("timestamp", fmt.Sprintf("%d", time.Now().UnixMilli()))
	params.Set("recvWindow", "5000")
	params.Set("limit", "1000")
	if useFromID {
		params.Set("fromId", fmt.Sprintf("%d", fromID))
	} else if startTime > 0 {
		params.Set("startTime", fmt.Sprintf("%d", startTime))
	}

	signature := signParams(apiSecret, params)
	params.Set("signature", signature)

	requestURL := fmt.Sprintf("%s/fapi/v1/userTrades?%s", binanceFapiBaseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-MBX-APIKEY", apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("binance futures userTrades failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw []binanceFuturesTrade
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, 0, err
	}

	trades := make([]normalizedTrade, 0, len(raw))
	var lastID int64
	for _, trade := range raw {
		if trade.ID > lastID {
			lastID = trade.ID
		}
		trades = append(trades, normalizedTrade{
			ID:           trade.ID,
			Symbol:       trade.Symbol,
			Side:         strings.ToUpper(trade.Side),
			PositionSide: normalizePositionSide(trade.PositionSide),
			OpenClose:    deriveOpenClose(trade),
			ReduceOnly:   deriveReduceOnly(trade),
			Quantity:     trade.Quantity,
			Price:        trade.Price,
			RealizedPnL:  trade.RealizedPnL,
			TradeTime:    trade.TradeTime,
		})
	}

	return trades, lastID, nil
}

func (p *TradePoller) requestSpotTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, fromID int64, useFromID bool, startTime int64) ([]normalizedTrade, int64, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("timestamp", fmt.Sprintf("%d", time.Now().UnixMilli()))
	params.Set("recvWindow", "5000")
	params.Set("limit", "1000")
	if useFromID {
		params.Set("fromId", fmt.Sprintf("%d", fromID))
	} else if startTime > 0 {
		params.Set("startTime", fmt.Sprintf("%d", startTime))
	}

	signature := signParams(apiSecret, params)
	params.Set("signature", signature)

	requestURL := fmt.Sprintf("%s/api/v3/myTrades?%s", binanceAPIBaseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-MBX-APIKEY", apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("binance spot myTrades failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw []binanceSpotTrade
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, 0, err
	}

	trades := make([]normalizedTrade, 0, len(raw))
	var lastID int64
	for _, trade := range raw {
		if trade.ID > lastID {
			lastID = trade.ID
		}
		side := "SELL"
		if trade.IsBuyer {
			side = "BUY"
		}
		trades = append(trades, normalizedTrade{
			ID:        trade.ID,
			Symbol:    trade.Symbol,
			Side:      side,
			Quantity:  trade.Quantity,
			Price:     trade.Price,
			TradeTime: trade.TradeTime,
		})
	}

	return trades, lastID, nil
}

func (p *TradePoller) requestUpbitTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, startTime int64, useFromID bool) ([]normalizedTrade, int64, error) {
	market := toUpbitMarket(symbol)
	allKRW := strings.EqualFold(strings.TrimSpace(symbol), "ALL_KRW")
	allMarkets := strings.EqualFold(strings.TrimSpace(symbol), "ALL_MARKETS")
	mode := symbol
	if strings.TrimSpace(mode) == "" {
		mode = market
	}
	if !allKRW && !allMarkets && (market == "" || !strings.HasPrefix(market, "KRW-")) {
		return nil, 0, nil
	}

	trades := make([]normalizedTrade, 0, 400)
	seen := map[string]struct{}{}
	var lastID int64
	nonKRWOnly := false
	nonKRWCount := 0
	krwCount := 0
	loggedPriceSample := false
	skippedEmptyQty := 0
	skippedEmptyPrice := 0
	skippedInvalidSide := 0
	skippedBadTime := 0
	for page := 1; page <= 50; page++ {
		params := url.Values{}
		if !allKRW && !allMarkets {
			params.Set("market", market)
		}
		params.Set("state", "done")
		params.Set("order_by", "desc")
		params.Set("limit", "200")
		params.Set("page", strconv.Itoa(page))
		// NOTE: we do not send start_time to Upbit because query-hash validation is strict
		// with encoded timestamps; instead we page and apply time filtering locally below.

		token, err := signUpbitJWT(apiKey, apiSecret, params)
		if err != nil {
			return nil, 0, err
		}

		requestURL := fmt.Sprintf("%s/v1/orders/closed?%s", upbitAPIBaseURL, params.Encode())
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
		if err != nil {
			return nil, 0, err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := p.client.Do(req)
		if err != nil {
			return nil, 0, err
		}
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return nil, 0, fmt.Errorf("upbit closed orders failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
		}

		var raw []upbitClosedOrder
		if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
			resp.Body.Close()
			return nil, 0, err
		}
		resp.Body.Close()

		if len(raw) == 0 {
			break
		}

		stop := false
		for _, order := range raw {
			if !strings.EqualFold(order.State, "done") {
				continue
			}
			createdAt, err := time.Parse(time.RFC3339, strings.TrimSpace(order.CreatedAt))
			if err != nil {
				skippedBadTime++
				continue
			}
			if startTime > 0 && createdAt.UnixMilli() < startTime {
				stop = true
				continue
			}
			isKRW := strings.HasPrefix(strings.ToUpper(order.Market), "KRW-")
			if isKRW {
				krwCount++
			} else {
				nonKRWCount++
			}
			if allKRW && !isKRW {
				continue
			}

			qty := strings.TrimSpace(order.ExecutedVolume)
			if qty == "" || qty == "0" {
				skippedEmptyQty++
				continue
			}
			price := strings.TrimSpace(order.Price)
			if price == "" || price == "0" {
				price = strings.TrimSpace(order.AvgPrice)
			}
			if (price == "" || price == "0") && order.ExecutedFunds != nil {
				price = deriveAvgPrice(*order.ExecutedFunds, qty)
			}
			if (price == "" || price == "0") && order.ExecutedFund != nil {
				price = deriveAvgPrice(*order.ExecutedFund, qty)
			}
			if price == "" || price == "0" {
				price = deriveAvgPrice(order.Funds, qty)
			}
			if price == "" || price == "0" {
				price = deriveAvgPriceFromUpbitTrades(order.Trades)
			}
			if price == "" || price == "0" {
				skippedEmptyPrice++
				if !loggedPriceSample {
					firstFillPrice := ""
					firstFillVolume := ""
					if len(order.Trades) > 0 {
						firstFillPrice = order.Trades[0].Price
						firstFillVolume = order.Trades[0].Volume
					}
					log.Printf(
						"trade poller: upbit sample missing price uuid=%s market=%s ord_type=%s side=%s price=%q avg_price=%q funds=%q executed_fund=%v executed_funds=%v trades=%d first_fill_price=%q first_fill_volume=%q",
						order.UUID, order.Market, order.OrdType, order.Side, order.Price, order.AvgPrice, order.Funds, order.ExecutedFund, order.ExecutedFunds, len(order.Trades), firstFillPrice, firstFillVolume,
					)
					loggedPriceSample = true
				}
				continue
			}

			sideRaw := strings.ToUpper(strings.TrimSpace(order.Side))
			side := sideRaw
			switch sideRaw {
			case "BID":
				side = "BUY"
			case "ASK":
				side = "SELL"
			}
			if side != "BUY" && side != "SELL" {
				skippedInvalidSide++
				continue
			}

			key := order.UUID + "|" + side
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}

			tradeID := hashStringToInt64(order.UUID + "|" + order.Market + "|" + side + "|" + createdAt.Format(time.RFC3339Nano))
			if createdAt.UnixMilli() > lastID {
				lastID = createdAt.UnixMilli()
			}

			trades = append(trades, normalizedTrade{
				ID:        tradeID,
				Symbol:    toInternalSymbol(order.Market),
				Side:      side,
				Quantity:  qty,
				Price:     price,
				TradeTime: createdAt.UnixMilli(),
			})
		}

		if stop || len(raw) < 200 {
			break
		}
	}

	if allKRW && len(trades) == 0 && nonKRWCount > 0 && krwCount == 0 {
		nonKRWOnly = true
	}

	if nonKRWOnly {
		// Fallback: when account has only non-KRW fills, sync them instead of returning 0 forever.
		log.Printf("trade poller: upbit %s has no KRW fills (non_krw=%d), falling back to ALL_MARKETS", mode, nonKRWCount)
		return p.requestUpbitTrades(ctx, apiKey, apiSecret, "ALL_MARKETS", startTime, useFromID)
	}
	if len(trades) == 0 {
		log.Printf(
			"trade poller: upbit %s returned 0 trades (krw_seen=%d non_krw_seen=%d start_time=%d skipped_qty=%d skipped_price=%d skipped_side=%d skipped_time=%d)",
			mode, krwCount, nonKRWCount, startTime, skippedEmptyQty, skippedEmptyPrice, skippedInvalidSide, skippedBadTime,
		)
	}

	return trades, lastID, nil
}

func (p *TradePoller) persistTrades(ctx context.Context, userID uuid.UUID, exchange string, symbol *entities.UserSymbol, trades []normalizedTrade) error {
	for _, trade := range trades {
		tradeTime := time.UnixMilli(trade.TradeTime).UTC()
		candleTime := floorToTimeframe(tradeTime, symbol.TimeframeDefault)

		memo := fmt.Sprintf("자동 기록: %s %s @ %s", trade.Symbol, trade.Side, trade.Price)
		memoPtr := &memo

		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     userID,
			Symbol:     trade.Symbol,
			Timeframe:  symbol.TimeframeDefault,
			CandleTime: candleTime,
			Price:      trade.Price,
			BubbleType: "auto",
			Memo:       memoPtr,
			Tags:       []string{},
			CreatedAt:  time.Now().UTC(),
		}

		tradeRecord := &entities.Trade{
			ID:             uuid.New(),
			UserID:         userID,
			BubbleID:       &bubble.ID,
			Exchange:       exchange,
			BinanceTradeID: trade.ID,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
			PositionSide:   trade.PositionSide,
			OpenClose:      trade.OpenClose,
			ReduceOnly:     trade.ReduceOnly,
			Quantity:       trade.Quantity,
			Price:          trade.Price,
			TradeTime:      tradeTime,
		}
		if trade.RealizedPnL != "" {
			realized := trade.RealizedPnL
			tradeRecord.RealizedPnL = &realized
		}

		if err := p.insertBubbleTradeTx(ctx, bubble, tradeRecord); err != nil {
			if errors.Is(err, errDuplicateTrade) {
				continue
			}
			return err
		}
	}

	return nil
}

func (p *TradePoller) insertBubbleTradeTx(ctx context.Context, bubble *entities.Bubble, trade *entities.Trade) error {
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	tradeInsert := `
		INSERT INTO trades (id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time)
		VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, exchange, symbol, binance_trade_id) DO NOTHING
	`
	result, err := tx.Exec(ctx, tradeInsert,
		trade.ID, trade.UserID, trade.BinanceTradeID, trade.Exchange, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.RealizedPnL, trade.TradeTime)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errDuplicateTrade
	}

	bubbleInsert := `
		INSERT INTO bubbles (id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = tx.Exec(ctx, bubbleInsert,
		bubble.ID, bubble.UserID, bubble.Symbol, bubble.Timeframe, bubble.CandleTime, bubble.Price, bubble.BubbleType, bubble.Memo, bubble.Tags, bubble.CreatedAt)
	if err != nil {
		return err
	}

	updateTrade := `UPDATE trades SET bubble_id = $2 WHERE id = $1`
	_, err = tx.Exec(ctx, updateTrade, trade.ID, bubble.ID)
	if err != nil {
		return err
	}

	if err = tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}

func (p *TradePoller) handleMockTrades(ctx context.Context, userID uuid.UUID, exchange string, symbol *entities.UserSymbol) error {
	data, err := os.ReadFile(p.mockTradesPath)
	if err != nil {
		return err
	}

	var trades []mockTrade
	if err := json.Unmarshal(data, &trades); err != nil {
		return err
	}

	filtered := make([]normalizedTrade, 0, len(trades))
	for _, trade := range trades {
		if trade.Symbol != symbol.Symbol {
			continue
		}
		parsedTime, err := time.Parse(time.RFC3339, trade.TradeTime)
		if err != nil {
			return err
		}
		filtered = append(filtered, normalizedTrade{
			ID:        trade.ID,
			Symbol:    trade.Symbol,
			Side:      strings.ToUpper(trade.Side),
			Quantity:  trade.Quantity,
			Price:     trade.Price,
			TradeTime: parsedTime.UnixMilli(),
		})
	}

	if len(filtered) == 0 {
		return nil
	}

	return p.persistTrades(ctx, userID, exchange, symbol, filtered)
}

func signParams(secret string, params url.Values) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = h.Write([]byte(params.Encode()))
	return hex.EncodeToString(h.Sum(nil))
}

func floorToTimeframe(t time.Time, timeframe string) time.Time {
	utc := t.UTC()
	switch timeframe {
	case "1m":
		return utc.Truncate(time.Minute)
	case "15m":
		minute := (utc.Minute() / 15) * 15
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), minute, 0, 0, time.UTC)
	case "1h":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
	case "4h":
		hour := (utc.Hour() / 4) * 4
		return time.Date(utc.Year(), utc.Month(), utc.Day(), hour, 0, 0, 0, time.UTC)
	case "1d":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	default:
		return utc.Truncate(time.Hour)
	}
}

var errDuplicateTrade = errors.New("duplicate trade")

var ErrUnsupportedExchange = errors.New("unsupported exchange for sync")

func normalizeUpbitSymbols(symbols []*entities.UserSymbol) []*entities.UserSymbol {
	out := make([]*entities.UserSymbol, 0, len(symbols))
	seen := map[string]struct{}{}
	userID := uuid.Nil
	if len(symbols) > 0 {
		userID = symbols[0].UserID
	}
	for _, symbol := range symbols {
		market := toUpbitMarket(symbol.Symbol)
		if market == "" || !strings.HasPrefix(market, "KRW-") {
			continue
		}
		if _, ok := seen[market]; ok {
			continue
		}
		seen[market] = struct{}{}
		copied := *symbol
		copied.Symbol = market
		out = append(out, &copied)
	}
	if len(out) == 0 {
		out = append(out, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           "KRW-BTC",
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		})
	}
	return out
}

func toUpbitMarket(symbol string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(symbol))
	if trimmed == "" {
		return ""
	}
	if trimmed == "ALL_MARKETS" {
		return "ALL_MARKETS"
	}
	if strings.Contains(trimmed, "-") {
		return trimmed
	}
	if strings.Contains(trimmed, "/") {
		parts := strings.Split(trimmed, "/")
		if len(parts) == 2 {
			return parts[1] + "-" + parts[0]
		}
	}
	if strings.HasSuffix(trimmed, "KRW") && len(trimmed) > 3 {
		base := strings.TrimSuffix(trimmed, "KRW")
		return "KRW-" + base
	}
	return ""
}

func toInternalSymbol(market string) string {
	parts := strings.Split(strings.ToUpper(strings.TrimSpace(market)), "-")
	if len(parts) != 2 {
		return market
	}
	return parts[1] + parts[0]
}

func signUpbitJWT(apiKey string, apiSecret string, params url.Values) (string, error) {
	query := params.Encode()
	hash := sha512.Sum512([]byte(query))
	queryHash := hex.EncodeToString(hash[:])

	claims := jwt.MapClaims{
		"access_key":     apiKey,
		"nonce":          uuid.NewString(),
		"query_hash":     queryHash,
		"query_hash_alg": "SHA512",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	return token.SignedString([]byte(apiSecret))
}

func hashStringToInt64(value string) int64 {
	h := sha256.Sum256([]byte(value))
	var out int64
	for i := 0; i < 8; i++ {
		out = (out << 8) | int64(h[i])
	}
	if out < 0 {
		return -out
	}
	return out
}

func deriveAvgPrice(executedFund string, executedVolume string) string {
	fund := strings.TrimSpace(executedFund)
	volume := strings.TrimSpace(executedVolume)
	if fund == "" || volume == "" || volume == "0" {
		return ""
	}
	f, err1 := strconv.ParseFloat(fund, 64)
	v, err2 := strconv.ParseFloat(volume, 64)
	if err1 != nil || err2 != nil || v == 0 {
		return ""
	}
	return strconv.FormatFloat(f/v, 'f', 8, 64)
}

func deriveAvgPriceFromUpbitTrades(trades []upbitOrderTrade) string {
	if len(trades) == 0 {
		return ""
	}
	totalFunds := 0.0
	totalVolume := 0.0
	for _, fill := range trades {
		price := strings.TrimSpace(fill.Price)
		volume := strings.TrimSpace(fill.Volume)
		if price == "" || volume == "" {
			continue
		}
		p, err1 := strconv.ParseFloat(price, 64)
		v, err2 := strconv.ParseFloat(volume, 64)
		if err1 != nil || err2 != nil || v <= 0 || p <= 0 {
			continue
		}
		totalFunds += p * v
		totalVolume += v
	}
	if totalVolume == 0 {
		return ""
	}
	return strconv.FormatFloat(totalFunds/totalVolume, 'f', 8, 64)
}

func normalizePositionSide(raw string) *string {
	value := strings.ToUpper(strings.TrimSpace(raw))
	if value == "" || value == "BOTH" {
		return nil
	}
	if value != "LONG" && value != "SHORT" {
		return nil
	}
	return &value
}

func deriveOpenClose(trade binanceFuturesTrade) *string {
	side := strings.ToUpper(strings.TrimSpace(trade.Side))
	positionSide := strings.ToUpper(strings.TrimSpace(trade.PositionSide))
	if positionSide == "LONG" {
		if side == "BUY" {
			value := "OPEN"
			return &value
		}
		if side == "SELL" {
			value := "CLOSE"
			return &value
		}
	}
	if positionSide == "SHORT" {
		if side == "SELL" {
			value := "OPEN"
			return &value
		}
		if side == "BUY" {
			value := "CLOSE"
			return &value
		}
	}
	return nil
}

func deriveReduceOnly(trade binanceFuturesTrade) *bool {
	if strings.TrimSpace(trade.RealizedPnL) == "" || strings.TrimSpace(trade.RealizedPnL) == "0" || strings.TrimSpace(trade.RealizedPnL) == "0.0" {
		return nil
	}
	openClose := deriveOpenClose(trade)
	if openClose != nil && *openClose == "CLOSE" {
		value := true
		return &value
	}
	return nil
}

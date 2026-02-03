package jobs

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
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
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

const (
	binanceFapiBaseURL  = "https://fapi.binance.com"
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
	runningPollers map[uuid.UUID]context.CancelFunc
	mu             sync.Mutex
	useMockTrades  bool
	mockTradesPath string
}

type binanceTrade struct {
	ID          int64  `json:"id"`
	Symbol      string `json:"symbol"`
	Side        string `json:"side"`
	Quantity    string `json:"qty"`
	Price       string `json:"price"`
	RealizedPnL string `json:"realizedPnl"`
	TradeTime   int64  `json:"time"`
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
		runningPollers: make(map[uuid.UUID]context.CancelFunc),
		useMockTrades:  useMock,
		mockTradesPath: mockPath,
	}
}

func (p *TradePoller) Start(ctx context.Context) {
	creds, err := p.exchangeRepo.ListValid(ctx, "binance_futures")
	if err != nil {
		log.Printf("trade poller: failed to list exchange credentials: %v", err)
		return
	}

	for _, cred := range creds {
		p.startUserPoller(ctx, cred)
	}
}

func (p *TradePoller) startUserPoller(ctx context.Context, cred *entities.ExchangeCredential) {
	p.mu.Lock()
	if _, exists := p.runningPollers[cred.UserID]; exists {
		p.mu.Unlock()
		return
	}
	userCtx, cancel := context.WithCancel(ctx)
	p.runningPollers[cred.UserID] = cancel
	p.mu.Unlock()

	log.Printf("trade poller: starting for user %s", cred.UserID.String())

	go func() {
		ticker := time.NewTicker(p.pollInterval)
		defer ticker.Stop()
		for {
			if err := p.pollOnce(userCtx, cred); err != nil {
				log.Printf("trade poller: user %s error: %v", cred.UserID.String(), err)
			}
			select {
			case <-userCtx.Done():
				log.Printf("trade poller: stopped for user %s", cred.UserID.String())
				return
			case <-ticker.C:
			}
		}
	}()
}

func (p *TradePoller) pollOnce(ctx context.Context, cred *entities.ExchangeCredential) error {
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
		defaultEntry := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           cred.UserID,
			Symbol:           "BTCUSDT",
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

	for _, symbol := range symbols {
		if p.useMockTrades {
			err = p.handleMockTrades(ctx, cred.UserID, symbol)
		} else {
			err = p.fetchAndStoreTrades(ctx, cred.UserID, symbol, apiKey, apiSecret)
		}
		if err != nil {
			log.Printf("trade poller: user %s symbol %s error: %v", cred.UserID.String(), symbol.Symbol, err)
		}
	}

	return nil
}

func (p *TradePoller) fetchAndStoreTrades(ctx context.Context, userID uuid.UUID, symbol *entities.UserSymbol, apiKey string, apiSecret string) error {
	state, err := p.syncStateRepo.GetByUserAndSymbol(ctx, userID, symbol.Symbol)
	if err != nil {
		return err
	}

	fromID := int64(0)
	useFromID := false
	startTime := int64(0)
	if state != nil && state.LastTradeID > 0 {
		fromID = state.LastTradeID + 1
		useFromID = true
	} else {
		startTime = time.Now().Add(-7 * 24 * time.Hour).UnixMilli()
	}

	var latestID int64
	for {
		trades, lastID, err := p.requestTrades(ctx, apiKey, apiSecret, symbol.Symbol, fromID, useFromID, startTime)
		if err != nil {
			return err
		}
		if len(trades) == 0 {
			break
		}

		if lastID > latestID {
			latestID = lastID
		}

		if err := p.persistTrades(ctx, userID, symbol, trades); err != nil {
			return err
		}

		if len(trades) < 1000 {
			break
		}

		fromID = lastID + 1
		useFromID = true
		startTime = 0
	}

	if latestID > 0 {
		stateToSave := &entities.TradeSyncState{
			ID:          uuid.New(),
			UserID:      userID,
			Symbol:      symbol.Symbol,
			LastTradeID: latestID,
			LastSyncAt:  time.Now().UTC(),
		}
		if err := p.syncStateRepo.Upsert(ctx, stateToSave); err != nil {
			return err
		}
	}

	return nil
}

func (p *TradePoller) requestTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, fromID int64, useFromID bool, startTime int64) ([]binanceTrade, int64, error) {
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
		return nil, 0, fmt.Errorf("binance userTrades failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var trades []binanceTrade
	if err := json.NewDecoder(resp.Body).Decode(&trades); err != nil {
		return nil, 0, err
	}

	var lastID int64
	for _, trade := range trades {
		if trade.ID > lastID {
			lastID = trade.ID
		}
	}

	return trades, lastID, nil
}

func (p *TradePoller) persistTrades(ctx context.Context, userID uuid.UUID, symbol *entities.UserSymbol, trades []binanceTrade) error {
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
			BinanceTradeID: trade.ID,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
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
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	tradeInsert := `
		INSERT INTO trades (id, user_id, bubble_id, binance_trade_id, symbol, side, quantity, price, realized_pnl, trade_time)
		VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id, symbol, binance_trade_id) DO NOTHING
	`
	result, err := tx.Exec(ctx, tradeInsert,
		trade.ID, trade.UserID, trade.BinanceTradeID, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.RealizedPnL, trade.TradeTime)
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
	return nil
}

func (p *TradePoller) handleMockTrades(ctx context.Context, userID uuid.UUID, symbol *entities.UserSymbol) error {
	data, err := os.ReadFile(p.mockTradesPath)
	if err != nil {
		return err
	}

	var trades []mockTrade
	if err := json.Unmarshal(data, &trades); err != nil {
		return err
	}

	filtered := make([]binanceTrade, 0, len(trades))
	for _, trade := range trades {
		if trade.Symbol != symbol.Symbol {
			continue
		}
		parsedTime, err := time.Parse(time.RFC3339, trade.TradeTime)
		if err != nil {
			return err
		}
		filtered = append(filtered, binanceTrade{
			ID:        trade.ID,
			Symbol:    trade.Symbol,
			Side:      trade.Side,
			Quantity:  trade.Quantity,
			Price:     trade.Price,
			TradeTime: parsedTime.UnixMilli(),
		})
	}

	if len(filtered) == 0 {
		return nil
	}

	return p.persistTrades(ctx, userID, symbol, filtered)
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

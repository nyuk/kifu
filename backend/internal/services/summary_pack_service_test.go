package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type summaryPackTestTradeRepo struct {
	trades []*entities.Trade
}

func (r *summaryPackTestTradeRepo) ListByTimeRange(_ context.Context, _ uuid.UUID, _ time.Time, _ time.Time) ([]*entities.Trade, error) {
	return r.trades, nil
}

func mustJSON(raw map[string]any) []byte {
	encoded, err := json.Marshal(raw)
	if err != nil {
		panic(err)
	}
	return encoded
}

func tradePtr(value string) *string {
	v := value
	return &v
}

func newTrade(id int64, exchange, symbol, side, quantity, price string, tradeTime time.Time) *entities.Trade {
	return &entities.Trade{
		Exchange:       exchange,
		BinanceTradeID: id,
		Symbol:         symbol,
		Side:           side,
		Quantity:       quantity,
		Price:          price,
		RealizedPnL:    tradePtr("0"),
		TradeTime:      tradeTime,
	}
}

func baseService(now time.Time) *SummaryPackService {
	return &SummaryPackService{
		tradeRepo: &summaryPackTestTradeRepo{},
		now:       func() time.Time { return now },
	}
}

func TestSummaryPackDuplicateRule(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 2, 13, 9, 0, 0, 0, time.UTC)
	trades := []*entities.Trade{
		newTrade(1001, "binance_futures", "BTCUSDT", "BUY", "1", "10000", now),
		newTrade(1001, "binance_futures", "BTCUSDT", "BUY", "1", "10000", now.Add(time.Minute)),
		newTrade(1002, "binance_futures", "BTCUSDT", "SELL", "1", "10000", now.Add(2*time.Minute)),
	}

	svc := baseService(now)
	svc.tradeRepo = &summaryPackTestTradeRepo{trades: trades}

	run := &entities.Run{
		RunID:   uuid.New(),
		RunType: "exchange_sync",
		Meta:    mustJSON(map[string]any{"exchange": "binance_futures"}),
	}

	pack, _, err := svc.GeneratePack(context.Background(), uuid.New(), run, "30d")
	if err != nil {
		t.Fatalf("GeneratePack failed: %v", err)
	}
	if pack.DuplicateSuspectsCount != 1 {
		t.Fatalf("duplicate count = %d, want 1", pack.DuplicateSuspectsCount)
	}
	if pack.ReconciliationStatus != "warning" {
		t.Fatalf("status = %s, want warning", pack.ReconciliationStatus)
	}
}

func TestSummaryPackMissingRuleNoFundingModule(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 2, 13, 9, 0, 0, 0, time.UTC)
	trades := make([]*entities.Trade, 0, 11)
	for i := 0; i < 11; i++ {
		trades = append(trades, newTrade(
			int64(2000+i),
			"binance_spot",
			"ETHUSDT",
			"BUY",
			"0.1",
			"1000",
			now.Add(time.Duration(i)*time.Minute),
		))
	}

	svc := baseService(now)
	svc.tradeRepo = &summaryPackTestTradeRepo{trades: trades}

	run := &entities.Run{
		RunID:   uuid.New(),
		RunType: "exchange_sync",
		Meta:    mustJSON(map[string]any{"exchange": "binance_spot"}),
	}

	pack, _, err := svc.GeneratePack(context.Background(), uuid.New(), run, "30d")
	if err != nil {
		t.Fatalf("GeneratePack failed: %v", err)
	}
	if pack.MissingSuspectsCount != 1 {
		t.Fatalf("missing count = %d, want 1", pack.MissingSuspectsCount)
	}
	if pack.ReconciliationStatus != "warning" {
		t.Fatalf("status = %s, want warning", pack.ReconciliationStatus)
	}
}

func TestSummaryPackMissingFundingModuleWithFuturesExchange(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 2, 13, 9, 0, 0, 0, time.UTC)
	trades := make([]*entities.Trade, 0, 11)
	for i := 0; i < 11; i++ {
		trades = append(trades, newTrade(
			int64(3000+i),
			"binance_futures",
			"XRPUSDT",
			"SELL",
			"0.2",
			"0.5",
			now.Add(time.Duration(i)*time.Minute),
		))
	}

	svc := baseService(now)
	svc.tradeRepo = &summaryPackTestTradeRepo{trades: trades}

	run := &entities.Run{
		RunID:   uuid.New(),
		RunType: "exchange_sync",
		Meta: mustJSON(map[string]any{
			"exchange": "binance_futures",
			"modules":  []string{"funding"},
		}),
	}

	pack, _, err := svc.GeneratePack(context.Background(), uuid.New(), run, "30d")
	if err != nil {
		t.Fatalf("GeneratePack failed: %v", err)
	}
	if pack.MissingSuspectsCount != 2 {
		t.Fatalf("missing count = %d, want 2", pack.MissingSuspectsCount)
	}
}

func TestSummaryPackTimeSkewWarning(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 2, 13, 9, 0, 0, 0, time.UTC)
	trades := []*entities.Trade{
		newTrade(4001, "upbit", "KRW-BTC", "BUY", "1", "50000000", now.Add(-2*time.Hour)),
		newTrade(4002, "upbit", "KRW-BTC", "SELL", "1", "50000000", now),
		newTrade(4003, "upbit", "KRW-BTC", "BUY", "1", "50000000", now.Add(10*time.Hour)),
	}

	svc := baseService(now)
	svc.tradeRepo = &summaryPackTestTradeRepo{trades: trades}

	run := &entities.Run{
		RunID:   uuid.New(),
		RunType: "exchange_sync",
		Meta:    mustJSON(map[string]any{"exchange": "upbit"}),
	}

	pack, _, err := svc.GeneratePack(context.Background(), uuid.New(), run, "30d")
	if err != nil {
		t.Fatalf("GeneratePack failed: %v", err)
	}

	found := false
	for _, item := range pack.NormalizationWarnings {
		if item == "time_skew" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected time_skew warning in %v", pack.NormalizationWarnings)
	}
}

func TestSummaryPackSymbolMappingGapWarning(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 2, 13, 9, 0, 0, 0, time.UTC)
	trades := []*entities.Trade{
		newTrade(5001, "upbit", "KRW-BTC", "BUY", "1", "50000000", now),
		newTrade(5002, "upbit", "BTC_USDT", "SELL", "1", "50000", now.Add(time.Minute)),
		newTrade(5003, "upbit", "BTC USD", "BUY", "1", "50000", now.Add(2*time.Minute)),
	}

	svc := baseService(now)
	svc.tradeRepo = &summaryPackTestTradeRepo{trades: trades}

	run := &entities.Run{
		RunID:   uuid.New(),
		RunType: "trade_csv_import",
		Meta:    mustJSON(map[string]any{"exchange": "upbit"}),
	}

	pack, _, err := svc.GeneratePack(context.Background(), uuid.New(), run, "30d")
	if err != nil {
		t.Fatalf("GeneratePack failed: %v", err)
	}
	var payload struct {
		DataSources struct {
			CSVImported bool `json:"csv_imported"`
		} `json:"data_sources"`
	}
	if err := json.Unmarshal(pack.Payload, &payload); err != nil {
		t.Fatalf("failed to parse payload: %v", err)
	}
	if !payload.DataSources.CSVImported {
		t.Fatalf("expected csv_imported flag for trade_csv_import source run")
	}
	if pack.ReconciliationStatus != "warning" {
		t.Fatalf("status = %s, want warning", pack.ReconciliationStatus)
	}

	summaryWarnings := pack.NormalizationWarnings
	found := false
	for _, item := range summaryWarnings {
		if item == "symbol_mapping_gap" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected symbol_mapping_gap warning in %v", summaryWarnings)
	}
}

package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

const (
	summaryPackSchemaV1 = "summary_pack_v1"
	summaryPackCalcV1   = "ledger_calc_v1.0.0"
)

var (
	range30d                 = 30 * 24 * time.Hour
	range7d                  = 7 * 24 * time.Hour
	fixRange6h               = 6 * time.Hour
	minMissingTradeThreshold = 10

	symbolRegex = regexp.MustCompile(`^[A-Z0-9]+(?:-[A-Z0-9]+)?$`)
)

type tradeRangeQuerier interface {
	ListByTimeRange(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]*entities.Trade, error)
}

type SummaryPackService struct {
	tradeRepo tradeRangeQuerier
	now       func() time.Time
}

func NewSummaryPackService(tradeRepo tradeRangeQuerier) *SummaryPackService {
	return &SummaryPackService{
		tradeRepo: tradeRepo,
		now:       time.Now,
	}
}

type summaryPackRange struct {
	start time.Time
	end   time.Time
}

func resolveRange(rangeValue string, now time.Time) (summaryPackRange, error) {
	now = now.UTC()
	switch strings.TrimSpace(rangeValue) {
	case "", "30d":
		return summaryPackRange{
			start: now.Add(-range30d),
			end:   now,
		}, nil
	case "7d":
		return summaryPackRange{
			start: now.Add(-range7d),
			end:   now,
		}, nil
	case "all":
		return summaryPackRange{
			start: now.AddDate(-10, 0, 0),
			end:   now,
		}, nil
	default:
		return summaryPackRange{}, fmt.Errorf("unsupported range: %s", rangeValue)
	}
}

func normalizeDecimal(value *big.Rat) *string {
	if value == nil {
		return nil
	}

	if value.Sign() == 0 {
		return ptr("0")
	}

	s := value.FloatString(8)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	if s == "" || s == "-0" {
		s = "0"
	}
	return &s
}

func ptr(value string) *string {
	v := value
	return &v
}

func parseDecimal(raw string) *big.Rat {
	r := new(big.Rat)
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	if _, ok := r.SetString(trimmed); ok {
		return r
	}
	return nil
}

func toTradeSymbolNormalized(raw string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(raw))
	if trimmed == "" {
		return "unknown"
	}
	if strings.Contains(trimmed, " ") || strings.Contains(trimmed, "/") || strings.Contains(trimmed, "_") {
		return "invalid"
	}
	if symbolRegex.MatchString(trimmed) {
		return trimmed
	}
	return "invalid"
}

func hasWarning(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

func addUniqueWarning(list *[]string, message string) {
	if !hasWarning(*list, message) {
		*list = append(*list, message)
	}
}

type summaryPackTimeRangeV1 struct {
	Timezone string `json:"timezone"`
	StartTs  string `json:"start_ts"`
	EndTs    string `json:"end_ts"`
}

type summaryPackDataSourcesV1 struct {
	Exchanges   []string `json:"exchanges"`
	CSVImported bool     `json:"csv_imported"`
	Modules     []string `json:"modules"`
}

type summaryPackPnLV1 struct {
	RealizedPnLTotal      *string `json:"realized_pnl_total"`
	UnrealizedPnLSnapshot *string `json:"unrealized_pnl_snapshot"`
	FeesTotal             *string `json:"fees_total"`
	FundingTotal          *string `json:"funding_total"`
}

type summaryPackFlowV1 struct {
	NetExchangeFlow *string `json:"net_exchange_flow"`
	NetWalletFlow   *string `json:"net_wallet_flow"`
}

type summaryPackActivityV1 struct {
	TradeCount          int     `json:"trade_count"`
	NotionalVolumeTotal *string `json:"notional_volume_total"`
	LongShortRatio      *string `json:"long_short_ratio"`
	LeverageSummary     *string `json:"leverage_summary"`
	MaxDrawdownEst      *string `json:"max_drawdown_est"`
}

type summaryPackReconciliationV1 struct {
	ReconciliationStatus   string   `json:"reconciliation_status"`
	MissingSuspectsCount   int      `json:"missing_suspects_count"`
	DuplicateSuspectsCount int      `json:"duplicate_suspects_count"`
	NormalizationWarnings  []string `json:"normalization_warnings"`
}

type summaryPackEvidenceV1 struct {
	ExchangeTradeIDsSample []string `json:"exchange_trade_ids_sample"`
	EvidencePackRef        string   `json:"evidence_pack_ref"`
}

type summaryPackPayloadV1 struct {
	PackID          string                      `json:"pack_id"`
	SchemaVersion   string                      `json:"schema_version"`
	CalcVersion     string                      `json:"calc_version"`
	ContentHash     string                      `json:"content_hash"`
	TimeRange       summaryPackTimeRangeV1      `json:"time_range"`
	DataSources     summaryPackDataSourcesV1    `json:"data_sources"`
	PnLSummary      summaryPackPnLV1            `json:"pnl_summary"`
	FlowSummary     summaryPackFlowV1           `json:"flow_summary"`
	ActivitySummary summaryPackActivityV1       `json:"activity_summary"`
	Reconciliation  summaryPackReconciliationV1 `json:"reconciliation"`
	EvidenceIndex   summaryPackEvidenceV1       `json:"evidence_index"`
}

type runInfoForSummary struct {
	runType string
	meta    map[string]any
}

func buildRunInfo(run *entities.Run) runInfoForSummary {
	meta := map[string]any{}
	if run != nil && len(run.Meta) > 0 {
		_ = json.Unmarshal(run.Meta, &meta)
	}
	if run == nil {
		return runInfoForSummary{}
	}
	return runInfoForSummary{
		runType: run.RunType,
		meta:    meta,
	}
}

func (s *SummaryPackService) GeneratePack(ctx context.Context, userID uuid.UUID, sourceRun *entities.Run, rangeValue string) (*entities.SummaryPack, string, error) {
	if sourceRun == nil {
		return nil, "", errors.New("source run is required")
	}

	resolvedRange, err := resolveRange(rangeValue, s.now())
	if err != nil {
		return nil, "", err
	}

	trades, err := s.tradeRepo.ListByTimeRange(ctx, userID, resolvedRange.start, resolvedRange.end)
	if err != nil {
		return nil, "", err
	}

	var (
		exchanges            = map[string]struct{}{}
		seenTradeKeys        = map[string]struct{}{}
		timeStamps           = make([]int64, 0, len(trades))
		realizedPnL          = new(big.Rat)
		feesTotal            = new(big.Rat)
		flowExchange         = new(big.Rat)
		notional             = new(big.Rat)
		duplicateCount       int
		buyCount             int
		sellCount            int
		warnings             []string
		samples              []string
		runCtx               = buildRunInfo(sourceRun)
		fundingModuleEnabled bool
		modules              = map[string]struct{}{"trades": {}}
	)

	if rawModules, ok := runCtx.meta["modules"]; ok {
		if arr, ok := rawModules.([]any); ok {
			for _, item := range arr {
				if module, ok := item.(string); ok {
					module = strings.ToLower(strings.TrimSpace(module))
					if module != "" {
						modules[module] = struct{}{}
						if module == "funding" {
							fundingModuleEnabled = true
						}
					}
				}
			}
		}
	}
	if runCtx.runType == "exchange_sync" {
		modules["trades"] = struct{}{}
		if rawExchange, ok := runCtx.meta["exchange"]; ok {
			if exchange, ok := rawExchange.(string); ok && strings.TrimSpace(exchange) != "" {
				exchanges[strings.ToLower(strings.TrimSpace(exchange))] = struct{}{}
			}
		}
	}

	if fundingModuleEnabled {
		modules["funding"] = struct{}{}
	}

	for _, trade := range trades {
		if trade == nil {
			continue
		}
		exchange := strings.ToLower(strings.TrimSpace(trade.Exchange))
		if exchange != "" {
			exchanges[exchange] = struct{}{}
		}

		normalized := toTradeSymbolNormalized(trade.Symbol)
		if normalized == "unknown" || normalized == "invalid" {
			addUniqueWarning(&warnings, "symbol_mapping_gap")
		}

		key := fmt.Sprintf("fallback:%s|%s|%s|%s|%s", trade.Exchange, trade.Symbol, trade.Side, trade.Price, trade.Quantity)
		if trade.BinanceTradeID != 0 {
			key = fmt.Sprintf("id:%d", trade.BinanceTradeID)
		}
		if _, exists := seenTradeKeys[key]; exists {
			duplicateCount += 1
		} else {
			seenTradeKeys[key] = struct{}{}
		}

		timeStamps = append(timeStamps, trade.TradeTime.Unix())

		if len(samples) < 10 && trade.BinanceTradeID != 0 {
			samples = append(samples, fmt.Sprintf("%d", trade.BinanceTradeID))
		}

		if trade.Side == "BUY" {
			buyCount += 1
		} else if trade.Side == "SELL" {
			sellCount += 1
		}

		if trade.RealizedPnL != nil {
			if pnl := parseDecimal(*trade.RealizedPnL); pnl != nil {
				realizedPnL.Add(realizedPnL, pnl)
			}
		}

		qtyRat := parseDecimal(trade.Quantity)
		priceRat := parseDecimal(trade.Price)
		if qtyRat != nil && priceRat != nil {
			notionalPart := new(big.Rat).Mul(qtyRat, priceRat)
			notional.Add(notional, notionalPart)
			tmp := new(big.Rat).Set(notionalPart)
			if trade.Side == "SELL" {
				tmp.Neg(tmp)
			}
			flowExchange.Add(flowExchange, tmp)
		}
	}

	if len(timeStamps) >= 2 {
		sorted := append([]int64{}, timeStamps...)
		sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
		median := sorted[len(sorted)/2]
		for _, unixTs := range timeStamps {
			diff := time.Duration(absInt64(unixTs-median)) * time.Second
			if diff > fixRange6h {
				addUniqueWarning(&warnings, "time_skew")
				break
			}
		}
	}

	exchangeIDs := make([]string, 0, len(exchanges))
	for exchange := range exchanges {
		exchangeIDs = append(exchangeIDs, exchange)
	}
	sort.Strings(exchangeIDs)

	moduleNames := make([]string, 0, len(modules))
	for module := range modules {
		moduleNames = append(moduleNames, module)
	}
	sort.Strings(moduleNames)

	isFundingData := fundingModuleEnabled && hasFuturesExchange(exchanges)
	missingCount := 0
	if len(trades) >= minMissingTradeThreshold && feesTotal.Sign() == 0 {
		missingCount += 1
	}
	if isFundingData && len(trades) >= minMissingTradeThreshold && isZeroRatOrNil(nil) {
		missingCount += 1
	}

	var fundingTotal *string
	if isFundingData {
		fundingTotal = nil
	}

	var lsr *string
	if sellCount > 0 && buyCount > 0 {
		ratio := new(big.Rat).SetFrac(big.NewInt(int64(buyCount)), big.NewInt(int64(sellCount)))
		lsr = normalizeDecimal(ratio)
	}

	notionalTotal := normalizeDecimal(notional)
	recoStatus := "ok"
	if missingCount >= 10 {
		recoStatus = "error"
	}
	if missingCount > 0 || duplicateCount > 0 || len(warnings) > 0 {
		if recoStatus != "error" {
			recoStatus = "warning"
		}
	}

	payload := summaryPackPayloadV1{
		PackID:        uuid.New().String(),
		SchemaVersion: summaryPackSchemaV1,
		CalcVersion:   summaryPackCalcV1,
		ContentHash:   "",
		TimeRange: summaryPackTimeRangeV1{
			Timezone: "Asia/Seoul",
			StartTs:  resolvedRange.start.UTC().Format(time.RFC3339),
			EndTs:    resolvedRange.end.UTC().Format(time.RFC3339),
		},
		DataSources: summaryPackDataSourcesV1{
			Exchanges:   exchangeIDs,
			CSVImported: runCtx.runType == "trade_csv_import" || runCtx.runType == "portfolio_csv_import",
			Modules:     moduleNames,
		},
		PnLSummary: summaryPackPnLV1{
			RealizedPnLTotal:      normalizeDecimal(realizedPnL),
			UnrealizedPnLSnapshot: nil,
			FeesTotal:             normalizeDecimal(feesTotal),
			FundingTotal:          fundingTotal,
		},
		FlowSummary: summaryPackFlowV1{
			NetExchangeFlow: normalizeDecimal(flowExchange),
			NetWalletFlow:   nil,
		},
		ActivitySummary: summaryPackActivityV1{
			TradeCount:          len(trades),
			NotionalVolumeTotal: notionalTotal,
			LongShortRatio:      lsr,
			LeverageSummary:     nil,
			MaxDrawdownEst:      nil,
		},
		Reconciliation: summaryPackReconciliationV1{
			ReconciliationStatus:   recoStatus,
			MissingSuspectsCount:   missingCount,
			DuplicateSuspectsCount: duplicateCount,
			NormalizationWarnings:  warnings,
		},
		EvidenceIndex: summaryPackEvidenceV1{
			ExchangeTradeIDsSample: samples,
			EvidencePackRef:        "",
		},
	}

	payloadWithoutHash := payload
	hashInput, err := json.Marshal(payloadWithoutHash)
	if err != nil {
		return nil, "", err
	}
	contentHash := sha256.Sum256(hashInput)
	hashHex := hex.EncodeToString(contentHash[:])

	payload.ContentHash = hashHex

	packed, err := json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}

	pack := &entities.SummaryPack{
		PackID:                 uuid.MustParse(payload.PackID),
		UserID:                 userID,
		SourceRunID:            sourceRun.RunID,
		Range:                  strings.TrimSpace(rangeValue),
		SchemaVersion:          summaryPackSchemaV1,
		CalcVersion:            summaryPackCalcV1,
		ContentHash:            hashHex,
		ReconciliationStatus:   recoStatus,
		MissingSuspectsCount:   missingCount,
		DuplicateSuspectsCount: duplicateCount,
		NormalizationWarnings:  warnings,
		Payload:                packed,
	}

	if pack.Range == "" {
		pack.Range = "30d"
	}

	// Pack-level evidence ref after payload creation.
	payload.EvidenceIndex.EvidencePackRef = fmt.Sprintf("evidence_pack://%s", pack.PackID)
	// Recompute hash with evidence ref included.
	payloadHashInput, err := json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}
	recompute := sha256.Sum256(payloadHashInput)
	pack.ContentHash = hex.EncodeToString(recompute[:])
	pack.Payload, err = json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}

	return pack, pack.ContentHash, nil
}

func absInt64(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}

func hasFuturesExchange(exchanges map[string]struct{}) bool {
	_, ok := exchanges["binance_futures"]
	return ok
}

func isZeroRatOrNil(value *string) bool {
	if value == nil {
		return true
	}
	r := new(big.Rat)
	if _, ok := r.SetString(*value); !ok {
		return false
	}
	return r.Sign() == 0
}

// Parse summary range strings only from the v1 spec.
func ParseSummaryRange(rangeValue string) (time.Duration, error) {
	switch strings.TrimSpace(rangeValue) {
	case "", "30d":
		return range30d, nil
	case "7d":
		return range7d, nil
	case "all":
		return 0, nil
	default:
		return 0, fmt.Errorf("unsupported range: %s", rangeValue)
	}
}

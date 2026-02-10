package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertMonitor struct {
	ruleRepo     repositories.AlertRuleRepository
	alertRepo    repositories.AlertRepository
	onTrigger    func(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule)
	client       *http.Client
	priceCache   map[string]*priceSnapshot
	priceMu      sync.RWMutex
}

type priceSnapshot struct {
	Price     string
	FetchedAt time.Time
}

func NewAlertMonitor(
	ruleRepo repositories.AlertRuleRepository,
	alertRepo repositories.AlertRepository,
	onTrigger func(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule),
) *AlertMonitor {
	return &AlertMonitor{
		ruleRepo:   ruleRepo,
		alertRepo:  alertRepo,
		onTrigger:  onTrigger,
		client:     &http.Client{Timeout: 10 * time.Second},
		priceCache: make(map[string]*priceSnapshot),
	}
}

func (m *AlertMonitor) Start(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.runOnce(ctx)
			}
		}
	}()
}

func (m *AlertMonitor) runOnce(ctx context.Context) {
	rules, err := m.ruleRepo.ListAllActive(ctx)
	if err != nil {
		log.Printf("alert monitor: list rules failed: %v", err)
		return
	}
	if len(rules) == 0 {
		return
	}

	// Group by symbol to minimize API calls
	symbolRules := make(map[string][]*entities.AlertRule)
	for _, rule := range rules {
		if !m.isCooldownPassed(rule) {
			continue
		}
		symbolRules[rule.Symbol] = append(symbolRules[rule.Symbol], rule)
	}

	for symbol, rules := range symbolRules {
		currentPrice, err := m.fetchCurrentPrice(ctx, symbol)
		if err != nil {
			log.Printf("alert monitor: fetch price %s failed: %v", symbol, err)
			continue
		}

		for _, rule := range rules {
			triggered, reason, severity := m.evaluate(ctx, rule, currentPrice, symbol)

			// Always update check state for crossing-based rules (price_level, ma_cross)
			if rule.RuleType == entities.RuleTypePriceLevel || rule.RuleType == entities.RuleTypeMACross {
				state := m.buildCheckState(ctx, currentPrice, rule, symbol)
				stateJSON, _ := json.Marshal(state)
				if !triggered {
					// Save state without updating last_triggered_at
					m.ruleRepo.UpdateCheckState(ctx, rule.ID, stateJSON)
				}
			}

			if !triggered {
				continue
			}

			alert := &entities.Alert{
				ID:            uuid.New(),
				UserID:        rule.UserID,
				RuleID:        rule.ID,
				Symbol:        rule.Symbol,
				TriggerPrice:  currentPrice,
				TriggerReason: reason,
				Severity:      severity,
				Status:        entities.AlertStatusPending,
				CreatedAt:     time.Now().UTC(),
			}

			if err := m.alertRepo.Create(ctx, alert); err != nil {
				log.Printf("alert monitor: create alert failed: %v", err)
				continue
			}

			state := m.buildCheckState(ctx, currentPrice, rule, symbol)
			stateJSON, _ := json.Marshal(state)
			if err := m.ruleRepo.UpdateLastTriggered(ctx, rule.ID, stateJSON); err != nil {
				log.Printf("alert monitor: update triggered failed: %v", err)
			}

			log.Printf("alert monitor: triggered [%s] %s - %s", rule.Symbol, rule.Name, reason)

			if m.onTrigger != nil {
				go m.onTrigger(ctx, alert, rule)
			}
		}
	}

	// Expire old alerts
	cutoff := time.Now().UTC().Add(-24 * time.Hour)
	if expired, err := m.alertRepo.ExpireOlderThan(ctx, cutoff); err != nil {
		log.Printf("alert monitor: expire failed: %v", err)
	} else if expired > 0 {
		log.Printf("alert monitor: expired %d old alerts", expired)
	}
}

func (m *AlertMonitor) evaluate(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	switch rule.RuleType {
	case entities.RuleTypePriceChange:
		return m.evalPriceChange(ctx, rule, currentPrice, symbol)
	case entities.RuleTypePriceLevel:
		return m.evalPriceLevel(rule, currentPrice)
	case entities.RuleTypeMACross:
		return m.evalMACross(ctx, rule, currentPrice, symbol)
	case entities.RuleTypeVolatilitySpike:
		return m.evalVolatilitySpike(ctx, rule, currentPrice, symbol)
	default:
		return false, "", entities.AlertSeverityNormal
	}
}

func (m *AlertMonitor) evalPriceChange(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	var cfg entities.PriceChangeConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	refDuration := parseDuration(cfg.Reference)
	refPrice, err := m.fetchHistoricalPrice(ctx, symbol, refDuration)
	if err != nil || refPrice == "" {
		return false, "", entities.AlertSeverityNormal
	}

	cur, ok := parseDecimal(currentPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}
	ref, ok := parseDecimal(refPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	diff := new(big.Rat).Sub(cur, ref)
	absDiff := new(big.Rat).Abs(diff)

	threshold, ok := parseDecimal(cfg.ThresholdValue)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	if cfg.ThresholdType == "percent" {
		// Convert threshold to absolute: ref * threshold / 100
		pctThreshold := new(big.Rat).Mul(ref, threshold)
		pctThreshold.Quo(pctThreshold, big.NewRat(100, 1))
		threshold = new(big.Rat).Abs(pctThreshold)
	}

	if absDiff.Cmp(threshold) < 0 {
		return false, "", entities.AlertSeverityNormal
	}

	// Check direction
	isDown := diff.Sign() < 0
	if cfg.Direction == "drop" && !isDown {
		return false, "", entities.AlertSeverityNormal
	}
	if cfg.Direction == "rise" && isDown {
		return false, "", entities.AlertSeverityNormal
	}

	pctChange := new(big.Rat).Quo(diff, ref)
	pctChange.Mul(pctChange, big.NewRat(100, 1))

	direction := "상승"
	if isDown {
		direction = "하락"
	}

	reason := fmt.Sprintf("%s %s $%s (%s 대비 %s%%)",
		symbol, direction, formatDecimal(absDiff, 2), cfg.Reference, formatDecimal(pctChange, 2))

	severity := entities.AlertSeverityNormal
	pctAbs := new(big.Rat).Abs(pctChange)
	fivePct := big.NewRat(5, 1)
	if pctAbs.Cmp(fivePct) >= 0 {
		severity = entities.AlertSeverityUrgent
	}

	return true, reason, severity
}

func (m *AlertMonitor) evalPriceLevel(rule *entities.AlertRule, currentPrice string) (bool, string, entities.AlertSeverity) {
	var cfg entities.PriceLevelConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	cur, ok := parseDecimal(currentPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}
	target, ok := parseDecimal(cfg.Price)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	// Check previous state to detect crossing
	var prevState entities.CheckState
	if len(rule.LastCheckState) > 0 {
		_ = json.Unmarshal(rule.LastCheckState, &prevState)
	}

	isAbove := cur.Cmp(target) >= 0

	// Simple threshold check (gte/lte) - no crossing detection needed
	if cfg.Direction == "gte" {
		if !isAbove {
			return false, "", entities.AlertSeverityNormal
		}
		reason := fmt.Sprintf("%s $%s 이상 도달 (현재 $%s)", rule.Symbol, cfg.Price, currentPrice)
		return true, reason, entities.AlertSeverityNormal
	}
	if cfg.Direction == "lte" {
		if isAbove {
			return false, "", entities.AlertSeverityNormal
		}
		reason := fmt.Sprintf("%s $%s 이하 도달 (현재 $%s)", rule.Symbol, cfg.Price, currentPrice)
		return true, reason, entities.AlertSeverityNormal
	}

	// Crossing detection (above/below)
	if prevState.WasAboveLevel == nil {
		// First check, just record state
		return false, "", entities.AlertSeverityNormal
	}

	crossed := false
	if cfg.Direction == "above" && !*prevState.WasAboveLevel && isAbove {
		crossed = true
	}
	if cfg.Direction == "below" && *prevState.WasAboveLevel && !isAbove {
		crossed = true
	}

	if !crossed {
		return false, "", entities.AlertSeverityNormal
	}

	action := "돌파"
	if cfg.Direction == "below" {
		action = "이탈"
	}
	reason := fmt.Sprintf("%s $%s %s (현재 $%s)", rule.Symbol, cfg.Price, action, currentPrice)

	return true, reason, entities.AlertSeverityNormal
}

func (m *AlertMonitor) evalMACross(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	var cfg entities.MACrossConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	ma, err := m.calculateSMA(ctx, symbol, cfg.MATimeframe, cfg.MAPeriod)
	if err != nil || ma == "" {
		return false, "", entities.AlertSeverityNormal
	}

	cur, ok := parseDecimal(currentPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}
	maVal, ok := parseDecimal(ma)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	isAbove := cur.Cmp(maVal) >= 0

	var prevState entities.CheckState
	if len(rule.LastCheckState) > 0 {
		_ = json.Unmarshal(rule.LastCheckState, &prevState)
	}

	if prevState.WasAboveMA == nil {
		return false, "", entities.AlertSeverityNormal
	}

	crossed := false
	if cfg.Direction == "below" && *prevState.WasAboveMA && !isAbove {
		crossed = true
	}
	if cfg.Direction == "above" && !*prevState.WasAboveMA && isAbove {
		crossed = true
	}

	if !crossed {
		return false, "", entities.AlertSeverityNormal
	}

	action := "하향 돌파"
	if cfg.Direction == "above" {
		action = "상향 돌파"
	}
	reason := fmt.Sprintf("%s %d일 이평선 %s (MA: $%s, 현재: $%s)",
		symbol, cfg.MAPeriod, action, ma, currentPrice)

	return true, reason, entities.AlertSeverityUrgent
}

func (m *AlertMonitor) evalVolatilitySpike(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	var cfg entities.VolatilitySpikeConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	timeframe := cfg.Timeframe
	if timeframe == "" {
		timeframe = "1h"
	}

	multiplier, ok := parseDecimal(cfg.Multiplier)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	// Fetch 20 recent klines to calculate stddev
	const klineCount = 20
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", timeframe)
	params.Set("limit", fmt.Sprintf("%d", klineCount+1)) // +1 for current candle

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return false, "", entities.AlertSeverityNormal
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, "", entities.AlertSeverityNormal
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	if len(raw) < klineCount+1 {
		return false, "", entities.AlertSeverityNormal
	}

	// Use all but last candle for stddev baseline, last candle is current
	historical := raw[:len(raw)-1]
	latest := raw[len(raw)-1]

	// Calculate close price changes (absolute) for historical candles
	var changes []*big.Rat
	for _, row := range historical {
		if len(row) < 5 {
			continue
		}
		highStr, ok1 := asString(row[2])
		lowStr, ok2 := asString(row[3])
		if !ok1 || !ok2 {
			continue
		}
		high, ok1 := parseDecimal(highStr)
		low, ok2 := parseDecimal(lowStr)
		if !ok1 || !ok2 {
			continue
		}
		rng := new(big.Rat).Sub(high, low)
		changes = append(changes, rng)
	}

	if len(changes) < 2 {
		return false, "", entities.AlertSeverityNormal
	}

	// Mean of ranges
	sum := new(big.Rat)
	for _, c := range changes {
		sum.Add(sum, c)
	}
	n := int64(len(changes))
	mean := new(big.Rat).Quo(sum, big.NewRat(n, 1))

	// Variance = sum((x - mean)^2) / n
	varSum := new(big.Rat)
	for _, c := range changes {
		diff := new(big.Rat).Sub(c, mean)
		diff2 := new(big.Rat).Mul(diff, diff)
		varSum.Add(varSum, diff2)
	}
	variance := new(big.Rat).Quo(varSum, big.NewRat(n, 1))

	// stddev approximation: use variance comparison instead of sqrt
	// Trigger if (currentRange - mean)^2 > (multiplier * stddev)^2 = multiplier^2 * variance
	if len(latest) < 5 {
		return false, "", entities.AlertSeverityNormal
	}
	latestHighStr, ok1 := asString(latest[2])
	latestLowStr, ok2 := asString(latest[3])
	if !ok1 || !ok2 {
		return false, "", entities.AlertSeverityNormal
	}
	latestHigh, ok1 := parseDecimal(latestHighStr)
	latestLow, ok2 := parseDecimal(latestLowStr)
	if !ok1 || !ok2 {
		return false, "", entities.AlertSeverityNormal
	}

	latestRange := new(big.Rat).Sub(latestHigh, latestLow)
	excess := new(big.Rat).Sub(latestRange, mean)

	// Only trigger if range exceeds mean (i.e., positive excess)
	if excess.Sign() <= 0 {
		return false, "", entities.AlertSeverityNormal
	}

	// Compare excess^2 vs multiplier^2 * variance
	excessSq := new(big.Rat).Mul(excess, excess)
	multSq := new(big.Rat).Mul(multiplier, multiplier)
	threshold := new(big.Rat).Mul(multSq, variance)

	if excessSq.Cmp(threshold) < 0 {
		return false, "", entities.AlertSeverityNormal
	}

	reason := fmt.Sprintf("%s 변동성 급등 감지 (%s 기준, 현재 범위: $%s, 평균: $%s)",
		symbol, timeframe, formatDecimal(latestRange, 2), formatDecimal(mean, 2))

	return true, reason, entities.AlertSeverityUrgent
}

func (m *AlertMonitor) buildCheckState(ctx context.Context, currentPrice string, rule *entities.AlertRule, symbol string) entities.CheckState {
	state := entities.CheckState{LastPrice: currentPrice}

	switch rule.RuleType {
	case entities.RuleTypePriceLevel:
		var cfg entities.PriceLevelConfig
		if err := json.Unmarshal(rule.Config, &cfg); err == nil {
			cur, ok1 := parseDecimal(currentPrice)
			target, ok2 := parseDecimal(cfg.Price)
			if ok1 && ok2 {
				above := cur.Cmp(target) >= 0
				state.WasAboveLevel = &above
			}
		}
	case entities.RuleTypeMACross:
		var cfg entities.MACrossConfig
		if err := json.Unmarshal(rule.Config, &cfg); err == nil {
			ma, err := m.calculateSMA(ctx, symbol, cfg.MATimeframe, cfg.MAPeriod)
			if err == nil && ma != "" {
				cur, ok1 := parseDecimal(currentPrice)
				maVal, ok2 := parseDecimal(ma)
				if ok1 && ok2 {
					above := cur.Cmp(maVal) >= 0
					state.WasAboveMA = &above
				}
			}
		}
	}

	return state
}

func (m *AlertMonitor) isCooldownPassed(rule *entities.AlertRule) bool {
	if rule.LastTriggeredAt == nil {
		return true
	}
	cooldown := time.Duration(rule.CooldownMinutes) * time.Minute
	return time.Now().UTC().After(rule.LastTriggeredAt.Add(cooldown))
}

// --- Price fetching ---

func (m *AlertMonitor) fetchCurrentPrice(ctx context.Context, symbol string) (string, error) {
	m.priceMu.RLock()
	cached, ok := m.priceCache[symbol]
	m.priceMu.RUnlock()

	if ok && time.Since(cached.FetchedAt) < 10*time.Second {
		return cached.Price, nil
	}

	params := url.Values{}
	params.Set("symbol", symbol)
	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/ticker/price?%s", params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("binance ticker error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result struct {
		Price string `json:"price"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	m.priceMu.Lock()
	m.priceCache[symbol] = &priceSnapshot{Price: result.Price, FetchedAt: time.Now()}
	m.priceMu.Unlock()

	return result.Price, nil
}

func (m *AlertMonitor) fetchHistoricalPrice(ctx context.Context, symbol string, ago time.Duration) (string, error) {
	target := time.Now().UTC().Add(-ago)
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", "1m")
	params.Set("startTime", fmt.Sprintf("%d", target.UnixMilli()))
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("binance klines error %d", resp.StatusCode)
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return "", err
	}
	if len(raw) == 0 || len(raw[0]) < 5 {
		return "", nil
	}

	closeVal, ok := asString(raw[0][4])
	if !ok {
		return "", nil
	}
	return closeVal, nil
}

func (m *AlertMonitor) calculateSMA(ctx context.Context, symbol string, timeframe string, period int) (string, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", timeframe)
	params.Set("limit", fmt.Sprintf("%d", period))

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("binance klines error %d", resp.StatusCode)
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return "", err
	}

	if len(raw) < period {
		return "", nil
	}

	sum := new(big.Rat)
	for _, row := range raw {
		if len(row) < 5 {
			continue
		}
		closeStr, ok := asString(row[4])
		if !ok {
			continue
		}
		val, ok := parseDecimal(closeStr)
		if !ok {
			continue
		}
		sum.Add(sum, val)
	}

	avg := new(big.Rat).Quo(sum, big.NewRat(int64(len(raw)), 1))
	return formatDecimal(avg, 2), nil
}

func parseDuration(ref string) time.Duration {
	switch ref {
	case "1h":
		return time.Hour
	case "4h":
		return 4 * time.Hour
	case "24h":
		return 24 * time.Hour
	default:
		return 24 * time.Hour
	}
}

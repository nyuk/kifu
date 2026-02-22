package handlers

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/services"
	"golang.org/x/time/rate"
)

type OnchainHandler struct {
	service *services.OnchainPackService
	limiter *onchainIPRateLimiter
}

type OnchainQuickCheckRequest struct {
	Chain   string `json:"chain"`
	Address string `json:"address"`
	Range   string `json:"range"`
}

type OnchainQuickFactCheckRequest struct {
	Chain      string          `json:"chain"`
	Address    string          `json:"address"`
	TimeWindow *TimeWindowSpec  `json:"timeWindow"`
	TokenList  []string        `json:"tokenList,omitempty"`
	RiskFlags  *RiskFlagsSpec   `json:"riskFlags,omitempty"`
	Limits     *JobLimitsSpec   `json:"limits,omitempty"`
	ClientMeta *JobClientMeta   `json:"clientMeta,omitempty"`
}

type TimeWindowSpec struct {
	From        *string `json:"from,omitempty"`
	To          *string `json:"to,omitempty"`
	LookbackSec *int64  `json:"lookbackSec,omitempty"`
}

type RiskFlagsSpec struct {
	IncludeCounterpartySummary bool `json:"includeCounterpartySummary,omitempty"`
	IncludeContractInteractions bool `json:"includeContractInteractions,omitempty"`
	DetectCexLikeFlows        bool `json:"detectCexLikeFlows,omitempty"`
	IncludeNft                bool `json:"includeNft,omitempty"`
	MaxHops                   int  `json:"maxHops,omitempty"`
}

type JobLimitsSpec struct {
	MaxTxs    int `json:"maxTxs,omitempty"`
	MaxEvents int `json:"maxEvents,omitempty"`
}

type JobClientMeta struct {
	RequestID string `json:"requestId,omitempty"`
	Notes     string `json:"notes,omitempty"`
}

type OnchainQuickFactCheckResponse struct {
	SchemaVersion string             `json:"schema_version"`
	JobType       string             `json:"job_type"`
	Chain         string             `json:"chain"`
	Address       string             `json:"address"`
	TimeWindow    *TimeWindowSpec      `json:"timeWindow"`
	Status        string             `json:"status"`
	Confidence    float64            `json:"confidence"`
	ErrorCode     *string            `json:"error_code"`
	Uncertainty   OnchainUncertainty `json:"uncertainty"`
	Summary       OnchainSummaryV1   `json:"summary"`
	Evidence      OnchainEvidence    `json:"evidence"`
	Meta          OnchainMeta        `json:"meta"`
}

const (
	jobDefaultMaxTxs    = 2000
	jobDefaultMaxEvents = 20000
)

type OnchainUncertainty struct {
	IsPartial bool     `json:"is_partial"`
	Reasons   []string `json:"reasons"`
}

type OnchainSummaryV1 struct {
	TxCountObserved int               `json:"tx_count_observed"`
	Native          OnchainNativeFlow  `json:"native"`
	Tokens          []OnchainTokenV1   `json:"tokens"`
	TopInteractions []OnchainInteraction `json:"top_interactions"`
	RiskSignals     []OnchainRiskSignal `json:"risk_signals"`
}

type OnchainNativeFlow struct {
	Inflow  string `json:"inflow"`
	Outflow string `json:"outflow"`
	Net     string `json:"net"`
}

type OnchainTokenV1 struct {
	AssetID string `json:"asset_id"`
	Inflow  string `json:"inflow"`
	Outflow string `json:"outflow"`
	Net     string `json:"net"`
}

type OnchainInteraction struct {
	Counterparty string `json:"counterparty"`
	Category     string `json:"category"`
	Count        int    `json:"count"`
}

type OnchainRiskSignal struct {
	Signal   string `json:"signal"`
	Severity string `json:"severity"`
	Note     string `json:"note"`
}

type OnchainEvidence struct {
	BlockRange BlockRangeSpec `json:"block_range"`
	TxHashes   []string      `json:"tx_hashes"`
	LogIDs     []string      `json:"log_ids"`
	Sources    []OnchainSource `json:"sources"`
}

type BlockRangeSpec struct {
	From int64 `json:"from"`
	To   int64 `json:"to"`
}

type OnchainSource struct {
	Type    string `json:"type"`
	Name    string `json:"name"`
	Healthy bool   `json:"healthy"`
}

type OnchainMeta struct {
	GeneratedAt   string       `json:"generated_at"`
	LatencyMs     int64        `json:"latency_ms"`
	LimitsApplied LimitSummary `json:"limits_applied"`
	ClientMetaEcho JobClientMeta `json:"client_meta_echo"`
}

type LimitSummary struct {
	MaxTxs    int `json:"max_txs"`
	MaxEvents int `json:"max_events"`
}

func NewOnchainHandler(service *services.OnchainPackService) *OnchainHandler {
	return &OnchainHandler{
		service: service,
		limiter: newOnchainIPRateLimiter(rate.Every(time.Minute/10), 10),
	}
}

func (h *OnchainHandler) QuickCheck(c *fiber.Ctx) error {
	requestID := strings.TrimSpace(c.Get("X-Request-ID"))
	if requestID == "" {
		requestID = fmt.Sprintf("onchain-quick-check-%d", time.Now().UnixNano())
	}
	clientIP := c.IP()

	if h.service == nil {
		log.Printf("[incident:onchain] severity=error event=handler.request_denied request_id=%s ip=%s reason=service_unavailable", requestID, clientIP)
		return c.Status(500).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": "onchain service unavailable",
		})
	}

	if h.limiter != nil && !h.limiter.Allow(c.IP()) {
		log.Printf("[incident:onchain] severity=warning event=handler.rate_limited request_id=%s ip=%s", requestID, clientIP)
		return c.Status(429).JSON(fiber.Map{
			"code":    "RATE_LIMITED",
			"message": "too many requests",
		})
	}

	var req OnchainQuickCheckRequest
	if err := c.BodyParser(&req); err != nil {
		log.Printf("[incident:onchain] severity=warning event=handler.invalid_payload request_id=%s ip=%s body_error=%q", requestID, clientIP, err.Error())
		return c.Status(400).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": "invalid request body",
		})
	}
	log.Printf("[incident:onchain] severity=info event=handler.request_received request_id=%s ip=%s chain=%s address=%s range=%s", requestID, clientIP, strings.ToLower(strings.TrimSpace(req.Chain)), strings.ToLower(strings.TrimSpace(req.Address)), strings.TrimSpace(req.Range))

	start := time.Now()
	response, err := h.service.BuildQuickCheck(c.Context(), services.OnchainQuickCheckRequest{
		Chain:   req.Chain,
		Address: req.Address,
		Range:   req.Range,
	})
	elapsedMs := time.Since(start).Milliseconds()
	if err != nil {
		log.Printf("[incident:onchain] severity=error event=service.call_error request_id=%s ip=%s chain=%s address=%s range=%s elapsed_ms=%d err=%v", requestID, clientIP, strings.ToLower(strings.TrimSpace(req.Chain)), strings.ToLower(strings.TrimSpace(req.Address)), strings.TrimSpace(req.Range), elapsedMs, err)
		switch {
		case errors.Is(err, services.ErrInvalidChain):
			log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s code=INVALID_CHAIN ip=%s", requestID, clientIP)
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_CHAIN", "message": "only base chain is supported"})
		case errors.Is(err, services.ErrInvalidAddress):
			log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s code=INVALID_ADDRESS ip=%s address=%s", requestID, clientIP, strings.ToLower(strings.TrimSpace(req.Address)))
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_ADDRESS", "message": "address must be 0x + 40 hex"})
		case errors.Is(err, services.ErrInvalidRange):
			log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s code=INVALID_RANGE ip=%s range=%s", requestID, clientIP, strings.TrimSpace(req.Range))
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_RANGE", "message": "range must be 7d or 30d"})
		default:
			log.Printf("[incident:onchain] severity=error event=handler.unexpected_error request_id=%s ip=%s elapsed_ms=%d", requestID, clientIP, elapsedMs)
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "failed to build onchain quick check"})
		}
	}
	log.Printf("[incident:onchain] severity=debug event=handler.response_ready request_id=%s ip=%s chain=%s address=%s range=%s status=%s elapsed_ms=%d warning_count=%d", requestID, clientIP, response.Chain, response.Address, response.Range, response.Status, elapsedMs, len(response.Warnings))

	return c.Status(200).JSON(response)
}

func (h *OnchainHandler) QuickFactCheckJob(c *fiber.Ctx) error {
	requestID := strings.TrimSpace(c.Get("X-Request-ID"))
	if requestID == "" {
		requestID = fmt.Sprintf("onchain-quick-fact-check-job-%d", time.Now().UnixNano())
	}
	clientIP := c.IP()
	start := time.Now()
	var req OnchainQuickFactCheckRequest

	if h.service == nil {
		log.Printf("[incident:onchain] severity=error event=handler.request_denied request_id=%s ip=%s reason=service_unavailable", requestID, clientIP)
		return c.Status(500).JSON(newQuickFactErrorResponse(
			"",
			"",
			TimeWindowSpec{},
			"internal_error",
			[]string{"service_unavailable"},
			requestMeta(req),
			jobDefaultMaxTxs,
			jobDefaultMaxEvents,
			false,
			time.Since(start).Milliseconds(),
		))
	}

	if h.limiter != nil && !h.limiter.Allow(clientIP) {
		log.Printf("[incident:onchain] severity=warning event=handler.rate_limited request_id=%s ip=%s", requestID, clientIP)
		return c.Status(429).JSON(newQuickFactErrorResponse(
			"",
			"",
			TimeWindowSpec{},
			"rate_limited",
			[]string{"rate_limit_exceeded"},
			requestMeta(req),
			jobDefaultMaxTxs,
			jobDefaultMaxEvents,
			true,
			time.Since(start).Milliseconds(),
		))
	}

	if err := c.BodyParser(&req); err != nil {
		return writeJobInputError(c, 400, "", "", TimeWindowSpec{}, req, start, "invalid_input")
	}

	window, serviceRange, err := resolveJobTimeWindow(req.TimeWindow)
	if err != nil {
		return writeJobInputError(c, 400, "", "", TimeWindowSpec{}, req, start, "invalid_input")
	}

	chain := strings.ToLower(strings.TrimSpace(req.Chain))
	if chain == "" {
		return writeJobInputError(c, 400, "", "", TimeWindowSpec{}, req, start, "invalid_input")
	}

	if chain != "base" {
		log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s chain=%s code=unsupported_chain", requestID, chain)
		return c.Status(400).JSON(newQuickFactErrorResponse(
			chain,
			"",
			window,
			"unsupported_chain",
			[]string{"chain_not_supported_now"},
			requestMeta(req),
			defaultJobMaxTxs(req),
			defaultJobMaxEvents(req),
			false,
			time.Since(start).Milliseconds(),
		))
	}

	address := strings.ToLower(strings.TrimSpace(req.Address))
	if address == "" {
		return writeJobInputError(c, 400, chain, "", window, req, start, "invalid_input")
	}

	serviceResp, err := h.service.BuildQuickCheck(c.Context(), services.OnchainQuickCheckRequest{
		Chain:   chain,
		Address: address,
		Range:   serviceRange,
	})
	if err != nil {
		return writeJobServiceError(c, requestID, clientIP, chain, address, req, window, err)
	}

	jobResp := toQuickFactResponse(req, chain, address, serviceResp, start, window)
	statusCode := 200
	if jobResp.Status == "error" {
		statusCode = 502
	}

	return c.Status(statusCode).JSON(jobResp)
}

func newQuickFactErrorResponse(chain, address string, window TimeWindowSpec, code string, reasons []string, clientMeta JobClientMeta, maxTxs, maxEvents int, isPartial bool, latencyMs int64) OnchainQuickFactCheckResponse {
	if len(reasons) == 0 {
		reasons = []string{code}
	}

	return OnchainQuickFactCheckResponse{
		SchemaVersion: "1.0",
		JobType:       "onchain_quick_fact_check",
		Chain:         chain,
		Address:       address,
		TimeWindow:    &window,
		Status:        "error",
		Confidence:    0,
		ErrorCode:     stringPtr(code),
		Uncertainty: OnchainUncertainty{
			IsPartial: isPartial,
			Reasons:   reasons,
		},
		Summary: OnchainSummaryV1{
			TxCountObserved: 0,
			Native:          OnchainNativeFlow{Inflow: "0", Outflow: "0", Net: "0"},
			Tokens:          []OnchainTokenV1{},
			TopInteractions: []OnchainInteraction{},
			RiskSignals:     []OnchainRiskSignal{{Signal: "none", Severity: "low", Note: "no risk signals"}},
		},
		Evidence: OnchainEvidence{
			BlockRange: estimateWindowBlockRange(window),
			TxHashes:   []string{},
			LogIDs:     []string{},
			Sources:    []OnchainSource{{Type: "rpc", Name: "base-rpc", Healthy: true}},
		},
		Meta: OnchainMeta{
			GeneratedAt: time.Now().UTC().Format(time.RFC3339),
			LatencyMs:   latencyMs,
			LimitsApplied: LimitSummary{
				MaxTxs:    maxTxs,
				MaxEvents: maxEvents,
			},
			ClientMetaEcho: clientMeta,
		},
	}
}

func estimateWindowBlockRange(window TimeWindowSpec) BlockRangeSpec {
	blockFrom := int64(0)
	blockTo := int64(0)
	if parsedFrom, err := parseWindowTime(window.From); err == nil {
		blockFrom = parsedFrom.Unix()
	}
	if parsedTo, err := parseWindowTime(window.To); err == nil {
		blockTo = parsedTo.Unix()
	}

	return BlockRangeSpec{
		From: blockFrom,
		To:   blockTo,
	}
}

func writeJobInputError(c *fiber.Ctx, status int, chain, address string, window TimeWindowSpec, req OnchainQuickFactCheckRequest, started time.Time, code string, reasons ...string) error {
	if len(reasons) == 0 {
		reasons = []string{code}
	}
	return c.Status(status).JSON(newQuickFactErrorResponse(
		chain,
		address,
		window,
		code,
		reasons,
		requestMeta(req),
		defaultJobMaxTxs(req),
		defaultJobMaxEvents(req),
		false,
		time.Since(started).Milliseconds(),
	))
}

func writeJobServiceError(c *fiber.Ctx, requestID, clientIP, chain, address string, req OnchainQuickFactCheckRequest, window TimeWindowSpec, err error) error {
	switch {
	case errors.Is(err, services.ErrInvalidChain):
		return c.Status(400).JSON(newQuickFactErrorResponse(
			chain,
			address,
			window,
			"unsupported_chain",
			[]string{"unsupported_chain"},
			requestMeta(req),
			defaultJobMaxTxs(req),
			defaultJobMaxEvents(req),
			false,
			0,
		))
	case errors.Is(err, services.ErrInvalidAddress):
		return c.Status(400).JSON(newQuickFactErrorResponse(
			chain,
			address,
			window,
			"invalid_input",
			[]string{"invalid_address"},
			requestMeta(req),
			defaultJobMaxTxs(req),
			defaultJobMaxEvents(req),
			false,
			0,
		))
	case errors.Is(err, services.ErrInvalidRange):
		return c.Status(400).JSON(newQuickFactErrorResponse(
			chain,
			address,
			window,
			"invalid_input",
			[]string{"invalid_time_window"},
			requestMeta(req),
			defaultJobMaxTxs(req),
			defaultJobMaxEvents(req),
			false,
			0,
		))
	default:
		log.Printf("[incident:onchain] severity=error event=handler.unexpected_error request_id=%s ip=%s chain=%s address=%s err=%v", requestID, clientIP, chain, address, err)
		return c.Status(500).JSON(newQuickFactErrorResponse(
			chain,
			address,
			window,
			"source_unavailable",
			[]string{"provider_failure"},
			requestMeta(req),
			defaultJobMaxTxs(req),
			defaultJobMaxEvents(req),
			false,
			0,
		))
	}
}

func resolveJobTimeWindow(window *TimeWindowSpec) (resolved TimeWindowSpec, mappedRange string, err error) {
	if window == nil {
		return TimeWindowSpec{}, "", fmt.Errorf("timeWindow required")
	}

	now := time.Now().UTC()
	maxWindow := 7 * 24 * time.Hour

	if window.From != nil && window.To != nil {
		from, parseErr := parseWindowTime(window.From)
		if parseErr != nil {
			return TimeWindowSpec{}, "", parseErr
		}
		to, parseErr := parseWindowTime(window.To)
		if parseErr != nil {
			return TimeWindowSpec{}, "", parseErr
		}
		if !to.After(from) && !to.Equal(from) {
			return TimeWindowSpec{}, "", fmt.Errorf("invalid time window order")
		}
		if to.Sub(from) > maxWindow {
			return TimeWindowSpec{}, "", fmt.Errorf("time window too large")
		}

		resolved = TimeWindowSpec{From: ptrString(from.UTC().Format(time.RFC3339)), To: ptrString(to.UTC().Format(time.RFC3339))}
		mappedRange = formatOnchainRange(to.Sub(from))
		return resolved, mappedRange, nil
	}

	if window.LookbackSec != nil {
		if *window.LookbackSec <= 0 {
			return TimeWindowSpec{}, "", fmt.Errorf("lookbackSec must be positive")
		}
		lookback := time.Duration(*window.LookbackSec) * time.Second
		if lookback > maxWindow {
			return TimeWindowSpec{}, "", fmt.Errorf("time window too large")
		}

		to := now
		from := to.Add(-lookback)
		resolved = TimeWindowSpec{From: ptrString(from.Format(time.RFC3339)), To: ptrString(to.Format(time.RFC3339))}
		mappedRange = formatOnchainRange(lookback)
		return resolved, mappedRange, nil
	}

	return TimeWindowSpec{}, "", fmt.Errorf("timeWindow requires from/to or lookbackSec")
}

func formatOnchainRange(duration time.Duration) string {
	switch duration {
	case 7 * 24 * time.Hour:
		return "7d"
	case 30 * 24 * time.Hour:
		return "30d"
	default:
		seconds := int64(duration.Seconds())
		if seconds <= 0 {
			return "0s"
		}
		return fmt.Sprintf("%ds", seconds)
	}
}

func toQuickFactResponse(req OnchainQuickFactCheckRequest, chain, address string, src services.OnchainQuickCheckResponse, start time.Time, window TimeWindowSpec) OnchainQuickFactCheckResponse {
	status := "ok"
	errCode := (*string)(nil)
	reasons := []string{}
	if src.Status == "warning" {
		status = "warning"
		errCode = stringPtr("partial")
	}
	if src.Status == "error" {
		status = "error"
		errCode = stringPtr("source_unavailable")
		reasons = append(reasons, "provider_unavailable")
	}

	for _, w := range src.Warnings {
		reasons = append(reasons, w.Code+":"+w.Detail)
	}

	if status == "error" {
		reasons = append(reasons, "processing_error")
	}

	isPartial := status != "ok"
	confidence := 0.95
	if status != "ok" {
		confidence = 0.45
	}

	txCount := src.Summary.TokenTransferCount
	tokens := []OnchainTokenV1{}
	for _, t := range src.Summary.TopIn {
		tokens = append(tokens, OnchainTokenV1{AssetID: t.Token, Inflow: t.Amount, Outflow: "0", Net: t.Amount})
	}

	riskSignals := []OnchainRiskSignal{}
	for _, w := range src.Warnings {
		sev := "medium"
		if strings.ToLower(strings.TrimSpace(w.Severity)) == "high" {
			sev = "high"
		} else if strings.ToLower(strings.TrimSpace(w.Severity)) == "low" {
			sev = "low"
		}
		riskSignals = append(riskSignals, OnchainRiskSignal{Signal: strings.ToLower(strings.TrimSpace(w.Code)), Severity: sev, Note: w.Detail})
	}
	if len(riskSignals) == 0 {
		riskSignals = append(riskSignals, OnchainRiskSignal{Signal: "none", Severity: "low", Note: "no risk signals"})
	}

	blockFrom := int64(0)
	blockTo := int64(0)
	if parsedFrom, err := time.Parse(time.RFC3339, ptrDereference(window.From, "")); err == nil {
		blockFrom = parsedFrom.Unix()
	}
	if parsedTo, err := time.Parse(time.RFC3339, ptrDereference(window.To, "")); err == nil {
		blockTo = parsedTo.Unix()
	}

	return OnchainQuickFactCheckResponse{
		SchemaVersion: "1.0",
		JobType:       "onchain_quick_fact_check",
		Chain:         chain,
		Address:       address,
		TimeWindow:    &window,
		Status:        status,
		Confidence:    confidence,
		ErrorCode:     errCode,
		Uncertainty: OnchainUncertainty{
			IsPartial: isPartial,
			Reasons:   reasons,
		},
		Summary: OnchainSummaryV1{
			TxCountObserved: txCount,
			Native:          OnchainNativeFlow{Inflow: "0", Outflow: "0", Net: "0"},
			Tokens:          tokens,
			TopInteractions: []OnchainInteraction{},
			RiskSignals:     riskSignals,
		},
		Evidence: OnchainEvidence{
			BlockRange: BlockRangeSpec{From: blockFrom, To: blockTo},
			TxHashes:   []string{},
			LogIDs:     []string{},
			Sources: []OnchainSource{{Type: "rpc", Name: "base-rpc", Healthy: true}},
		},
		Meta: OnchainMeta{
			GeneratedAt: time.Now().UTC().Format(time.RFC3339),
			LatencyMs:   time.Since(start).Milliseconds(),
			LimitsApplied: LimitSummary{
				MaxTxs:    defaultJobMaxTxs(req),
				MaxEvents: defaultJobMaxEvents(req),
			},
			ClientMetaEcho: requestMeta(req),
		},
	}
}

func requestMeta(req OnchainQuickFactCheckRequest) JobClientMeta {
	if req.ClientMeta == nil {
		return JobClientMeta{}
	}
	return *req.ClientMeta
}

func defaultJobMaxTxs(req OnchainQuickFactCheckRequest) int {
	if req.Limits != nil && req.Limits.MaxTxs > 0 {
		return req.Limits.MaxTxs
	}
	return jobDefaultMaxTxs
}

func defaultJobMaxEvents(req OnchainQuickFactCheckRequest) int {
	if req.Limits != nil && req.Limits.MaxEvents > 0 {
		return req.Limits.MaxEvents
	}
	return jobDefaultMaxEvents
}

func parseWindowTime(raw *string) (time.Time, error) {
	if raw == nil {
		return time.Time{}, fmt.Errorf("window value required")
	}
	value := strings.TrimSpace(*raw)
	if value == "" {
		return time.Time{}, fmt.Errorf("window value required")
	}

	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed, nil
	}

	numeric, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return time.Time{}, err
	}

	switch len(value) {
	case 10:
		return time.Unix(numeric, 0).UTC(), nil
	case 11, 12, 13:
		return time.UnixMilli(numeric).UTC(), nil
	case 14, 15, 16:
		return time.UnixMicro(numeric).UTC(), nil
	default:
		return time.Unix(0, numeric).UTC(), nil
	}
}

func ptrString(v string) *string {
	cpy := v
	return &cpy
}

func ptrDereference(v *string, fallback string) string {
	if v == nil {
		return fallback
	}
	return *v
}

func stringPtr(v string) *string {
	return &v
}

type onchainIPRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	lastSeen map[string]time.Time
	rate     rate.Limit
	burst    int
}

func newOnchainIPRateLimiter(limit rate.Limit, burst int) *onchainIPRateLimiter {
	return &onchainIPRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		lastSeen: make(map[string]time.Time),
		rate:     limit,
		burst:    burst,
	}
}

func (l *onchainIPRateLimiter) Allow(ip string) bool {
	if l == nil {
		return true
	}

	key := ip
	if key == "" {
		key = "unknown"
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	limiter, ok := l.limiters[key]
	if !ok {
		limiter = rate.NewLimiter(l.rate, l.burst)
		l.limiters[key] = limiter
	}
	l.lastSeen[key] = time.Now()

	if len(l.lastSeen) > 1000 {
		cutoff := time.Now().Add(-2 * time.Hour)
		for candidate, seenAt := range l.lastSeen {
			if seenAt.Before(cutoff) {
				delete(l.lastSeen, candidate)
				delete(l.limiters, candidate)
			}
		}
	}

	return limiter.Allow()
}

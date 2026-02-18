package services

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	onchainSchemaVersion = "onchain_pack_v0"
	defaultOnchainRange  = "30d"
)

var (
	onchainRange7d       = 7 * 24 * time.Hour
	onchainRange30d      = 30 * 24 * time.Hour
	onchainCacheTTL      = 10 * time.Minute
	onchainBucketSize    = 10 * time.Minute
	onchainProviderLimit = 8 * time.Second

	evmAddressRegex = regexp.MustCompile(`^0x[0-9a-fA-F]{40}$`)

	ErrInvalidChain   = errors.New("invalid chain")
	ErrInvalidAddress = errors.New("invalid address")
	ErrInvalidRange   = errors.New("invalid range")
)

type TransferEvent struct {
	TokenAddress string
	From         string
	To           string
	AmountRaw    string
	BlockNumber  uint64
	TxHash       string
	LogIndex     uint64
	Timestamp    time.Time
}

type OnchainProvider interface {
	ListERC20Transfers(ctx context.Context, address string, startTime, endTime time.Time) ([]TransferEvent, error)
}

type OnchainQuickCheckRequest struct {
	Chain   string `json:"chain"`
	Address string `json:"address"`
	Range   string `json:"range"`
}

type OnchainTokenFlow struct {
	Token  string `json:"token"`
	Amount string `json:"amount"`
}

type OnchainSummary struct {
	TokenTransferCount int                `json:"token_transfer_count"`
	UniqueTokenCount   int                `json:"unique_token_count"`
	TopIn              []OnchainTokenFlow `json:"top_in"`
	TopOut             []OnchainTokenFlow `json:"top_out"`
}

type OnchainWarning struct {
	Code     string `json:"code"`
	Severity string `json:"severity"`
	Detail   string `json:"detail"`
}

type OnchainQuickCheckResponse struct {
	SchemaVersion string           `json:"schema_version"`
	Chain         string           `json:"chain"`
	Address       string           `json:"address"`
	AnchorTs      string           `json:"anchor_ts"`
	Range         string           `json:"range"`
	Summary       OnchainSummary   `json:"summary"`
	Warnings      []OnchainWarning `json:"warnings"`
	Status        string           `json:"status"`
}

type onchainCacheEntry struct {
	value     OnchainQuickCheckResponse
	expiresAt time.Time
}

type OnchainPackService struct {
	provider        OnchainProvider
	now             func() time.Time
	providerTimeout time.Duration
	cacheTTL        time.Duration

	cacheMu sync.RWMutex
	cache   map[string]onchainCacheEntry
}

func NewOnchainPackService(provider OnchainProvider) *OnchainPackService {
	return &OnchainPackService{
		provider:        provider,
		now:             time.Now,
		providerTimeout: onchainProviderLimit,
		cacheTTL:        onchainCacheTTL,
		cache:           make(map[string]onchainCacheEntry),
	}
}

func ValidateEVMAddress(address string) bool {
	return evmAddressRegex.MatchString(strings.TrimSpace(address))
}

type normalizedQuickCheckRequest struct {
	chain   string
	address string
	rng     string
}

func normalizeQuickCheckRequest(req OnchainQuickCheckRequest) (normalizedQuickCheckRequest, error) {
	chain := strings.ToLower(strings.TrimSpace(req.Chain))
	if chain != "base" {
		return normalizedQuickCheckRequest{}, ErrInvalidChain
	}

	address := strings.ToLower(strings.TrimSpace(req.Address))
	if !ValidateEVMAddress(address) {
		return normalizedQuickCheckRequest{}, ErrInvalidAddress
	}

	rng := strings.ToLower(strings.TrimSpace(req.Range))
	if rng == "" {
		rng = defaultOnchainRange
	}
	if rng != "7d" && rng != "30d" {
		return normalizedQuickCheckRequest{}, ErrInvalidRange
	}

	return normalizedQuickCheckRequest{
		chain:   chain,
		address: address,
		rng:     rng,
	}, nil
}

func onchainRangeDuration(rng string) time.Duration {
	if rng == "7d" {
		return onchainRange7d
	}
	return onchainRange30d
}

func (s *OnchainPackService) BuildQuickCheck(ctx context.Context, req OnchainQuickCheckRequest) (OnchainQuickCheckResponse, error) {
	if s.provider == nil {
		return OnchainQuickCheckResponse{}, errors.New("onchain provider unavailable")
	}

	normalized, err := normalizeQuickCheckRequest(req)
	if err != nil {
		return OnchainQuickCheckResponse{}, err
	}

	now := s.now().UTC()
	bucket := now.Truncate(onchainBucketSize)
	cacheKey := fmt.Sprintf("%s:%s:%s:%d", normalized.chain, normalized.address, normalized.rng, bucket.Unix())

	if cached, ok := s.getCached(cacheKey, now); ok {
		return cached, nil
	}

	startTime := now.Add(-onchainRangeDuration(normalized.rng))
	providerCtx, cancel := context.WithTimeout(ctx, s.providerTimeout)
	defer cancel()

	events, providerErr := s.provider.ListERC20Transfers(providerCtx, normalized.address, startTime, now)
	if providerErr != nil {
		return OnchainQuickCheckResponse{
			SchemaVersion: onchainSchemaVersion,
			Chain:         normalized.chain,
			Address:       normalized.address,
			AnchorTs:      now.Format(time.RFC3339),
			Range:         normalized.rng,
			Summary:       emptyOnchainSummary(),
			Warnings: []OnchainWarning{
				{
					Code:     "PROVIDER_UNAVAILABLE",
					Severity: "error",
					Detail:   "onchain provider timeout or unavailable",
				},
			},
			Status: "error",
		}, nil
	}

	summary, totalIn, top1In := buildOnchainSummary(normalized.address, events)
	warnings := evaluateOnchainWarnings(summary, totalIn, top1In)
	status := "ok"
	if len(warnings) > 0 {
		status = "warning"
	}

	response := OnchainQuickCheckResponse{
		SchemaVersion: onchainSchemaVersion,
		Chain:         normalized.chain,
		Address:       normalized.address,
		AnchorTs:      now.Format(time.RFC3339),
		Range:         normalized.rng,
		Summary:       summary,
		Warnings:      warnings,
		Status:        status,
	}

	s.setCached(cacheKey, response, now)
	return response, nil
}

func emptyOnchainSummary() OnchainSummary {
	return OnchainSummary{
		TokenTransferCount: 0,
		UniqueTokenCount:   0,
		TopIn:              []OnchainTokenFlow{},
		TopOut:             []OnchainTokenFlow{},
	}
}

func parseRawAmount(raw string) *big.Int {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return big.NewInt(0)
	}

	parsed := new(big.Int)
	if strings.HasPrefix(trimmed, "0x") || strings.HasPrefix(trimmed, "0X") {
		if _, ok := parsed.SetString(trimmed[2:], 16); !ok {
			return big.NewInt(0)
		}
		return parsed
	}

	if _, ok := parsed.SetString(trimmed, 10); !ok {
		return big.NewInt(0)
	}
	return parsed
}

func addAmount(target map[string]*big.Int, token string, amount *big.Int) {
	if amount == nil || amount.Sign() <= 0 || token == "" {
		return
	}

	current, exists := target[token]
	if !exists {
		target[token] = new(big.Int).Set(amount)
		return
	}
	current.Add(current, amount)
}

type tokenTotal struct {
	token  string
	amount *big.Int
}

func rankTokenTotals(source map[string]*big.Int) (top []OnchainTokenFlow, total *big.Int, top1 *big.Int) {
	total = big.NewInt(0)
	top1 = big.NewInt(0)

	rows := make([]tokenTotal, 0, len(source))
	for token, value := range source {
		if value == nil || value.Sign() <= 0 {
			continue
		}
		cloned := new(big.Int).Set(value)
		rows = append(rows, tokenTotal{token: token, amount: cloned})
		total.Add(total, cloned)
	}

	sort.Slice(rows, func(i, j int) bool {
		cmp := rows[i].amount.Cmp(rows[j].amount)
		if cmp == 0 {
			return rows[i].token < rows[j].token
		}
		return cmp > 0
	})

	if len(rows) > 0 {
		top1 = new(big.Int).Set(rows[0].amount)
	}

	limit := len(rows)
	if limit > 5 {
		limit = 5
	}
	top = make([]OnchainTokenFlow, 0, limit)
	for i := 0; i < limit; i++ {
		top = append(top, OnchainTokenFlow{
			Token:  rows[i].token,
			Amount: rows[i].amount.String(),
		})
	}
	return top, total, top1
}

func buildOnchainSummary(address string, events []TransferEvent) (OnchainSummary, *big.Int, *big.Int) {
	normalizedAddress := strings.ToLower(strings.TrimSpace(address))
	inTotals := map[string]*big.Int{}
	outTotals := map[string]*big.Int{}
	uniqueTokens := map[string]struct{}{}

	for _, event := range events {
		token := strings.ToLower(strings.TrimSpace(event.TokenAddress))
		if token != "" {
			uniqueTokens[token] = struct{}{}
		}

		amount := parseRawAmount(event.AmountRaw)
		if strings.EqualFold(strings.TrimSpace(event.To), normalizedAddress) {
			addAmount(inTotals, token, amount)
		}
		if strings.EqualFold(strings.TrimSpace(event.From), normalizedAddress) {
			addAmount(outTotals, token, amount)
		}
	}

	topIn, totalIn, top1In := rankTokenTotals(inTotals)
	topOut, _, _ := rankTokenTotals(outTotals)

	return OnchainSummary{
		TokenTransferCount: len(events),
		UniqueTokenCount:   len(uniqueTokens),
		TopIn:              topIn,
		TopOut:             topOut,
	}, totalIn, top1In
}

func evaluateOnchainWarnings(summary OnchainSummary, totalIn *big.Int, top1In *big.Int) []OnchainWarning {
	warnings := make([]OnchainWarning, 0, 3)

	if summary.TokenTransferCount == 0 {
		warnings = append(warnings, OnchainWarning{
			Code:     "LOW_ACTIVITY",
			Severity: "warn",
			Detail:   "no ERC20 transfers found in selected range",
		})
	}

	if totalIn != nil && totalIn.Sign() > 0 && top1In != nil && top1In.Sign() > 0 {
		left := new(big.Int).Mul(new(big.Int).Set(top1In), big.NewInt(10))
		right := new(big.Int).Mul(new(big.Int).Set(totalIn), big.NewInt(8))
		if left.Cmp(right) >= 0 {
			warnings = append(warnings, OnchainWarning{
				Code:     "HIGH_CONCENTRATION",
				Severity: "warn",
				Detail:   "single token dominates incoming transfer volume (>=80%)",
			})
		}
	}

	if summary.UniqueTokenCount >= 50 {
		warnings = append(warnings, OnchainWarning{
			Code:     "TOO_MANY_UNIQUE_TOKENS",
			Severity: "warn",
			Detail:   "high token variety detected (>=50 unique tokens)",
		})
	}

	return warnings
}

func (s *OnchainPackService) getCached(key string, now time.Time) (OnchainQuickCheckResponse, bool) {
	s.cacheMu.RLock()
	entry, ok := s.cache[key]
	s.cacheMu.RUnlock()
	if !ok {
		return OnchainQuickCheckResponse{}, false
	}
	if now.After(entry.expiresAt) {
		s.cacheMu.Lock()
		delete(s.cache, key)
		s.cacheMu.Unlock()
		return OnchainQuickCheckResponse{}, false
	}
	return entry.value, true
}

func (s *OnchainPackService) setCached(key string, value OnchainQuickCheckResponse, now time.Time) {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	s.cache[key] = onchainCacheEntry{
		value:     value,
		expiresAt: now.Add(s.cacheTTL),
	}

	if len(s.cache) > 1000 {
		cutoff := now
		for candidate, entry := range s.cache {
			if cutoff.After(entry.expiresAt) {
				delete(s.cache, candidate)
			}
		}
	}
}

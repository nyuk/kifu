package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertOutcomeCalculator struct {
	outcomeRepo repositories.AlertOutcomeRepository
	client      *http.Client
	intervals   []alertOutcomeInterval
}

type alertOutcomeInterval struct {
	Period   string
	Duration time.Duration
}

func NewAlertOutcomeCalculator(outcomeRepo repositories.AlertOutcomeRepository) *AlertOutcomeCalculator {
	return &AlertOutcomeCalculator{
		outcomeRepo: outcomeRepo,
		client:      &http.Client{Timeout: 12 * time.Second},
		intervals: []alertOutcomeInterval{
			{Period: "1h", Duration: time.Hour},
			{Period: "4h", Duration: 4 * time.Hour},
			{Period: "1d", Duration: 24 * time.Hour},
		},
	}
}

func (c *AlertOutcomeCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *AlertOutcomeCalculator) runOnce(ctx context.Context) {
	now := time.Now().UTC()
	for _, interval := range c.intervals {
		cutoff := now.Add(-interval.Duration)
		pending, err := c.outcomeRepo.ListPendingDecisions(ctx, interval.Period, cutoff, 100)
		if err != nil {
			log.Printf("alert outcome calc: list pending failed: %v", err)
			continue
		}

		for _, item := range pending {
			if err := c.calculateForDecision(ctx, interval, item); err != nil {
				log.Printf("alert outcome calc: alert %s error: %v", item.AlertID.String(), err)
			}
		}
	}
}

func (c *AlertOutcomeCalculator) calculateForDecision(ctx context.Context, interval alertOutcomeInterval, item *repositories.PendingAlertDecision) error {
	targetTime := item.DecisionTime.UTC().Add(interval.Duration).Truncate(time.Minute)

	outcomePrice, err := c.fetchPrice(ctx, item.Symbol, targetTime)
	if err != nil {
		return err
	}
	if outcomePrice == "" {
		return nil // Not yet available
	}

	pnl, err := c.calculatePnL(item.TriggerPrice, outcomePrice)
	if err != nil {
		return err
	}

	outcome := &entities.AlertOutcome{
		ID:             uuid.New(),
		AlertID:        item.AlertID,
		DecisionID:     item.DecisionID,
		Period:         interval.Period,
		ReferencePrice: item.TriggerPrice,
		OutcomePrice:   outcomePrice,
		PnLPercent:     pnl,
		CalculatedAt:   time.Now().UTC(),
	}

	_, err = c.outcomeRepo.CreateIfNotExists(ctx, outcome)
	return err
}

func (c *AlertOutcomeCalculator) fetchPrice(ctx context.Context, symbol string, target time.Time) (string, error) {
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

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("binance klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
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

func (c *AlertOutcomeCalculator) calculatePnL(reference, outcome string) (string, error) {
	ref, ok := parseDecimal(reference)
	if !ok {
		return "", errors.New("invalid reference price")
	}
	out, ok := parseDecimal(outcome)
	if !ok {
		return "", errors.New("invalid outcome price")
	}
	if ref.Sign() == 0 {
		return "", errors.New("reference price is zero")
	}

	diff := new(big.Rat).Sub(out, ref)
	ratio := new(big.Rat).Quo(diff, ref)
	ratio.Mul(ratio, big.NewRat(100, 1))
	return formatDecimal(ratio, 8), nil
}

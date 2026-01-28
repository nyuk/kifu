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
	"os"
	"strconv"
	"strings"
	"time"

    "github.com/google/uuid"
    "github.com/moneyvessel/kifu/internal/domain/entities"
    "github.com/moneyvessel/kifu/internal/domain/repositories"
)

const (
    outcomeKlineBaseURL = "https://fapi.binance.com"
)

type OutcomeCalculator struct {
    outcomeRepo repositories.OutcomeRepository
    client      *http.Client
    intervals   []outcomeInterval
}

type outcomeInterval struct {
    Period   string
    Duration time.Duration
}

func NewOutcomeCalculator(outcomeRepo repositories.OutcomeRepository) *OutcomeCalculator {
    return &OutcomeCalculator{
        outcomeRepo: outcomeRepo,
        client: &http.Client{
            Timeout: 12 * time.Second,
        },
        intervals: parseOutcomeIntervals(),
    }
}

func (c *OutcomeCalculator) Start(ctx context.Context) {
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

func (c *OutcomeCalculator) runOnce(ctx context.Context) {
    now := time.Now().UTC()
    for _, interval := range c.intervals {
        cutoff := now.Add(-interval.Duration)
        pending, err := c.outcomeRepo.ListPending(ctx, interval.Period, cutoff, 200)
        if err != nil {
            log.Printf("outcome calc: list pending failed: %v", err)
            continue
        }

        for _, item := range pending {
            if item == nil {
                continue
            }
            if err := c.calculateForBubble(ctx, interval, item); err != nil {
                log.Printf("outcome calc: bubble %s error: %v", item.BubbleID.String(), err)
            }
        }
    }
}

func (c *OutcomeCalculator) calculateForBubble(ctx context.Context, interval outcomeInterval, bubble *repositories.PendingOutcomeBubble) error {
    targetTime := bubble.CandleTime.UTC().Add(interval.Duration)
    targetTime = floorToMinute(targetTime)

    outcomePrice, ok, err := c.fetchOutcomePrice(ctx, bubble.Symbol, targetTime)
    if err != nil {
        return err
    }
    if !ok {
        return nil
    }

    pnl, err := calculatePnLPercent(bubble.Price, outcomePrice)
    if err != nil {
        return err
    }

    outcome := &entities.Outcome{
        ID:             uuid.New(),
        BubbleID:       bubble.BubbleID,
        Period:         interval.Period,
        ReferencePrice: bubble.Price,
        OutcomePrice:   outcomePrice,
        PnLPercent:     pnl,
        CalculatedAt:   time.Now().UTC(),
    }

    _, err = c.outcomeRepo.CreateIfNotExists(ctx, outcome)
    return err
}

func (c *OutcomeCalculator) fetchOutcomePrice(ctx context.Context, symbol string, target time.Time) (string, bool, error) {
    price, ok, err := c.requestKlineClose(ctx, symbol, target, target.Add(1*time.Minute), 1)
    if err != nil {
        return "", false, err
    }
    if ok {
        return price, true, nil
    }

    fallbackStart := target.Add(-5 * time.Minute)
    price, ok, err = c.requestKlineClose(ctx, symbol, fallbackStart, target, 5)
    if err != nil {
        return "", false, err
    }
    if ok {
        return price, true, nil
    }

    return "", false, nil
}

func (c *OutcomeCalculator) requestKlineClose(ctx context.Context, symbol string, start time.Time, end time.Time, limit int) (string, bool, error) {
    params := url.Values{}
    params.Set("symbol", symbol)
    params.Set("interval", "1m")
    params.Set("startTime", fmt.Sprintf("%d", start.UTC().UnixMilli()))
    params.Set("endTime", fmt.Sprintf("%d", end.UTC().UnixMilli()))
    params.Set("limit", fmt.Sprintf("%d", limit))

    requestURL := fmt.Sprintf("%s/fapi/v1/klines?%s", outcomeKlineBaseURL, params.Encode())
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
    if err != nil {
        return "", false, err
    }

    resp, err := c.client.Do(req)
    if err != nil {
        return "", false, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        payload, _ := io.ReadAll(resp.Body)
        return "", false, fmt.Errorf("binance klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
    }

    var raw [][]interface{}
    if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
        return "", false, err
    }
    if len(raw) == 0 {
        return "", false, nil
    }

    row := raw[len(raw)-1]
    if len(row) < 5 {
        return "", false, nil
    }
    closeVal, ok := asString(row[4])
    if !ok {
        return "", false, nil
    }
    return closeVal, true, nil
}

func parseOutcomeIntervals() []outcomeInterval {
    env := strings.TrimSpace(os.Getenv("OUTCOME_INTERVALS"))
    if env == "" {
        return []outcomeInterval{
            {Period: "1h", Duration: time.Hour},
            {Period: "4h", Duration: 4 * time.Hour},
            {Period: "1d", Duration: 24 * time.Hour},
        }
    }

    parts := strings.Split(env, ",")
    intervals := make([]outcomeInterval, 0, len(parts))
    for _, part := range parts {
        trimmed := strings.TrimSpace(part)
        switch trimmed {
        case "1m":
            intervals = append(intervals, outcomeInterval{Period: "1h", Duration: time.Minute})
        case "5m":
            intervals = append(intervals, outcomeInterval{Period: "4h", Duration: 5 * time.Minute})
        case "15m":
            intervals = append(intervals, outcomeInterval{Period: "1d", Duration: 15 * time.Minute})
        }
    }

    if len(intervals) == 0 {
        return []outcomeInterval{
            {Period: "1h", Duration: time.Hour},
            {Period: "4h", Duration: 4 * time.Hour},
            {Period: "1d", Duration: 24 * time.Hour},
        }
    }

    return intervals
}

func calculatePnLPercent(reference string, outcome string) (string, error) {
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

func parseDecimal(value string) (*big.Rat, bool) {
    value = strings.TrimSpace(value)
    if value == "" {
        return nil, false
    }
    rat := new(big.Rat)
    if _, ok := rat.SetString(value); !ok {
        return nil, false
    }
    return rat, true
}

func formatDecimal(value *big.Rat, scale int) string {
    if value == nil {
        return ""
    }
    formatted := value.FloatString(scale)
    formatted = strings.TrimRight(formatted, "0")
    formatted = strings.TrimRight(formatted, ".")
    if formatted == "" || formatted == "-" {
        return "0"
    }
    return formatted
}

func floorToMinute(t time.Time) time.Time {
    return t.Truncate(time.Minute)
}

func asString(value interface{}) (string, bool) {
	switch v := value.(type) {
	case string:
		return v, true
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), true
	default:
		return "", false
	}
}

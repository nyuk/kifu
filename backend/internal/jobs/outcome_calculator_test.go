package jobs

import (
	"fmt"
	"net/http/httptest"
	"net/http"
	"testing"
	"time"
)

func TestResolveOutcomeSymbolSource(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		input        string
		wantSymbol   string
		wantSource   outcomePriceSource
		wantResolved bool
	}{
		{
			name:         "binance futures symbol",
			input:        "BTCUSDT",
			wantSymbol:   "BTCUSDT",
			wantSource:   outcomePriceSourceBinance,
			wantResolved: true,
		},
		{
			name:         "upbit compact symbol",
			input:        "ADAKRW",
			wantSymbol:   "KRW-ADA",
			wantSource:   outcomePriceSourceUpbit,
			wantResolved: true,
		},
		{
			name:         "upbit market symbol",
			input:        "KRW-ADA",
			wantSymbol:   "KRW-ADA",
			wantSource:   outcomePriceSourceUpbit,
			wantResolved: true,
		},
		{
			name:         "unsupported symbol",
			input:        "ADA",
			wantResolved: false,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			gotSymbol, gotSource, ok := resolveOutcomeSymbolSource(tc.input)
			if ok != tc.wantResolved {
				t.Fatalf("resolved mismatch: got %v want %v", ok, tc.wantResolved)
			}
			if !ok {
				return
			}
			if gotSymbol != tc.wantSymbol {
				t.Fatalf("symbol mismatch: got %q want %q", gotSymbol, tc.wantSymbol)
			}
			if gotSource != tc.wantSource {
				t.Fatalf("source mismatch: got %q want %q", gotSource, tc.wantSource)
			}
		})
	}
}

func TestParseRetryAfter(t *testing.T) {
	t.Parallel()

	fallback := 60 * time.Second

	if got := parseRetryAfter("120", fallback); got != 120*time.Second {
		t.Fatalf("seconds format mismatch: got %s", got)
	}

	retryAt := time.Now().UTC().Add(90 * time.Second)
	retryHeader := retryAt.Format(http.TimeFormat)
	got := parseRetryAfter(retryHeader, fallback)
	if got < 80*time.Second || got > 100*time.Second {
		t.Fatalf("http date format mismatch: got %s", got)
	}

	if got := parseRetryAfter("", fallback); got != fallback {
		t.Fatalf("empty header should fallback: got %s", got)
	}
}

func TestRequestUpbitCandleCloseNotFoundSkips(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = fmt.Fprint(w, `{"error":{"name":404,"message":"Code not found"}}`)
	}))
	defer srv.Close()

	prev := outcomeUpbitCandleBaseURL
	outcomeUpbitCandleBaseURL = srv.URL
	defer func() { outcomeUpbitCandleBaseURL = prev }()

	calc := &OutcomeCalculator{
		client: &http.Client{Timeout: 2 * time.Second},
	}

	price, ok, err := calc.requestUpbitCandleClose(t.Context(), "KRW-UNKNOWN", time.Now().UTC(), 1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ok {
		t.Fatalf("expected not found to skip, got ok=true with price=%q", price)
	}
}

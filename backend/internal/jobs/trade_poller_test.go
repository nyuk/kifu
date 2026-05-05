package jobs

import (
	"net/http"
	"testing"
	"time"
)

func TestParseUpbitTime(t *testing.T) {
	cases := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{
			name:    "rfc3339",
			raw:     "2024-01-01T12:34:56Z",
			wantErr: false,
		},
		{
			name:    "rfc3339_nano",
			raw:     "2024-01-01T12:34:56.123456789Z",
			wantErr: false,
		},
		{
			name:    "second_precision",
			raw:     "2024-01-01T12:34:56",
			wantErr: false,
		},
		{
			name:    "korean_offset",
			raw:     "2024-01-01T21:34:56+09:00",
			wantErr: false,
		},
		{
			name:    "empty",
			raw:     "",
			wantErr: true,
		},
		{
			name:    "invalid",
			raw:     "2024/01/01 12:34:56",
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := parseUpbitTime(tc.raw)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected parse error for %q", tc.raw)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.raw, err)
			}
			if got.IsZero() {
				t.Fatalf("expected non-zero time for %q", tc.raw)
			}
			if got.After(time.Now().Add(24 * time.Hour)) {
				t.Fatalf("parsed time appears invalid/future: %v", got)
			}
		})
	}
}

func TestResolveUpbitTradeTimeUsesLatestFillTime(t *testing.T) {
	order := upbitClosedOrder{
		CreatedAt: "2026-02-11T07:23:00+00:00",
		Trades: []upbitOrderTrade{
			{CreatedAt: "2026-02-11T07:23:58+00:00"},
			{CreatedAt: "2026-02-11T07:24:14+00:00"},
		},
	}

	got, err := resolveUpbitTradeTime(order)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want, _ := time.Parse(time.RFC3339, "2026-02-11T07:24:14+00:00")
	if !got.Equal(want) {
		t.Fatalf("resolved trade time=%s want=%s", got.Format(time.RFC3339Nano), want.Format(time.RFC3339Nano))
	}
}

func TestIsBinanceInvalidSymbolResponse(t *testing.T) {
	cases := []struct {
		name       string
		statusCode int
		body       string
		want       bool
	}{
		{
			name:       "binance_code",
			statusCode: http.StatusBadRequest,
			body:       `{"code":-1121,"msg":"Invalid symbol."}`,
			want:       true,
		},
		{
			name:       "plain_message",
			statusCode: http.StatusBadRequest,
			body:       "Invalid symbol",
			want:       true,
		},
		{
			name:       "other_bad_request",
			statusCode: http.StatusBadRequest,
			body:       `{"code":-2015,"msg":"Invalid API-key"}`,
			want:       false,
		},
		{
			name:       "server_error_mentions_symbol",
			statusCode: http.StatusInternalServerError,
			body:       "Invalid symbol",
			want:       false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := isBinanceInvalidSymbolResponse(tc.statusCode, tc.body)
			if got != tc.want {
				t.Fatalf("isBinanceInvalidSymbolResponse(%d, %q)=%t want %t", tc.statusCode, tc.body, got, tc.want)
			}
		})
	}
}

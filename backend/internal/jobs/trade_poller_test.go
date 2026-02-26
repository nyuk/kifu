package jobs

import (
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


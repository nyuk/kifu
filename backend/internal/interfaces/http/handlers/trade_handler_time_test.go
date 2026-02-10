package handlers

import "testing"

func TestParseTimeQuery(t *testing.T) {
	t.Run("parses RFC3339 with milliseconds", func(t *testing.T) {
		got, err := parseTimeQuery("2026-02-10T04:44:34.123Z")
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if got == nil {
			t.Fatalf("expected parsed time, got nil")
		}
	})

	t.Run("parses date only", func(t *testing.T) {
		got, err := parseTimeQuery("2026-02-10")
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if got == nil {
			t.Fatalf("expected parsed time, got nil")
		}
	})

	t.Run("rejects invalid value", func(t *testing.T) {
		got, err := parseTimeQuery("not-a-time")
		if err == nil {
			t.Fatalf("expected error, got nil")
		}
		if got != nil {
			t.Fatalf("expected nil time on error")
		}
	})
}

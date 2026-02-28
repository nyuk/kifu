package handlers

import "testing"

func TestParseAgentRunFiltersValuesDefaults(t *testing.T) {
	t.Parallel()

	filters, err := parseAgentRunFiltersValues("", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filters.Limit != 50 {
		t.Fatalf("limit=%d want=50", filters.Limit)
	}
	if filters.RunType != "" {
		t.Fatalf("run_type=%q want empty", filters.RunType)
	}
	if filters.Status != "" {
		t.Fatalf("status=%q want empty", filters.Status)
	}
}

func TestParseAgentRunFiltersValuesValid(t *testing.T) {
	t.Parallel()

	filters, err := parseAgentRunFiltersValues("summary_ondemand", "completed", "20")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filters.RunType != "summary_ondemand" {
		t.Fatalf("run_type=%q want=summary_ondemand", filters.RunType)
	}
	if filters.Status != "completed" {
		t.Fatalf("status=%q want=completed", filters.Status)
	}
	if filters.Limit != 20 {
		t.Fatalf("limit=%d want=20", filters.Limit)
	}
}

func TestParseAgentRunFiltersValuesStatusAll(t *testing.T) {
	t.Parallel()

	filters, err := parseAgentRunFiltersValues("", "all", "10")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filters.Status != "" {
		t.Fatalf("status=%q want empty", filters.Status)
	}
}

func TestParseAgentRunFiltersValuesInvalidStatus(t *testing.T) {
	t.Parallel()

	_, err := parseAgentRunFiltersValues("", "weird", "10")
	if err == nil {
		t.Fatal("expected error for invalid status")
	}
}

func TestParseAgentRunFiltersValuesInvalidRunType(t *testing.T) {
	t.Parallel()

	_, err := parseAgentRunFiltersValues("bad-type", "running", "10")
	if err == nil {
		t.Fatal("expected error for invalid run_type")
	}
}

func TestParseAgentRunFiltersValuesLimitClamp(t *testing.T) {
	t.Parallel()

	filters, err := parseAgentRunFiltersValues("", "running", "999")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filters.Limit != 200 {
		t.Fatalf("limit=%d want=200", filters.Limit)
	}
}

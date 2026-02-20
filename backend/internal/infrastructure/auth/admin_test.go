package auth

import "testing"

func TestAdminRoleFromBool(t *testing.T) {
	if role := AdminRoleFromBool(true); role != "admin" {
		t.Fatalf("expected admin role, got %q", role)
	}
	if role := AdminRoleFromBool(false); role != "" {
		t.Fatalf("expected empty role, got %q", role)
	}
}

func TestIsAdminRole(t *testing.T) {
	tests := []struct {
		label    string
		input    string
		expected bool
	}{
		{"standard", "admin", true},
		{"trim", " admin ", true},
		{"case", "ADMIN", true},
		{"none", "member", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.label, func(t *testing.T) {
			if got := IsAdminRole(tt.input); got != tt.expected {
				t.Fatalf("expected IsAdminRole(%q)=%t, got %t", tt.input, tt.expected, got)
			}
		})
	}
}

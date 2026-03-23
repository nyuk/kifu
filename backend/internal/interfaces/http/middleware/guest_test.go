package middleware

import "testing"

func TestGuestRequestAllowed(t *testing.T) {
	testCases := []struct {
		name   string
		method string
		path   string
		want   bool
	}{
		{name: "allow read-only trades", method: "GET", path: "/api/v1/trades", want: true},
		{name: "allow head", method: "HEAD", path: "/api/v1/home", want: true},
		{name: "block bubble create", method: "POST", path: "/api/v1/bubbles", want: false},
		{name: "block settings update", method: "PUT", path: "/api/v1/users/me/password", want: false},
		{name: "block export read", method: "GET", path: "/api/v1/export/stats", want: false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := guestRequestAllowed(tc.method, tc.path)
			if got != tc.want {
				t.Fatalf("guestRequestAllowed(%q, %q) = %v, want %v", tc.method, tc.path, got, tc.want)
			}
		})
	}
}

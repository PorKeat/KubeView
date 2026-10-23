package stream

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOriginAllowed(t *testing.T) {
	cases := map[string]bool{
		"":                        true,
		"tauri://localhost":       true,
		"http://tauri.localhost":  true,
		"http://localhost:3005":   true,
		"http://127.0.0.1:3005":   true,
		"https://example.com":     false,
		"http://172.31.1.99:3005": false,
	}
	for origin, want := range cases {
		if got := originAllowed(origin); got != want {
			t.Fatalf("originAllowed(%q) = %v, want %v", origin, got, want)
		}
	}
}

func TestStreamAuthorization(t *testing.T) {
	s := &StreamServer{token: "secret-token"}
	cases := []struct {
		name string
		url  string
		auth string
		want bool
	}{
		{"query token", "/api/stream/logs?token=secret-token", "", true},
		{"bearer token", "/api/stream/logs", "Bearer secret-token", true},
		{"wrong token", "/api/stream/logs?token=nope", "", false},
		{"missing token", "/api/stream/logs", "", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.url, nil)
			if tc.auth != "" {
				req.Header.Set("Authorization", tc.auth)
			}
			if got := s.authorize(req); got != tc.want {
				t.Fatalf("authorize() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestGenerateToken(t *testing.T) {
	token, err := generateToken()
	if err != nil {
		t.Fatalf("generateToken() error: %v", err)
	}
	if len(token) != 64 {
		t.Fatalf("expected 64 hex characters, got %d", len(token))
	}
	other, err := generateToken()
	if err != nil {
		t.Fatalf("generateToken() error: %v", err)
	}
	if token == other {
		t.Fatal("expected unique tokens")
	}
}

package diagnostics

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"k8s.io/client-go/rest"
)

func TestDiagnosticsWithMockAPIServer(t *testing.T) {
	// Create mock HTTP server simulating Kubernetes /version
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/version" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"major":"1","minor":"34","gitVersion":"v1.34.1"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer mockServer.Close()

	runner := NewRunner()

	restCfg := &rest.Config{
		Host: mockServer.URL,
	}

	result := runner.Diagnose(context.Background(), "test-cluster", restCfg, nil, nil)

	if result.Status != "degraded" && result.Status != "connected" {
		t.Fatalf("Expected connected or degraded status, got: %s", result.Status)
	}

	netStage, ok := result.Stages["network"]
	if !ok || !netStage.Passed {
		t.Errorf("Expected network stage to pass, got: %+v", netStage)
	}

	tlsStage, ok := result.Stages["tls"]
	if !ok || !tlsStage.Passed {
		t.Errorf("Expected tls stage to pass, got: %+v", tlsStage)
	}

	if result.ServerVersion != "v1.34.1" {
		t.Errorf("Expected server version v1.34.1, got: %s", result.ServerVersion)
	}
}

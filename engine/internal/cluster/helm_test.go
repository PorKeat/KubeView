package cluster

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func encodedHelmRelease(t *testing.T, payload map[string]any) []byte {
	t.Helper()
	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	var compressed bytes.Buffer
	writer := gzip.NewWriter(&compressed)
	if _, err := writer.Write(raw); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return []byte(base64.StdEncoding.EncodeToString(compressed.Bytes()))
}

func TestListHelmReleases(t *testing.T) {
	now := time.Now().Add(-time.Hour)
	payload := map[string]any{
		"name":      "web",
		"namespace": "default",
		"version":   3,
		"info": map[string]any{
			"status":        "deployed",
			"description":   "Upgrade complete",
			"last_deployed": now.Format(time.RFC3339),
		},
		"chart": map[string]any{
			"metadata": map[string]any{
				"name":       "web",
				"version":    "1.4.2",
				"appVersion": "2.1.0",
			},
		},
	}
	secret := &corev1.Secret{
		ObjectMeta: simpleTestMeta("sh.helm.release.v1.web.v3", "default", now),
		Type:       corev1.SecretType("helm.sh/release.v1"),
		Data: map[string][]byte{
			"release": encodedHelmRelease(t, payload),
		},
	}
	secret.Labels = map[string]string{"owner": "helm"}

	manager := newFakeManager(fake.NewSimpleClientset(secret))
	res, err := manager.ListSimpleResources(context.Background(), "test", "helmreleases", "all")
	if err != nil {
		t.Fatal(err)
	}
	if res.TotalCount != 1 {
		t.Fatalf("expected one release, got %+v", res)
	}
	item := res.Items[0]
	if item.Status != "deployed" || item.StatusTone != "healthy" {
		t.Fatalf("unexpected release status: %+v", item)
	}
	if item.Details["chart"] != "web" || item.Details["revision"] != "3" || item.Details["appVersion"] != "2.1.0" {
		t.Fatalf("unexpected release details: %+v", item.Details)
	}
}

func TestFetchHelmCharts(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "text/yaml")
		_, _ = writer.Write([]byte(`
apiVersion: v1
entries:
  web:
    - name: web
      version: 1.4.2
      appVersion: 2.1.0
      description: Web frontend
  worker:
    - name: worker
      version: 0.9.0
      description: Background worker
`))
	}))
	defer server.Close()

	result, err := FetchHelmCharts(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if result.TotalCount != 2 || len(result.Charts) != 2 {
		t.Fatalf("unexpected chart result: %+v", result)
	}
	if result.Charts[0].Name != "web" || result.Charts[1].Name != "worker" {
		t.Fatalf("charts not sorted by name: %+v", result.Charts)
	}
	if result.Charts[0].AppVersion != "2.1.0" {
		t.Fatalf("unexpected chart app version: %+v", result.Charts[0])
	}

	if _, err := FetchHelmCharts(context.Background(), "file:///tmp/index.yaml"); err == nil {
		t.Fatal("expected non-HTTP chart repository URL to be rejected")
	}
}

var _ = metav1.Now

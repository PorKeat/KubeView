package cluster

import "testing"

func TestParsePodMetricsSumsContainers(t *testing.T) {
	raw := []byte(`{
		"kind": "PodMetricsList",
		"items": [
			{
				"metadata": {"name": "web-1", "namespace": "production"},
				"containers": [
					{"name": "web", "usage": {"cpu": "12m", "memory": "100Mi"}},
					{"name": "sidecar", "usage": {"cpu": "3m", "memory": "20Mi"}}
				]
			}
		]
	}`)

	items, err := parsePodMetrics(raw, "production")
	if err != nil {
		t.Fatalf("parsePodMetrics returned an error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 pod, got %d", len(items))
	}

	pod := items[0]
	if pod.Namespace != "production" || pod.Name != "web-1" {
		t.Fatalf("unexpected identity: %s/%s", pod.Namespace, pod.Name)
	}
	if pod.CPUUsageMillicores != 15 {
		t.Fatalf("expected 15m CPU, got %dm", pod.CPUUsageMillicores)
	}
	if pod.MemoryUsageBytes != 120*1024*1024 {
		t.Fatalf("expected 120Mi memory, got %d bytes", pod.MemoryUsageBytes)
	}
	if len(pod.Containers) != 2 {
		t.Fatalf("expected 2 containers, got %d", len(pod.Containers))
	}
	if pod.Containers[0].Name != "web" || pod.Containers[0].CPUUsageMillicores != 12 {
		t.Fatalf("unexpected first container: %+v", pod.Containers[0])
	}
}

func TestParsePodMetricsUsesTargetNamespaceFallback(t *testing.T) {
	raw := []byte(`{
		"items": [
			{
				"metadata": {"name": "api-1"},
				"containers": [{"name": "api", "usage": {"cpu": "500000000n", "memory": "1Gi"}}]
			}
		]
	}`)

	items, err := parsePodMetrics(raw, "default")
	if err != nil {
		t.Fatalf("parsePodMetrics returned an error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 pod, got %d", len(items))
	}
	if items[0].Namespace != "default" {
		t.Fatalf("expected namespace fallback, got %q", items[0].Namespace)
	}
	if items[0].CPUUsageMillicores != 500 {
		t.Fatalf("expected 500m CPU, got %dm", items[0].CPUUsageMillicores)
	}
}

func TestParsePodMetricsInvalidPayload(t *testing.T) {
	if _, err := parsePodMetrics([]byte(`not-json`), "default"); err == nil {
		t.Fatal("expected an error for invalid JSON")
	}
}

func TestPodMetricsReason(t *testing.T) {
	if got := podMetricsReason(nil); got == "" {
		t.Fatal("expected a reason for a nil error")
	}
}

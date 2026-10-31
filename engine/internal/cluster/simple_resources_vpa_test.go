package cluster

import (
	"context"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakediscovery "k8s.io/client-go/discovery/fake"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes/fake"
)

func verticalPodAutoscalerObject(name, namespace, updateMode string, withRecommendation bool) *unstructured.Unstructured {
	object := map[string]interface{}{
		"apiVersion": "autoscaling.k8s.io/v1",
		"kind":       "VerticalPodAutoscaler",
		"metadata": map[string]interface{}{
			"name":              name,
			"namespace":         namespace,
			"creationTimestamp": time.Now().Add(-time.Minute).UTC().Format(time.RFC3339),
		},
		"spec": map[string]interface{}{
			"targetRef": map[string]interface{}{
				"apiVersion": "apps/v1",
				"kind":       "Deployment",
				"name":       "web",
			},
			"updatePolicy": map[string]interface{}{
				"updateMode": updateMode,
			},
		},
	}
	if withRecommendation {
		object["status"] = map[string]interface{}{
			"recommendation": map[string]interface{}{
				"containerRecommendations": []interface{}{
					map[string]interface{}{
						"containerName": "web",
						"target": map[string]interface{}{
							"cpu":    "250m",
							"memory": "256Mi",
						},
					},
				},
			},
		}
	}
	return &unstructured.Unstructured{Object: object}
}

func TestVerticalPodAutoscalerResultItem(t *testing.T) {
	tests := []struct {
		name           string
		updateMode     string
		recommendation bool
		wantStatus     string
		wantTone       string
		wantMode       string
		wantTarget     string
		wantSummary    string
	}{
		{
			name:           "recommendation ready",
			updateMode:     "Auto",
			recommendation: true,
			wantStatus:     "Recommended",
			wantTone:       "healthy",
			wantMode:       "Auto",
			wantTarget:     "Deployment/web",
			wantSummary:    "web: cpu 250m, memory 256Mi",
		},
		{
			name:           "off still surfaces recommendation",
			updateMode:     "Off",
			recommendation: true,
			wantStatus:     "Recommendation only",
			wantTone:       "muted",
			wantMode:       "Off",
			wantTarget:     "Deployment/web",
			wantSummary:    "web: cpu 250m, memory 256Mi",
		},
		{
			name:           "awaiting recommendation",
			updateMode:     "Auto",
			recommendation: false,
			wantStatus:     "Awaiting recommendation",
			wantTone:       "warning",
			wantMode:       "Auto",
			wantTarget:     "Deployment/web",
			wantSummary:    "—",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			vpa := verticalPodAutoscalerObject("web-vpa", "default", test.updateMode, test.recommendation)
			item := verticalPodAutoscalerResultItem(vpa)
			if item.Status != test.wantStatus {
				t.Fatalf("status = %q, want %q", item.Status, test.wantStatus)
			}
			if item.StatusTone != test.wantTone {
				t.Fatalf("tone = %q, want %q", item.StatusTone, test.wantTone)
			}
			if item.Details["updateMode"] != test.wantMode {
				t.Fatalf("updateMode = %q, want %q", item.Details["updateMode"], test.wantMode)
			}
			if item.Details["target"] != test.wantTarget {
				t.Fatalf("target = %q, want %q", item.Details["target"], test.wantTarget)
			}
			if item.Details["recommendation"] != test.wantSummary {
				t.Fatalf("recommendation = %q, want %q", item.Details["recommendation"], test.wantSummary)
			}
		})
	}
}

func TestVerticalPodAutoscalerNoPodsMatched(t *testing.T) {
	vpa := verticalPodAutoscalerObject("web-vpa", "default", "InPlaceOrRecreate", false)
	vpa.Object["status"] = map[string]interface{}{
		"conditions": []interface{}{
			map[string]interface{}{
				"type":   "RecommendationProvided",
				"status": "False",
				"reason": "NoPodsMatched",
			},
		},
	}
	item := verticalPodAutoscalerResultItem(vpa)
	if item.Status != "No pods matched" {
		t.Fatalf("status = %q, want %q", item.Status, "No pods matched")
	}
	if item.StatusTone != "warning" {
		t.Fatalf("tone = %q, want %q", item.StatusTone, "warning")
	}
	if item.Details["updateMode"] != "InPlaceOrRecreate" {
		t.Fatalf("updateMode = %q", item.Details["updateMode"])
	}
}

func vpaDiscoveryResources(version string) []*metav1.APIResourceList {
	return []*metav1.APIResourceList{{
		GroupVersion: "autoscaling.k8s.io/" + version,
		APIResources: []metav1.APIResource{{
			Name:       "verticalpodautoscalers",
			Kind:       "VerticalPodAutoscaler",
			Namespaced: true,
			Verbs:      []string{"get", "list", "watch"},
		}},
	}}
}

func TestListSimpleVerticalPodAutoscalers(t *testing.T) {
	v1GVR := schema.GroupVersionResource{
		Group: "autoscaling.k8s.io", Version: "v1", Resource: "verticalpodautoscalers",
	}
	client := fake.NewSimpleClientset()
	client.Discovery().(*fakediscovery.FakeDiscovery).Resources = vpaDiscoveryResources("v1")

	dynamicClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{v1GVR: "VerticalPodAutoscalerList"},
		verticalPodAutoscalerObject("web-vpa", "default", "Auto", true),
		verticalPodAutoscalerObject("api-vpa", "api", "Off", false),
	)

	manager := newFakeManager(client)
	attachDynamicClient(manager, "test", dynamicClient)
	ctx := context.Background()

	res, err := manager.ListSimpleResources(ctx, "test", "verticalpodautoscalers", "all")
	if err != nil {
		t.Fatal(err)
	}
	if res.Available == nil || !*res.Available {
		t.Fatalf("expected available result, got %+v", res.Available)
	}
	if res.TotalCount != 2 || len(res.Items) != 2 {
		t.Fatalf("expected two items, got %+v", res)
	}
	if res.Items[0].Name != "api-vpa" || res.Items[1].Name != "web-vpa" {
		t.Fatalf("items not sorted by name: %+v", res.Items)
	}

	namespaced, err := manager.ListSimpleResources(ctx, "test", "verticalpodautoscalers", "default")
	if err != nil {
		t.Fatal(err)
	}
	if namespaced.TotalCount != 1 || namespaced.Items[0].Name != "web-vpa" {
		t.Fatalf("unexpected namespace-scoped items: %+v", namespaced.Items)
	}

	counts := manager.CountSimpleResources(ctx, "test")
	if counts.VerticalPodAutoscalers != 2 {
		t.Fatalf("verticalPodAutoscalers = %d, want 2", counts.VerticalPodAutoscalers)
	}
}

func TestListSimpleVerticalPodAutoscalersFallsBackToV1Beta2(t *testing.T) {
	betaGVR := schema.GroupVersionResource{
		Group: "autoscaling.k8s.io", Version: "v1beta2", Resource: "verticalpodautoscalers",
	}
	client := fake.NewSimpleClientset()
	client.Discovery().(*fakediscovery.FakeDiscovery).Resources = vpaDiscoveryResources("v1beta2")

	dynamicClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{betaGVR: "VerticalPodAutoscalerList"},
		func() *unstructured.Unstructured {
			vpa := verticalPodAutoscalerObject("legacy-vpa", "default", "Auto", true)
			vpa.Object["apiVersion"] = "autoscaling.k8s.io/v1beta2"
			return vpa
		}(),
	)

	manager := newFakeManager(client)
	attachDynamicClient(manager, "test", dynamicClient)

	res, err := manager.ListSimpleResources(context.Background(), "test", "verticalpodautoscalers", "all")
	if err != nil {
		t.Fatal(err)
	}
	if res.TotalCount != 1 || res.Items[0].Name != "legacy-vpa" {
		t.Fatalf("unexpected v1beta2 result: %+v", res)
	}
}

func TestListSimpleVerticalPodAutoscalersWhenCRDMissing(t *testing.T) {
	manager := newFakeManager(fake.NewSimpleClientset())

	res, err := manager.ListSimpleResources(context.Background(), "test", "verticalpodautoscalers", "all")
	if err != nil {
		t.Fatal(err)
	}
	if res.Available == nil || *res.Available {
		t.Fatalf("expected unavailable result, got %+v", res.Available)
	}
	if res.TotalCount != 0 || len(res.Items) != 0 {
		t.Fatalf("expected empty result, got %+v", res)
	}
}

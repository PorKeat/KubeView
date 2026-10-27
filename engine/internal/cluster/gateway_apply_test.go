package cluster

import (
	"context"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func newGatewayTestManager(t *testing.T) *Manager {
	t.Helper()
	scheme := runtime.NewScheme()
	gatewayGVK := schema.GroupVersionKind{Group: "gateway.networking.k8s.io", Version: "v1", Kind: "Gateway"}
	routeGVK := schema.GroupVersionKind{Group: "gateway.networking.k8s.io", Version: "v1", Kind: "HTTPRoute"}
	scheme.AddKnownTypeWithName(gatewayGVK, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(gatewayGVK.GroupVersion().WithKind("GatewayList"), &unstructured.UnstructuredList{})
	scheme.AddKnownTypeWithName(routeGVK, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(routeGVK.GroupVersion().WithKind("HTTPRouteList"), &unstructured.UnstructuredList{})

	dynamicClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme, map[schema.GroupVersionResource]string{
		{Group: "gateway.networking.k8s.io", Version: "v1", Resource: "gateways"}:   "GatewayList",
		{Group: "gateway.networking.k8s.io", Version: "v1", Resource: "httproutes"}: "HTTPRouteList",
	})
	manager := newFakeManager(nil)
	attachDynamicClient(manager, "test", dynamicClient)
	return manager
}

func TestApplyAndDeleteGatewayResource(t *testing.T) {
	manager := newGatewayTestManager(t)
	manifest := `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: edge
  namespace: infra
  labels:
    team: platform
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    hostname: app.example.com
    port: 80
    protocol: HTTP
`
	summary, err := manager.ApplyGatewayResourceYaml(context.Background(), "test", "infra", manifest)
	if err != nil {
		t.Fatalf("ApplyGatewayResourceYaml failed: %v", err)
	}
	if summary.Kind != "Gateway" || summary.Name != "edge" || summary.Class != "nginx" {
		t.Errorf("unexpected applied gateway: %+v", summary)
	}
	if summary.ListenerCount != 1 {
		t.Errorf("expected 1 listener, got %d", summary.ListenerCount)
	}

	updatedManifest := `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: edge
  namespace: infra
  labels:
    team: networking
spec:
  gatewayClassName: envoy
  listeners:
  - name: https
    hostname: api.example.com
    port: 443
    protocol: HTTPS
`
	updated, err := manager.ApplyGatewayResourceYaml(context.Background(), "test", "infra", updatedManifest)
	if err != nil {
		t.Fatalf("ApplyGatewayResourceYaml update failed: %v", err)
	}
	if updated.Class != "envoy" {
		t.Errorf("expected updated gateway class envoy, got %s", updated.Class)
	}

	if err := manager.DeleteGatewayResource(context.Background(), "test", "infra", "Gateway", "edge"); err != nil {
		t.Fatalf("DeleteGatewayResource failed: %v", err)
	}
	if _, err := manager.GetGatewayResourceYaml(context.Background(), "test", "infra", "Gateway", "edge"); err == nil {
		t.Fatal("expected deleted gateway to be absent")
	}
	// Deleting an already-absent resource is idempotent.
	if err := manager.DeleteGatewayResource(context.Background(), "test", "infra", "Gateway", "edge"); err != nil {
		t.Fatalf("idempotent delete failed: %v", err)
	}
}

func TestApplyGatewayResourceRejectsUnsupportedKind(t *testing.T) {
	manager := newGatewayTestManager(t)
	manifest := `apiVersion: gateway.networking.k8s.io/v1
kind: NotAGatewayKind
metadata:
  name: bad
  namespace: infra
`
	if _, err := manager.ApplyGatewayResourceYaml(context.Background(), "test", "infra", manifest); err == nil {
		t.Fatal("expected unsupported kind error")
	}
}

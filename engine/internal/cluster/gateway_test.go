package cluster

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestConvertGatewayResourceGateway(t *testing.T) {
	resource := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       "Gateway",
		"metadata": map[string]interface{}{
			"name":              "edge",
			"namespace":         "infra",
			"creationTimestamp": "2025-01-01T00:00:00Z",
		},
		"spec": map[string]interface{}{
			"gatewayClassName": "nginx",
			"listeners": []interface{}{
				map[string]interface{}{
					"name":     "http",
					"hostname": "app.example.com",
					"port":     float64(80),
					"protocol": "HTTP",
				},
			},
		},
		"status": map[string]interface{}{
			"addresses": []interface{}{
				map[string]interface{}{"type": "IPAddress", "value": "203.0.113.10"},
			},
			"conditions": []interface{}{
				map[string]interface{}{"type": "Programmed", "status": "True"},
			},
		},
	}}

	summary := convertGatewayResource("Gateway", resource)

	if summary.Kind != "Gateway" || summary.Name != "edge" || summary.Namespace != "infra" {
		t.Errorf("unexpected identity: %+v", summary)
	}
	if summary.Class != "nginx" {
		t.Errorf("expected class nginx, got %s", summary.Class)
	}
	if summary.ListenerCount != 1 {
		t.Errorf("expected 1 listener, got %d", summary.ListenerCount)
	}
	if len(summary.Hosts) != 1 || summary.Hosts[0] != "app.example.com" {
		t.Errorf("unexpected hosts: %v", summary.Hosts)
	}
	if len(summary.Addresses) != 1 || summary.Addresses[0] != "203.0.113.10" {
		t.Errorf("unexpected addresses: %v", summary.Addresses)
	}
	if summary.Status != "Programmed" {
		t.Errorf("expected Programmed status, got %s", summary.Status)
	}
}

func TestConvertGatewayResourceHTTPRoute(t *testing.T) {
	resource := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       "HTTPRoute",
		"metadata": map[string]interface{}{
			"name":      "web-route",
			"namespace": "production",
		},
		"spec": map[string]interface{}{
			"hostnames": []interface{}{"app.example.com"},
			"parentRefs": []interface{}{
				map[string]interface{}{"name": "edge", "namespace": "infra"},
			},
			"rules": []interface{}{map[string]interface{}{}, map[string]interface{}{}},
		},
		"status": map[string]interface{}{
			"parents": []interface{}{
				map[string]interface{}{
					"conditions": []interface{}{
						map[string]interface{}{"type": "Accepted", "status": "True"},
					},
				},
			},
		},
	}}

	summary := convertGatewayResource("HTTPRoute", resource)

	if summary.Class != "infra/edge" {
		t.Errorf("expected parent infra/edge, got %s", summary.Class)
	}
	if summary.RuleCount != 2 {
		t.Errorf("expected 2 rules, got %d", summary.RuleCount)
	}
	if summary.Status != "Accepted" {
		t.Errorf("expected Accepted status, got %s", summary.Status)
	}
}

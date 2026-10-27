package cluster

import (
	"context"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8sfake "k8s.io/client-go/kubernetes/fake"
)

func TestSummarizeHubbleFlow(t *testing.T) {
	summary := summarizeHubbleFlow(map[string]interface{}{
		"time":    "2026-01-02T03:04:05Z",
		"verdict": "VERDICT_FORWARDED",
		"type":    "L3_L4",
		"source": map[string]interface{}{
			"namespace": "production",
			"podName":   "web-1",
		},
		"destination": map[string]interface{}{
			"namespace": "production",
			"podName":   "api-1",
		},
		"IP": map[string]interface{}{
			"source":      "10.0.0.1",
			"destination": "10.0.0.2",
		},
		"l4": map[string]interface{}{
			"TCP": map[string]interface{}{
				"sourcePort":      float64(34567),
				"destinationPort": float64(8080),
			},
		},
		"nodeName": "worker-1",
	}, `{"flow":true}`)

	if summary.SourcePod != "web-1" || summary.DestinationPod != "api-1" {
		t.Errorf("unexpected flow endpoints: %+v", summary)
	}
	if summary.Protocol != "TCP" || summary.DestinationPort != "8080" || summary.SourcePort != "34567" {
		t.Errorf("unexpected flow L4: %+v", summary)
	}
	if summary.NodeName != "worker-1" || summary.Verdict != "VERDICT_FORWARDED" {
		t.Errorf("unexpected flow metadata: %+v", summary)
	}
	if !strings.Contains(summary.Summary, "web-1 -> api-1") || !strings.Contains(summary.Summary, "TCP/8080") {
		t.Errorf("unexpected flow summary: %s", summary.Summary)
	}
	if summary.RawJSON != `{"flow":true}` {
		t.Errorf("unexpected raw JSON: %s", summary.RawJSON)
	}
}

func newCiliumTestManager(t *testing.T) *Manager {
	t.Helper()
	scheme := runtime.NewScheme()
	policyGVK := schema.GroupVersionKind{Group: "cilium.io", Version: "v2", Kind: "CiliumNetworkPolicy"}
	endpointGVK := schema.GroupVersionKind{Group: "cilium.io", Version: "v2", Kind: "CiliumEndpoint"}
	scheme.AddKnownTypeWithName(policyGVK, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(policyGVK.GroupVersion().WithKind("CiliumNetworkPolicyList"), &unstructured.UnstructuredList{})
	scheme.AddKnownTypeWithName(endpointGVK, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(endpointGVK.GroupVersion().WithKind("CiliumEndpointList"), &unstructured.UnstructuredList{})

	policy := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "cilium.io/v2",
		"kind":       "CiliumNetworkPolicy",
		"metadata": map[string]interface{}{
			"name":              "allow-web",
			"namespace":         "production",
			"creationTimestamp": "2025-01-01T00:00:00Z",
		},
		"spec": map[string]interface{}{
			"endpointSelector": map[string]interface{}{
				"matchLabels": map[string]interface{}{"app": "web"},
			},
			"ingress": []interface{}{map[string]interface{}{}},
		},
	}}
	endpoint := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "cilium.io/v2",
		"kind":       "CiliumEndpoint",
		"metadata": map[string]interface{}{
			"name":              "web-1",
			"namespace":         "production",
			"creationTimestamp": "2025-01-01T00:00:00Z",
		},
		"status": map[string]interface{}{
			"identity": map[string]interface{}{"id": int64(1234)},
			"state":    "ready",
			"external-identifiers": map[string]interface{}{
				"pod-name": "production/web-1",
			},
			"networking": map[string]interface{}{
				"addressing": []interface{}{
					map[string]interface{}{"ipv4": "10.0.0.5"},
				},
			},
			"policy": map[string]interface{}{
				"ingress": map[string]interface{}{"enforcing": true},
				"egress":  map[string]interface{}{"enforcing": false},
			},
		},
	}}

	dynamicClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme, map[schema.GroupVersionResource]string{
		ciliumNetworkPolicyGVR: "CiliumNetworkPolicyList",
		ciliumEndpointGVR:      "CiliumEndpointList",
	}, policy, endpoint)

	ciliumPod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "cilium-abc", Namespace: "kube-system", Labels: map[string]string{"k8s-app": "cilium"}},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{{Name: "cilium-agent", Image: "quay.io/cilium/cilium:v1.16.0"}},
		},
	}
	relayService := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "hubble-relay", Namespace: "kube-system"},
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{{Name: "grpc", Port: 4245}},
		},
	}
	manager := newFakeManager(k8sfake.NewSimpleClientset(ciliumPod, relayService))
	attachDynamicClient(manager, "test", dynamicClient)
	return manager
}

func TestListCiliumResources(t *testing.T) {
	manager := newCiliumTestManager(t)
	result, err := manager.ListCiliumResources(context.Background(), "test", "production")
	if err != nil {
		t.Fatalf("ListCiliumResources failed: %v", err)
	}
	if !result.Status.Installed || result.Status.Version != "v1.16.0" {
		t.Errorf("unexpected Cilium status: %+v", result.Status)
	}
	if !result.Status.HubbleAvailable || result.Status.HubbleRelayPort != 4245 {
		t.Errorf("unexpected Hubble status: %+v", result.Status)
	}
	if len(result.Policies) != 1 || result.Policies[0].EndpointSelector != "app=web" {
		t.Errorf("unexpected Cilium policies: %+v", result.Policies)
	}
	if len(result.Endpoints) != 1 {
		t.Fatalf("expected 1 Cilium endpoint, got %d", len(result.Endpoints))
	}
	endpoint := result.Endpoints[0]
	if endpoint.PodName != "web-1" || endpoint.IdentityID != 1234 || endpoint.IPv4 != "10.0.0.5" {
		t.Errorf("unexpected Cilium endpoint: %+v", endpoint)
	}
	if endpoint.IngressPolicy != "Enforcing" || endpoint.EgressPolicy != "Off" {
		t.Errorf("unexpected endpoint policy state: %+v", endpoint)
	}
}

func TestFormatStringMapSelector(t *testing.T) {
	formatted := formatStringMapSelector(map[string]string{"tier": "frontend", "app": "web"})
	if formatted != "app=web,tier=frontend" {
		t.Errorf("unexpected selector: %s", formatted)
	}
}

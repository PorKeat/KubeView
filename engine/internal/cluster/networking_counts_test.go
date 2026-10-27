package cluster

import (
	"context"
	"testing"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestListTotalCount(t *testing.T) {
	remaining := int64(39)
	if count := listTotalCount(1, &remaining); count != 40 {
		t.Errorf("expected 40, got %d", count)
	}
	if count := listTotalCount(7, nil); count != 7 {
		t.Errorf("expected 7, got %d", count)
	}
}

func TestGetNetworkingCounts(t *testing.T) {
	typedClient := k8sfake.NewSimpleClientset(
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"}},
		&corev1.Endpoints{ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"}},
		&networkingv1.Ingress{ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"}},
	)

	policyGVK := schema.GroupVersionKind{Group: "cilium.io", Version: "v2", Kind: "CiliumNetworkPolicy"}
	endpointGVK := schema.GroupVersionKind{Group: "cilium.io", Version: "v2", Kind: "CiliumEndpoint"}
	crdGVK := schema.GroupVersionKind{Group: "apiextensions.k8s.io", Version: "v1", Kind: "CustomResourceDefinition"}
	scheme := runtime.NewScheme()
	listKinds := map[schema.GroupVersionResource]string{
		ciliumNetworkPolicyGVR:      "CiliumNetworkPolicyList",
		ciliumEndpointGVR:           "CiliumEndpointList",
		customResourceDefinitionGVR: "CustomResourceDefinitionList",
	}
	scheme.AddKnownTypeWithName(crdGVK, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(crdGVK.GroupVersion().WithKind("CustomResourceDefinitionList"), &unstructured.UnstructuredList{})
	for _, kind := range gatewayAPIKinds {
		for _, version := range kind.Versions {
			gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kind.Resource}
			gvk := schema.GroupVersionKind{Group: gatewayAPIGroup, Version: version, Kind: kind.Kind}
			scheme.AddKnownTypeWithName(gvk, &unstructured.Unstructured{})
			scheme.AddKnownTypeWithName(gvk.GroupVersion().WithKind(kind.Kind+"List"), &unstructured.UnstructuredList{})
			listKinds[gvr] = kind.Kind + "List"
		}
	}
	for _, gvk := range []schema.GroupVersionKind{policyGVK, endpointGVK} {
		scheme.AddKnownTypeWithName(gvk, &unstructured.Unstructured{})
		scheme.AddKnownTypeWithName(gvk.GroupVersion().WithKind(gvk.Kind+"List"), &unstructured.UnstructuredList{})
	}

	gateway := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       "Gateway",
		"metadata":   map[string]interface{}{"name": "edge", "namespace": "production"},
	}}
	policy := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "cilium.io/v2",
		"kind":       "CiliumNetworkPolicy",
		"metadata":   map[string]interface{}{"name": "allow-web", "namespace": "production"},
	}}
	endpoint := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "cilium.io/v2",
		"kind":       "CiliumEndpoint",
		"metadata":   map[string]interface{}{"name": "web", "namespace": "production"},
	}}
	dynamicClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		listKinds,
		gateway,
		policy,
		endpoint,
	)

	dynamicClient.PrependReactor("list", "gateways", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, &unstructured.UnstructuredList{Items: []unstructured.Unstructured{*gateway}}, nil
	})

	manager := newFakeManager(typedClient)
	attachDynamicClient(manager, "test", dynamicClient)
	manager.forwards["pf-active"] = &portForwardSession{info: PortForwardSession{Status: "active"}}
	manager.forwards["pf-stopped"] = &portForwardSession{info: PortForwardSession{Status: "stopped"}}

	counts, err := manager.GetNetworkingCounts(context.Background(), "test", "production")
	if err != nil {
		t.Fatalf("GetNetworkingCounts failed: %v", err)
	}
	if counts.Services != 1 || counts.Endpoints != 1 || counts.Ingresses != 1 || counts.NetworkPolicies != 1 {
		t.Errorf("unexpected core counts: %+v", counts)
	}
	if counts.GatewayResources != 1 || counts.CiliumPolicies != 1 || counts.CiliumEndpoints != 1 {
		t.Errorf("unexpected dynamic counts: %+v", counts)
	}
	if counts.ActivePortForwards != 1 {
		t.Errorf("expected 1 active forward, got %d", counts.ActivePortForwards)
	}
}

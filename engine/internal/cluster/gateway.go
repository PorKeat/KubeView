package cluster

import (
	"context"
	"sort"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

const gatewayAPIGroup = "gateway.networking.k8s.io"

type gatewayAPIKind struct {
	Kind          string
	Resource      string
	ClusterScoped bool
	Versions      []string
}

var gatewayAPIKinds = []gatewayAPIKind{
	{Kind: "GatewayClass", Resource: "gatewayclasses", ClusterScoped: true, Versions: []string{"v1", "v1beta1"}},
	{Kind: "Gateway", Resource: "gateways", Versions: []string{"v1", "v1beta1"}},
	{Kind: "HTTPRoute", Resource: "httproutes", Versions: []string{"v1", "v1beta1"}},
	{Kind: "GRPCRoute", Resource: "grpcroutes", Versions: []string{"v1", "v1beta1"}},
}

// GatewayResourceSummary is a unified display row for Gateway API resources.
type GatewayResourceSummary struct {
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace,omitempty"`
	Status            string            `json:"status"`
	Class             string            `json:"class,omitempty"`
	Hosts             []string          `json:"hosts"`
	Addresses         []string          `json:"addresses"`
	RuleCount         int               `json:"ruleCount"`
	ListenerCount     int               `json:"listenerCount"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

// ApplyGatewayResourceParams carries a YAML manifest to create or update.
type ApplyGatewayResourceParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	YAML        string `json:"yaml"`
}

// DeleteGatewayResourceParams identifies a Gateway API resource to delete.
type DeleteGatewayResourceParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Kind        string `json:"kind"`
	Name        string `json:"name"`
}

// ListGatewayResourcesParams scopes a Gateway API list to a context and namespace.
type ListGatewayResourcesParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListGatewayResourcesResult is the JSON-RPC payload for gatewayresources.list.
type ListGatewayResourcesResult struct {
	Items      []GatewayResourceSummary `json:"items"`
	TotalCount int                      `json:"totalCount"`
	Available  bool                     `json:"available"`
}

func gatewayAPIKindByName(kind string) *gatewayAPIKind {
	for i := range gatewayAPIKinds {
		if gatewayAPIKinds[i].Kind == kind {
			return &gatewayAPIKinds[i]
		}
	}
	return nil
}

// ListGatewayResources lists Gateway API resources when their CRDs are installed.
// Missing CRDs are treated as an empty list rather than an error.
func (m *Manager) ListGatewayResources(ctx context.Context, contextName, namespace string) (*ListGatewayResourcesResult, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	items := make([]GatewayResourceSummary, 0)
	available := false

	for _, kind := range gatewayAPIKinds {
		if kind.ClusterScoped && targetNs != "" {
			continue
		}

		list, listErr := listGatewayResourceKind(ctx, client, kind, targetNs)
		if listErr != nil {
			// The CRD may simply not be installed. A forbidden response still
			// means the API exists, so keep the "available" signal truthful.
			if apierrors.IsForbidden(listErr) {
				available = true
			}
			continue
		}

		available = true
		for i := range list.Items {
			items = append(items, convertGatewayResource(kind.Kind, &list.Items[i]))
		}
	}

	kindRank := map[string]int{"GatewayClass": 0, "Gateway": 1, "HTTPRoute": 2, "GRPCRoute": 3}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Kind != items[j].Kind {
			return kindRank[items[i].Kind] < kindRank[items[j].Kind]
		}
		if items[i].Namespace != items[j].Namespace {
			return items[i].Namespace < items[j].Namespace
		}
		return items[i].Name < items[j].Name
	})

	return &ListGatewayResourcesResult{
		Items:      items,
		TotalCount: len(items),
		Available:  available,
	}, nil
}

func listGatewayResourceKind(ctx context.Context, client dynamic.Interface, kind gatewayAPIKind, namespace string) (*unstructured.UnstructuredList, error) {
	return listGatewayResourceKindWithOptions(ctx, client, kind, namespace, metav1.ListOptions{})
}

func listGatewayResourceKindWithOptions(ctx context.Context, client dynamic.Interface, kind gatewayAPIKind, namespace string, options metav1.ListOptions) (*unstructured.UnstructuredList, error) {
	var lastErr error
	for _, version := range kind.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kind.Resource}
		resource := client.Resource(gvr)
		var list *unstructured.UnstructuredList
		if kind.ClusterScoped {
			list, lastErr = resource.List(ctx, options)
		} else {
			list, lastErr = resource.Namespace(namespace).List(ctx, options)
		}
		if lastErr == nil {
			return list, nil
		}
		if apierrors.IsForbidden(lastErr) {
			return nil, lastErr
		}
	}
	return nil, lastErr
}

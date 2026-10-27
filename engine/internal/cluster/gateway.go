package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"sigs.k8s.io/yaml"
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

func (m *Manager) getDynamicClient(contextName string) (dynamic.Interface, error) {
	m.mu.Lock()
	if contextName == "" {
		contextName = m.currentContext
	}
	if client, exists := m.dynamicClients[contextName]; exists {
		m.mu.Unlock()
		return client, nil
	}
	m.mu.Unlock()

	_, restConfig, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	client, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	m.mu.Lock()
	if m.dynamicClients == nil {
		m.dynamicClients = make(map[string]dynamic.Interface)
	}
	m.dynamicClients[contextName] = client
	m.mu.Unlock()
	return client, nil
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

func convertGatewayResource(kind string, resource *unstructured.Unstructured) GatewayResourceSummary {
	summary := GatewayResourceSummary{
		Kind:              kind,
		Name:              resource.GetName(),
		Namespace:         resource.GetNamespace(),
		Hosts:             make([]string, 0),
		Addresses:         make([]string, 0),
		Labels:            resource.GetLabels(),
		Annotations:       resource.GetAnnotations(),
		Age:               formatAge(time.Since(resource.GetCreationTimestamp().Time)),
		CreationTimestamp: "",
	}
	if !resource.GetCreationTimestamp().Time.IsZero() {
		summary.CreationTimestamp = resource.GetCreationTimestamp().Time.Format(time.RFC3339)
	}

	switch kind {
	case "GatewayClass":
		summary.Class, _, _ = unstructured.NestedString(resource.Object, "spec", "controllerName")
		summary.Status = gatewayClassStatus(resource.Object)
	case "Gateway":
		summary.Class, _, _ = unstructured.NestedString(resource.Object, "spec", "gatewayClassName")
		listeners, _, _ := unstructured.NestedSlice(resource.Object, "spec", "listeners")
		summary.ListenerCount = len(listeners)
		for _, listener := range listeners {
			listenerMap, ok := listener.(map[string]interface{})
			if !ok {
				continue
			}
			hostname, _, _ := unstructured.NestedString(listenerMap, "hostname")
			summary.Hosts = appendUniqueString(summary.Hosts, hostname)
		}
		addresses, _, _ := unstructured.NestedSlice(resource.Object, "status", "addresses")
		for _, address := range addresses {
			addressMap, ok := address.(map[string]interface{})
			if !ok {
				continue
			}
			value, _, _ := unstructured.NestedString(addressMap, "value")
			summary.Addresses = appendUniqueString(summary.Addresses, value)
		}
		summary.Status = gatewayStatus(resource.Object)
	case "HTTPRoute", "GRPCRoute":
		hostnames, _, _ := unstructured.NestedStringSlice(resource.Object, "spec", "hostnames")
		for _, hostname := range hostnames {
			summary.Hosts = appendUniqueString(summary.Hosts, hostname)
		}
		rules, _, _ := unstructured.NestedSlice(resource.Object, "spec", "rules")
		summary.RuleCount = len(rules)
		parentRefs, _, _ := unstructured.NestedSlice(resource.Object, "spec", "parentRefs")
		parents := make([]string, 0, len(parentRefs))
		for _, parentRef := range parentRefs {
			parentMap, ok := parentRef.(map[string]interface{})
			if !ok {
				continue
			}
			name, _, _ := unstructured.NestedString(parentMap, "name")
			parentNamespace, _, _ := unstructured.NestedString(parentMap, "namespace")
			if name == "" {
				continue
			}
			if parentNamespace != "" {
				parents = append(parents, parentNamespace+"/"+name)
			} else {
				parents = append(parents, name)
			}
		}
		summary.Class = strings.Join(parents, ", ")
		summary.Status = gatewayRouteStatus(resource.Object)
	}

	return summary
}

func appendUniqueString(values []string, value string) []string {
	if value == "" {
		return values
	}
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

func gatewayConditionStatus(obj map[string]interface{}, conditionType string) string {
	conditions, _, _ := unstructured.NestedSlice(obj, "status", "conditions")
	for _, condition := range conditions {
		conditionMap, ok := condition.(map[string]interface{})
		if !ok {
			continue
		}
		kind, _, _ := unstructured.NestedString(conditionMap, "type")
		if kind != conditionType {
			continue
		}
		status, _, _ := unstructured.NestedString(conditionMap, "status")
		return status
	}
	return ""
}

func gatewayClassStatus(obj map[string]interface{}) string {
	switch gatewayConditionStatus(obj, "Accepted") {
	case "True":
		return "Accepted"
	case "False":
		return "Not Accepted"
	default:
		return "Unknown"
	}
}

func gatewayStatus(obj map[string]interface{}) string {
	switch gatewayConditionStatus(obj, "Programmed") {
	case "True":
		return "Programmed"
	case "False":
		return "Not Programmed"
	}
	switch gatewayConditionStatus(obj, "Accepted") {
	case "True":
		return "Accepted"
	case "False":
		return "Not Accepted"
	default:
		return "Pending"
	}
}

func gatewayRouteStatus(obj map[string]interface{}) string {
	parents, _, _ := unstructured.NestedSlice(obj, "status", "parents")
	if len(parents) == 0 {
		return "Unknown"
	}

	accepted := false
	denied := false
	for _, parent := range parents {
		parentMap, ok := parent.(map[string]interface{})
		if !ok {
			continue
		}
		conditions, _, _ := unstructured.NestedSlice(parentMap, "conditions")
		for _, condition := range conditions {
			conditionMap, ok := condition.(map[string]interface{})
			if !ok {
				continue
			}
			kind, _, _ := unstructured.NestedString(conditionMap, "type")
			if kind != "Accepted" {
				continue
			}
			status, _, _ := unstructured.NestedString(conditionMap, "status")
			switch status {
			case "True":
				accepted = true
			case "False":
				denied = true
			}
		}
	}

	if accepted {
		return "Accepted"
	}
	if denied {
		return "Not Accepted"
	}
	return "Pending"
}

// ApplyGatewayResourceYaml creates or updates a Gateway API resource from YAML.
func (m *Manager) ApplyGatewayResourceYaml(ctx context.Context, contextName, namespace, yamlText string) (*GatewayResourceSummary, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}

	resource := &unstructured.Unstructured{Object: map[string]interface{}{}}
	if err := yaml.Unmarshal([]byte(yamlText), &resource.Object); err != nil {
		return nil, fmt.Errorf("invalid YAML: %w", err)
	}

	kind := resource.GetKind()
	kindInfo := gatewayAPIKindByName(kind)
	if kindInfo == nil {
		return nil, fmt.Errorf("unsupported Gateway API kind %q", kind)
	}
	if resource.GetName() == "" {
		return nil, fmt.Errorf("metadata.name is required")
	}
	if resource.GetAPIVersion() == "" {
		resource.SetAPIVersion(gatewayAPIGroup + "/v1")
	}
	if !strings.HasPrefix(resource.GetAPIVersion(), gatewayAPIGroup+"/") {
		return nil, fmt.Errorf("apiVersion must belong to %s", gatewayAPIGroup)
	}

	targetNs := strings.TrimSpace(namespace)
	if targetNs == "all" || targetNs == "Cluster Scope" {
		targetNs = ""
	}
	if !kindInfo.ClusterScoped {
		if targetNs == "" {
			targetNs = resource.GetNamespace()
		}
		if targetNs == "" {
			targetNs = "default"
		}
		resource.SetNamespace(targetNs)
	} else {
		resource.SetNamespace("")
	}

	var applied *unstructured.Unstructured
	var lastErr error
	for _, version := range kindInfo.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kindInfo.Resource}
		var interfaceForVersion dynamic.ResourceInterface = client.Resource(gvr)
		if !kindInfo.ClusterScoped {
			interfaceForVersion = client.Resource(gvr).Namespace(targetNs)
		}

		existing, getErr := interfaceForVersion.Get(ctx, resource.GetName(), metav1.GetOptions{})
		if getErr == nil {
			resource.SetResourceVersion(existing.GetResourceVersion())
			applied, lastErr = interfaceForVersion.Update(ctx, resource, metav1.UpdateOptions{FieldManager: "kubeview"})
			if lastErr == nil {
				break
			}
			continue
		}
		if apierrors.IsNotFound(getErr) {
			applied, lastErr = interfaceForVersion.Create(ctx, resource, metav1.CreateOptions{FieldManager: "kubeview"})
			if lastErr == nil {
				break
			}
			continue
		}
		lastErr = getErr
		if apierrors.IsForbidden(getErr) {
			break
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("failed to apply %s %s: %w", kind, resource.GetName(), lastErr)
	}

	summary := convertGatewayResource(kind, applied)
	return &summary, nil
}

// DeleteGatewayResource removes a Gateway API resource.
func (m *Manager) DeleteGatewayResource(ctx context.Context, contextName, namespace, kind, name string) error {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return err
	}

	kindInfo := gatewayAPIKindByName(kind)
	if kindInfo == nil {
		return fmt.Errorf("unsupported Gateway API kind %q", kind)
	}

	targetNs := strings.TrimSpace(namespace)
	if targetNs == "all" || targetNs == "Cluster Scope" {
		targetNs = ""
	}
	if !kindInfo.ClusterScoped && targetNs == "" {
		targetNs = "default"
	}

	var lastErr error
	for _, version := range kindInfo.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kindInfo.Resource}
		var interfaceForVersion dynamic.ResourceInterface = client.Resource(gvr)
		if !kindInfo.ClusterScoped {
			interfaceForVersion = client.Resource(gvr).Namespace(targetNs)
		}
		err := interfaceForVersion.Delete(ctx, name, metav1.DeleteOptions{})
		if err == nil || apierrors.IsNotFound(err) {
			return nil
		}
		lastErr = err
		if apierrors.IsForbidden(err) {
			return err
		}
	}
	return fmt.Errorf("failed to delete %s %s: %w", kind, name, lastErr)
}

// GetGatewayResourceYaml exports a live Gateway API resource manifest as YAML.
func (m *Manager) GetGatewayResourceYaml(ctx context.Context, contextName, namespace, kind, name string) (*PodYamlResult, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}

	kindInfo := gatewayAPIKindByName(kind)
	if kindInfo == nil {
		return nil, fmt.Errorf("unsupported Gateway API kind %q", kind)
	}

	var resource *unstructured.Unstructured
	var lastErr error
	for _, version := range kindInfo.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kindInfo.Resource}
		if kindInfo.ClusterScoped {
			resource, lastErr = client.Resource(gvr).Get(ctx, name, metav1.GetOptions{})
		} else {
			resource, lastErr = client.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
		}
		if lastErr == nil {
			break
		}
		if apierrors.IsForbidden(lastErr) {
			return nil, lastErr
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("failed to get %s %s: %w", kind, name, lastErr)
	}

	unstructured.RemoveNestedField(resource.Object, "metadata", "managedFields")
	resource.SetKind(kind)
	if resource.GetAPIVersion() == "" {
		resource.SetAPIVersion(gatewayAPIGroup + "/v1")
	}

	data, err := yaml.Marshal(resource.Object)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal %s to YAML: %w", kind, err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

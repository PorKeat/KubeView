package cluster

import (
	"context"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

var (
	ciliumNetworkPolicyGVR = schema.GroupVersionResource{Group: "cilium.io", Version: "v2", Resource: "ciliumnetworkpolicies"}
	ciliumEndpointGVR      = schema.GroupVersionResource{Group: "cilium.io", Version: "v2", Resource: "ciliumendpoints"}
)

// CiliumStatus describes Cilium and Hubble availability.
type CiliumStatus struct {
	Installed          bool   `json:"installed"`
	Version            string `json:"version,omitempty"`
	NetworkPolicyCount int    `json:"networkPolicyCount"`
	EndpointCount      int    `json:"endpointCount"`
	HubbleAvailable    bool   `json:"hubbleAvailable"`
	HubbleRelayService string `json:"hubbleRelayService,omitempty"`
	HubbleRelayPort    int    `json:"hubbleRelayPort,omitempty"`
	Message            string `json:"message,omitempty"`
}

// CiliumNetworkPolicySummary is a display-ready CiliumNetworkPolicy row.
type CiliumNetworkPolicySummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	EndpointSelector  string            `json:"endpointSelector"`
	IngressRules      int               `json:"ingressRules"`
	EgressRules       int               `json:"egressRules"`
	Status            string            `json:"status"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

// CiliumEndpointSummary is a display-ready CiliumEndpoint row.
type CiliumEndpointSummary struct {
	Name              string `json:"name"`
	Namespace         string `json:"namespace"`
	PodName           string `json:"podName"`
	IdentityID        int64  `json:"identityId"`
	State             string `json:"state"`
	IPv4              string `json:"ipv4,omitempty"`
	IPv6              string `json:"ipv6,omitempty"`
	IngressPolicy     string `json:"ingressPolicy,omitempty"`
	EgressPolicy      string `json:"egressPolicy,omitempty"`
	Age               string `json:"age"`
	CreationTimestamp string `json:"creationTimestamp"`
}

// ListCiliumResourcesResult is returned by cilium.list.
type ListCiliumResourcesResult struct {
	Policies  []CiliumNetworkPolicySummary `json:"policies"`
	Endpoints []CiliumEndpointSummary      `json:"endpoints"`
	Status    CiliumStatus                 `json:"status"`
}

// ListCiliumResources lists Cilium policies, endpoints and integration status.
func (m *Manager) ListCiliumResources(ctx context.Context, contextName, namespace string) (*ListCiliumResourcesResult, error) {
	dynamicClient, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}
	typedClient, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	policies := make([]CiliumNetworkPolicySummary, 0)
	endpoints := make([]CiliumEndpointSummary, 0)
	policiesAvailable := false
	endpointsAvailable := false

	if policyList, listErr := dynamicClient.Resource(ciliumNetworkPolicyGVR).Namespace(targetNs).List(ctx, metav1.ListOptions{}); listErr == nil {
		policiesAvailable = true
		for i := range policyList.Items {
			policies = append(policies, convertCiliumNetworkPolicy(&policyList.Items[i]))
		}
	}
	if endpointList, listErr := dynamicClient.Resource(ciliumEndpointGVR).Namespace(targetNs).List(ctx, metav1.ListOptions{}); listErr == nil {
		endpointsAvailable = true
		for i := range endpointList.Items {
			endpoints = append(endpoints, convertCiliumEndpoint(&endpointList.Items[i]))
		}
	}

	sort.Slice(policies, func(i, j int) bool {
		if policies[i].Namespace == policies[j].Namespace {
			return policies[i].Name < policies[j].Name
		}
		return policies[i].Namespace < policies[j].Namespace
	})
	sort.Slice(endpoints, func(i, j int) bool {
		if endpoints[i].Namespace == endpoints[j].Namespace {
			return endpoints[i].Name < endpoints[j].Name
		}
		return endpoints[i].Namespace < endpoints[j].Namespace
	})

	status := detectCiliumStatus(ctx, typedClient, policiesAvailable || endpointsAvailable, len(policies), len(endpoints))
	return &ListCiliumResourcesResult{Policies: policies, Endpoints: endpoints, Status: status}, nil
}

func detectCiliumStatus(ctx context.Context, client kubernetes.Interface, resourcesAvailable bool, policyCount, endpointCount int) CiliumStatus {
	status := CiliumStatus{
		Installed:          resourcesAvailable,
		NetworkPolicyCount: policyCount,
		EndpointCount:      endpointCount,
	}

	pods, err := client.CoreV1().Pods("kube-system").List(ctx, metav1.ListOptions{LabelSelector: "k8s-app=cilium"})
	if err == nil && len(pods.Items) > 0 {
		status.Installed = true
		status.Version = ciliumVersionFromPod(&pods.Items[0])
	}
	if !status.Installed {
		status.Message = "Cilium CRDs and agent pods were not detected."
		return status
	}

	relay, relayErr := client.CoreV1().Services("kube-system").Get(ctx, "hubble-relay", metav1.GetOptions{})
	if relayErr == nil {
		status.HubbleAvailable = true
		status.HubbleRelayService = "kube-system/hubble-relay"
		status.HubbleRelayPort = hubbleRelayPort(relay)
	} else {
		status.Message = "Cilium is installed but the hubble-relay Service was not found."
	}
	return status
}

func ciliumVersionFromPod(pod *corev1.Pod) string {
	for _, container := range pod.Spec.Containers {
		if container.Name != "cilium-agent" && container.Name != "cilium" {
			continue
		}
		image := container.Image
		if index := strings.LastIndex(image, ":"); index >= 0 && index > strings.LastIndex(image, "/") {
			return image[index+1:]
		}
		return image
	}
	if len(pod.Spec.Containers) > 0 {
		image := pod.Spec.Containers[0].Image
		if index := strings.LastIndex(image, ":"); index >= 0 && index > strings.LastIndex(image, "/") {
			return image[index+1:]
		}
	}
	return ""
}

func hubbleRelayPort(service *corev1.Service) int {
	for _, port := range service.Spec.Ports {
		if port.Name == "grpc" || port.Port == 4245 {
			return int(port.Port)
		}
	}
	if len(service.Spec.Ports) > 0 {
		return int(service.Spec.Ports[0].Port)
	}
	return 4245
}

func convertCiliumNetworkPolicy(policy *unstructured.Unstructured) CiliumNetworkPolicySummary {
	creation := ""
	if !policy.GetCreationTimestamp().Time.IsZero() {
		creation = policy.GetCreationTimestamp().Time.Format(time.RFC3339)
	}
	ingress, _, _ := unstructured.NestedSlice(policy.Object, "spec", "ingress")
	egress, _, _ := unstructured.NestedSlice(policy.Object, "spec", "egress")
	selectorMap, _, _ := unstructured.NestedStringMap(policy.Object, "spec", "endpointSelector", "matchLabels")
	selector := "all endpoints"
	if len(selectorMap) > 0 {
		selector = formatStringMapSelector(selectorMap)
	}
	status := "No Rules"
	if len(ingress)+len(egress) > 0 {
		status = "Enforcing"
	}
	return CiliumNetworkPolicySummary{
		Name:              policy.GetName(),
		Namespace:         policy.GetNamespace(),
		EndpointSelector:  selector,
		IngressRules:      len(ingress),
		EgressRules:       len(egress),
		Status:            status,
		Age:               formatAge(time.Since(policy.GetCreationTimestamp().Time)),
		CreationTimestamp: creation,
		Labels:            policy.GetLabels(),
		Annotations:       policy.GetAnnotations(),
	}
}

func convertCiliumEndpoint(endpoint *unstructured.Unstructured) CiliumEndpointSummary {
	creation := ""
	if !endpoint.GetCreationTimestamp().Time.IsZero() {
		creation = endpoint.GetCreationTimestamp().Time.Format(time.RFC3339)
	}
	identityID, _, _ := unstructured.NestedInt64(endpoint.Object, "status", "identity", "id")
	state, _, _ := unstructured.NestedString(endpoint.Object, "status", "state")
	podName, _, _ := unstructured.NestedString(endpoint.Object, "status", "external-identifiers", "pod-name")
	if podName == "" {
		podName = endpoint.GetName()
	}
	if slash := strings.LastIndex(podName, "/"); slash >= 0 {
		podName = podName[slash+1:]
	}
	addresses, _, _ := unstructured.NestedSlice(endpoint.Object, "status", "networking", "addressing")
	ipv4 := ""
	ipv6 := ""
	for _, address := range addresses {
		addressMap, ok := address.(map[string]interface{})
		if !ok {
			continue
		}
		if value, _, _ := unstructured.NestedString(addressMap, "ipv4"); value != "" {
			ipv4 = value
		}
		if value, _, _ := unstructured.NestedString(addressMap, "ipv6"); value != "" {
			ipv6 = value
		}
	}
	ingressPolicy, _, _ := unstructured.NestedBool(endpoint.Object, "status", "policy", "ingress", "enforcing")
	egressPolicy, _, _ := unstructured.NestedBool(endpoint.Object, "status", "policy", "egress", "enforcing")
	return CiliumEndpointSummary{
		Name:              endpoint.GetName(),
		Namespace:         endpoint.GetNamespace(),
		PodName:           podName,
		IdentityID:        identityID,
		State:             state,
		IPv4:              ipv4,
		IPv6:              ipv6,
		IngressPolicy:     enforcementLabel(ingressPolicy),
		EgressPolicy:      enforcementLabel(egressPolicy),
		Age:               formatAge(time.Since(endpoint.GetCreationTimestamp().Time)),
		CreationTimestamp: creation,
	}
}

func enforcementLabel(enforcing bool) string {
	if enforcing {
		return "Enforcing"
	}
	return "Off"
}

func formatStringMapSelector(values map[string]string) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+values[key])
	}
	return strings.Join(parts, ",")
}

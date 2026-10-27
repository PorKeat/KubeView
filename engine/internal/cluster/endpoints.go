package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// EndpointAddressSummary is a display-ready endpoint address.
type EndpointAddressSummary struct {
	IP         string `json:"ip"`
	Hostname   string `json:"hostname,omitempty"`
	NodeName   string `json:"nodeName,omitempty"`
	TargetKind string `json:"targetKind,omitempty"`
	TargetName string `json:"targetName,omitempty"`
	Ready      bool   `json:"ready"`
}

// EndpointPortSummary is a display-ready endpoint port.
type EndpointPortSummary struct {
	Name     string `json:"name,omitempty"`
	Protocol string `json:"protocol"`
	Port     int32  `json:"port"`
}

// EndpointsSummary provides display-ready metadata for the endpoints list.
type EndpointsSummary struct {
	Name              string                   `json:"name"`
	Namespace         string                   `json:"namespace"`
	Status            string                   `json:"status"`
	Addresses         []EndpointAddressSummary `json:"addresses"`
	Ports             []EndpointPortSummary    `json:"ports"`
	ReadyCount        int                      `json:"readyCount"`
	NotReadyCount     int                      `json:"notReadyCount"`
	Age               string                   `json:"age"`
	CreationTimestamp string                   `json:"creationTimestamp"`
	Labels            map[string]string        `json:"labels,omitempty"`
	Annotations       map[string]string        `json:"annotations,omitempty"`
}

// ListEndpointsParams scopes an endpoints list to a context and namespace.
type ListEndpointsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListEndpointsResult is the JSON-RPC payload for endpoints.list.
type ListEndpointsResult struct {
	Items      []EndpointsSummary `json:"items"`
	TotalCount int                `json:"totalCount"`
}

// ListEndpoints queries endpoints in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListEndpoints(ctx context.Context, contextName, namespace string) (*ListEndpointsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	endpointList, err := client.CoreV1().Endpoints(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list endpoints: %w", err)
	}

	items := make([]EndpointsSummary, 0, len(endpointList.Items))
	for i := range endpointList.Items {
		items = append(items, convertEndpointsToSummary(&endpointList.Items[i]))
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListEndpointsResult{Items: items, TotalCount: len(items)}, nil
}

// convertEndpointsToSummary transforms a client-go Endpoints into a UI-ready row.
func convertEndpointsToSummary(endpoints *corev1.Endpoints) EndpointsSummary {
	addresses := make([]EndpointAddressSummary, 0)
	ports := make([]EndpointPortSummary, 0)
	seenPorts := make(map[string]struct{})
	readyCount := 0
	notReadyCount := 0

	for _, subset := range endpoints.Subsets {
		for _, address := range subset.Addresses {
			addresses = append(addresses, convertEndpointAddress(address, true))
			readyCount++
		}
		for _, address := range subset.NotReadyAddresses {
			addresses = append(addresses, convertEndpointAddress(address, false))
			notReadyCount++
		}
		for _, port := range subset.Ports {
			protocol := string(port.Protocol)
			if protocol == "" {
				protocol = string(corev1.ProtocolTCP)
			}
			key := fmt.Sprintf("%s/%s/%d", port.Name, protocol, port.Port)
			if _, exists := seenPorts[key]; exists {
				continue
			}
			seenPorts[key] = struct{}{}
			ports = append(ports, EndpointPortSummary{
				Name:     port.Name,
				Protocol: protocol,
				Port:     port.Port,
			})
		}
	}

	status := "Empty"
	if readyCount > 0 {
		status = "Ready"
	} else if notReadyCount > 0 {
		status = "Not Ready"
	}

	creation := ""
	if !endpoints.CreationTimestamp.IsZero() {
		creation = endpoints.CreationTimestamp.Time.Format(time.RFC3339)
	}

	return EndpointsSummary{
		Name:              endpoints.Name,
		Namespace:         endpoints.Namespace,
		Status:            status,
		Addresses:         addresses,
		Ports:             ports,
		ReadyCount:        readyCount,
		NotReadyCount:     notReadyCount,
		Age:               formatAge(time.Since(endpoints.CreationTimestamp.Time)),
		CreationTimestamp: creation,
		Labels:            endpoints.Labels,
		Annotations:       endpoints.Annotations,
	}
}

func convertEndpointAddress(address corev1.EndpointAddress, ready bool) EndpointAddressSummary {
	summary := EndpointAddressSummary{
		IP:       address.IP,
		Hostname: address.Hostname,
		Ready:    ready,
	}
	if address.NodeName != nil {
		summary.NodeName = *address.NodeName
	}
	if address.TargetRef != nil {
		summary.TargetKind = address.TargetRef.Kind
		summary.TargetName = address.TargetRef.Name
	}
	return summary
}

// GetEndpointsYaml exports the live Endpoints manifest as YAML.
func (m *Manager) GetEndpointsYaml(ctx context.Context, contextName, namespace, endpointsName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	endpoints, err := client.CoreV1().Endpoints(namespace).Get(ctx, endpointsName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get endpoints %s: %w", endpointsName, err)
	}

	endpoints.TypeMeta = metav1.TypeMeta{APIVersion: "v1", Kind: "Endpoints"}
	endpoints.ManagedFields = nil

	data, err := yaml.Marshal(endpoints)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal endpoints to YAML: %w", err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

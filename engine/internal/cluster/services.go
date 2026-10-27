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

// ServicePortSummary is a display-ready service port.
type ServicePortSummary struct {
	Name       string `json:"name,omitempty"`
	Protocol   string `json:"protocol"`
	Port       int32  `json:"port"`
	TargetPort string `json:"targetPort,omitempty"`
	NodePort   int32  `json:"nodePort,omitempty"`
}

// ServiceSummary provides display-ready metadata for the service list.
type ServiceSummary struct {
	Name              string               `json:"name"`
	Namespace         string               `json:"namespace"`
	Type              string               `json:"type"`
	Status            string               `json:"status"`
	ReadyEndpoints    int                  `json:"readyEndpoints"`
	TotalEndpoints    int                  `json:"totalEndpoints"`
	ClusterIP         string               `json:"clusterIP,omitempty"`
	ClusterIPs        []string             `json:"clusterIPs,omitempty"`
	ExternalName      string               `json:"externalName,omitempty"`
	ExternalIPs       []string             `json:"externalIPs,omitempty"`
	LoadBalancerIPs   []string             `json:"loadBalancerIPs,omitempty"`
	Ports             []ServicePortSummary `json:"ports"`
	Selector          map[string]string    `json:"selector,omitempty"`
	SessionAffinity   string               `json:"sessionAffinity,omitempty"`
	Age               string               `json:"age"`
	CreationTimestamp string               `json:"creationTimestamp"`
	Labels            map[string]string    `json:"labels,omitempty"`
	Annotations       map[string]string    `json:"annotations,omitempty"`
}

// ListServicesParams scopes a service list to a context and namespace.
type ListServicesParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListServicesResult is the JSON-RPC payload for services.list.
type ListServicesResult struct {
	Items      []ServiceSummary `json:"items"`
	TotalCount int              `json:"totalCount"`
}

// ListServices queries services in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListServices(ctx context.Context, contextName, namespace string) (*ListServicesResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	serviceList, err := client.CoreV1().Services(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	// One endpoints listing lets every service row report live ready-address
	// counts without issuing a request per service.
	endpointReady := make(map[string]int)
	endpointTotal := make(map[string]int)
	endpointsAvailable := false
	if endpointList, endpointErr := client.CoreV1().Endpoints(targetNs).List(ctx, metav1.ListOptions{}); endpointErr == nil {
		endpointsAvailable = true
		for i := range endpointList.Items {
			endpoint := &endpointList.Items[i]
			key := endpoint.Namespace + "/" + endpoint.Name
			ready := 0
			total := 0
			for _, subset := range endpoint.Subsets {
				ready += len(subset.Addresses)
				total += len(subset.Addresses) + len(subset.NotReadyAddresses)
			}
			endpointReady[key] = ready
			endpointTotal[key] = total
		}
	}

	items := make([]ServiceSummary, 0, len(serviceList.Items))
	for i := range serviceList.Items {
		summary := convertServiceToSummary(&serviceList.Items[i])
		key := summary.Namespace + "/" + summary.Name
		applyServiceEndpointStatus(&summary, endpointReady[key], endpointTotal[key], endpointsAvailable)
		items = append(items, summary)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListServicesResult{Items: items, TotalCount: len(items)}, nil
}

// applyServiceEndpointStatus records endpoint readiness and downgrades a
// service that has no ready addresses. If the endpoints listing was forbidden
// or failed, the service status is left untouched.
func applyServiceEndpointStatus(summary *ServiceSummary, readyEndpoints, totalEndpoints int, endpointsAvailable bool) {
	summary.ReadyEndpoints = readyEndpoints
	summary.TotalEndpoints = totalEndpoints
	if !endpointsAvailable {
		return
	}
	if summary.Status == "Active" &&
		summary.Type != string(corev1.ServiceTypeExternalName) &&
		readyEndpoints == 0 {
		summary.Status = "No Endpoints"
	}
}

// convertServiceToSummary transforms a client-go Service into a UI-ready row.
func convertServiceToSummary(svc *corev1.Service) ServiceSummary {
	svcType := string(svc.Spec.Type)
	if svcType == "" {
		svcType = string(corev1.ServiceTypeClusterIP)
	}

	status := "Active"
	if svc.Spec.Type == corev1.ServiceTypeLoadBalancer && len(svc.Status.LoadBalancer.Ingress) == 0 {
		status = "Pending"
	}
	if svc.DeletionTimestamp != nil {
		status = "Terminating"
	}

	ports := make([]ServicePortSummary, 0, len(svc.Spec.Ports))
	for _, port := range svc.Spec.Ports {
		protocol := string(port.Protocol)
		if protocol == "" {
			protocol = string(corev1.ProtocolTCP)
		}
		ports = append(ports, ServicePortSummary{
			Name:       port.Name,
			Protocol:   protocol,
			Port:       port.Port,
			TargetPort: port.TargetPort.String(),
			NodePort:   port.NodePort,
		})
	}

	loadBalancerIPs := make([]string, 0, len(svc.Status.LoadBalancer.Ingress))
	for _, ingress := range svc.Status.LoadBalancer.Ingress {
		if ingress.IP != "" {
			loadBalancerIPs = append(loadBalancerIPs, ingress.IP)
		} else if ingress.Hostname != "" {
			loadBalancerIPs = append(loadBalancerIPs, ingress.Hostname)
		}
	}

	selector := make(map[string]string, len(svc.Spec.Selector))
	for key, value := range svc.Spec.Selector {
		selector[key] = value
	}

	creation := ""
	if !svc.CreationTimestamp.IsZero() {
		creation = svc.CreationTimestamp.Time.Format(time.RFC3339)
	}

	return ServiceSummary{
		Name:              svc.Name,
		Namespace:         svc.Namespace,
		Type:              svcType,
		Status:            status,
		ClusterIP:         svc.Spec.ClusterIP,
		ClusterIPs:        svc.Spec.ClusterIPs,
		ExternalName:      svc.Spec.ExternalName,
		ExternalIPs:       svc.Spec.ExternalIPs,
		LoadBalancerIPs:   loadBalancerIPs,
		Ports:             ports,
		Selector:          selector,
		SessionAffinity:   string(svc.Spec.SessionAffinity),
		Age:               formatAge(time.Since(svc.CreationTimestamp.Time)),
		CreationTimestamp: creation,
		Labels:            svc.Labels,
		Annotations:       svc.Annotations,
	}
}

// GetServiceYaml exports the live Service manifest as YAML.
func (m *Manager) GetServiceYaml(ctx context.Context, contextName, namespace, serviceName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	service, err := client.CoreV1().Services(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get service %s: %w", serviceName, err)
	}

	service.TypeMeta = metav1.TypeMeta{APIVersion: "v1", Kind: "Service"}
	service.ManagedFields = nil

	data, err := yaml.Marshal(service)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal service to YAML: %w", err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

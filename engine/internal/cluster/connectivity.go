package cluster

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/util/intstr"
	netutils "k8s.io/apimachinery/pkg/util/net"
	"k8s.io/client-go/kubernetes"
)

// ServiceDiagnosticCheck is one result in a service connectivity report.
type ServiceDiagnosticCheck struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Status  string   `json:"status"` // pass, warning, fail, skipped
	Message string   `json:"message"`
	Details []string `json:"details,omitempty"`
}

// DiagnoseServiceParams identifies a service and optional HTTP probe.
type DiagnoseServiceParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	ServiceName string `json:"serviceName"`
	ProbePort   string `json:"probePort,omitempty"`
	ProbePath   string `json:"probePath,omitempty"`
	ProbeScheme string `json:"probeScheme,omitempty"`
}

// DiagnoseServiceResult is the connectivity report returned to the UI.
type DiagnoseServiceResult struct {
	Service     ServiceSummary           `json:"service"`
	DNSName     string                   `json:"dnsName"`
	Checks      []ServiceDiagnosticCheck `json:"checks"`
	Summary     string                   `json:"summary"`
	GeneratedAt string                   `json:"generatedAt"`
}

// These variables are replaceable in tests so diagnostics do not require a
// reachable cluster DNS server or API proxy.
var serviceDNSLookup = func(ctx context.Context, dnsServer, fqdn string) ([]string, error) {
	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			dialer := net.Dialer{Timeout: 2 * time.Second}
			return dialer.DialContext(ctx, "udp", dnsServer)
		},
	}
	return resolver.LookupHost(ctx, fqdn)
}

var serviceHTTPProbe = func(ctx context.Context, client kubernetes.Interface, namespace, serviceName, scheme, port, path string) (string, error) {
	request := client.CoreV1().RESTClient().Get().
		Namespace(namespace).
		Resource("services").
		SubResource("proxy").
		Name(netutils.JoinSchemeNamePort(scheme, serviceName, port)).
		Suffix(path)
	result := request.Do(ctx)
	statusCode := 0
	result = result.StatusCode(&statusCode)
	body, err := result.Raw()
	return interpretServiceProbe(statusCode, body, err)
}

func classifyServiceProbeFailure(err error) (string, string) {
	if apierrors.IsForbidden(err) {
		return "skipped", "HTTP probe requires services/proxy permission."
	}
	if apierrors.IsNotFound(err) {
		return "skipped", "HTTP probe is unavailable through the API server for this service."
	}
	return "fail", "HTTP probe failed."
}

func interpretServiceProbe(statusCode int, body []byte, err error) (string, error) {
	if statusCode == 401 || statusCode == 403 {
		return "", err
	}
	if err != nil {
		if statusCode > 0 {
			return fmt.Sprintf("HTTP probe reached the service and returned status %d.", statusCode), nil
		}
		return "", err
	}
	if statusCode > 0 {
		return fmt.Sprintf("HTTP probe reached the service with status %d and %d response bytes.", statusCode, len(body)), nil
	}
	return fmt.Sprintf("HTTP probe succeeded with %d response bytes.", len(body)), nil
}

// DiagnoseService runs API-level connectivity checks for a Service.
func (m *Manager) DiagnoseService(ctx context.Context, p DiagnoseServiceParams) (*DiagnoseServiceResult, error) {
	namespace := strings.TrimSpace(p.Namespace)
	if namespace == "" || namespace == "all" {
		return nil, fmt.Errorf("namespace is required")
	}
	if strings.TrimSpace(p.ServiceName) == "" {
		return nil, fmt.Errorf("serviceName is required")
	}

	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	service, err := client.CoreV1().Services(namespace).Get(ctx, p.ServiceName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get service %s: %w", p.ServiceName, err)
	}

	checks := make([]ServiceDiagnosticCheck, 0, 8)
	pods := make([]corev1.Pod, 0)

	if len(service.Spec.Selector) == 0 {
		checks = append(checks, ServiceDiagnosticCheck{
			ID:      "selector",
			Label:   "Pod selector",
			Status:  "warning",
			Message: "Service has no selector, so Endpoints must be managed manually.",
		})
	} else {
		selector := labels.SelectorFromSet(service.Spec.Selector)
		podList, podErr := client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector.String()})
		if podErr != nil {
			checks = append(checks, ServiceDiagnosticCheck{
				ID:      "selector",
				Label:   "Pod selector",
				Status:  "warning",
				Message: "Could not list the pods selected by this Service.",
				Details: []string{podErr.Error()},
			})
		} else {
			pods = podList.Items
			readyCount := 0
			details := make([]string, 0, len(pods))
			for i := range pods {
				podReady := podIsReady(&pods[i])
				if podReady {
					readyCount++
				}
				details = append(details, fmt.Sprintf("%s/%s ready=%t phase=%s", pods[i].Namespace, pods[i].Name, podReady, pods[i].Status.Phase))
			}

			status := "pass"
			message := fmt.Sprintf("%d selected pod(s), %d ready", len(pods), readyCount)
			if len(pods) == 0 {
				status = "fail"
				message = "Service selector does not match any pods."
			} else if readyCount == 0 {
				status = "warning"
				message = "Selected pods exist but none are Ready."
			}
			checks = append(checks, ServiceDiagnosticCheck{
				ID:      "selector",
				Label:   "Pod selector",
				Status:  status,
				Message: message,
				Details: details,
			})
		}
	}

	endpoints, endpointErr := client.CoreV1().Endpoints(namespace).Get(ctx, p.ServiceName, metav1.GetOptions{})
	endpointsAvailable := endpointErr == nil
	if endpointErr != nil {
		checks = append(checks, ServiceDiagnosticCheck{
			ID:      "endpoints",
			Label:   "Endpoints",
			Status:  "fail",
			Message: "Could not read Endpoints for this Service.",
			Details: []string{endpointErr.Error()},
		})
	} else {
		readyCount, notReadyCount := endpointAddressCounts(endpoints)
		status := "pass"
		message := fmt.Sprintf("%d ready address(es), %d not ready", readyCount, notReadyCount)
		if readyCount == 0 {
			status = "fail"
			if notReadyCount > 0 {
				message = fmt.Sprintf("No ready endpoints; %d address(es) are not ready.", notReadyCount)
			} else {
				message = "No endpoint addresses are registered."
			}
		}
		checks = append(checks, ServiceDiagnosticCheck{
			ID:      "endpoints",
			Label:   "Endpoints",
			Status:  status,
			Message: message,
			Details: endpointAddressDetails(endpoints),
		})
	}

	checks = append(checks, checkServicePortMapping(service, endpoints, pods, endpointsAvailable))
	checks = append(checks, checkServiceNetworkPolicies(ctx, client, namespace, pods))

	dnsName := fmt.Sprintf("%s.%s.svc.cluster.local", service.Name, service.Namespace)
	checks = append(checks, checkServiceDNS(ctx, client, dnsName))

	scheme := strings.ToLower(strings.TrimSpace(p.ProbeScheme))
	if scheme == "" {
		scheme = "http"
	}
	if scheme != "http" && scheme != "https" {
		checks = append(checks, ServiceDiagnosticCheck{
			ID:      "http",
			Label:   "HTTP probe",
			Status:  "skipped",
			Message: "Probe scheme must be http or https.",
		})
	} else if service.Spec.Type == corev1.ServiceTypeExternalName {
		checks = append(checks, ServiceDiagnosticCheck{
			ID:      "http",
			Label:   "HTTP probe",
			Status:  "skipped",
			Message: "HTTP proxy probes are not available for ExternalName services.",
		})
	} else {
		probePort := strings.TrimSpace(p.ProbePort)
		if probePort == "" {
			probePort = defaultServiceProbePort(service)
		}
		probePath := strings.TrimSpace(p.ProbePath)
		if probePath == "" {
			probePath = "/"
		}
		if probePort == "" {
			checks = append(checks, ServiceDiagnosticCheck{
				ID:      "http",
				Label:   "HTTP probe",
				Status:  "skipped",
				Message: "Service exposes no ports to probe.",
			})
		} else {
			probeCtx, cancel := context.WithTimeout(ctx, 6*time.Second)
			message, probeErr := serviceHTTPProbe(probeCtx, client, namespace, service.Name, scheme, probePort, probePath)
			cancel()
			if probeErr != nil {
				status, message := classifyServiceProbeFailure(probeErr)
				checks = append(checks, ServiceDiagnosticCheck{
					ID:      "http",
					Label:   "HTTP probe",
					Status:  status,
					Message: message,
					Details: []string{
						fmt.Sprintf("%s://%s:%s%s", scheme, service.Name, probePort, probePath),
						probeErr.Error(),
					},
				})
			} else {
				checks = append(checks, ServiceDiagnosticCheck{
					ID:      "http",
					Label:   "HTTP probe",
					Status:  "pass",
					Message: message,
					Details: []string{fmt.Sprintf("%s://%s:%s%s", scheme, service.Name, probePort, probePath)},
				})
			}
		}
	}

	warnCount, failCount := 0, 0
	for _, check := range checks {
		switch check.Status {
		case "warning":
			warnCount++
		case "fail":
			failCount++
		}
	}
	summary := "Healthy"
	if failCount > 0 {
		summary = "Failing"
	} else if warnCount > 0 {
		summary = "Degraded"
	}

	return &DiagnoseServiceResult{
		Service:     convertServiceToSummary(service),
		DNSName:     dnsName,
		Checks:      checks,
		Summary:     summary,
		GeneratedAt: time.Now().Format(time.RFC3339),
	}, nil
}

func podIsReady(pod *corev1.Pod) bool {
	if pod.Status.Phase != corev1.PodRunning {
		return false
	}
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func endpointAddressCounts(endpoints *corev1.Endpoints) (int, int) {
	ready := 0
	notReady := 0
	if endpoints == nil {
		return ready, notReady
	}
	for _, subset := range endpoints.Subsets {
		ready += len(subset.Addresses)
		notReady += len(subset.NotReadyAddresses)
	}
	return ready, notReady
}

func endpointAddressDetails(endpoints *corev1.Endpoints) []string {
	if endpoints == nil {
		return nil
	}
	details := make([]string, 0)
	for _, subset := range endpoints.Subsets {
		for _, address := range subset.Addresses {
			details = append(details, fmt.Sprintf("%s ready", address.IP))
		}
		for _, address := range subset.NotReadyAddresses {
			details = append(details, fmt.Sprintf("%s not ready", address.IP))
		}
	}
	return details
}

func resolveNamedContainerPort(pods []corev1.Pod, portName string) (int32, bool) {
	for i := range pods {
		for _, container := range pods[i].Spec.Containers {
			for _, port := range container.Ports {
				if port.Name == portName {
					return port.ContainerPort, true
				}
			}
		}
	}
	return 0, false
}

func checkServicePortMapping(service *corev1.Service, endpoints *corev1.Endpoints, pods []corev1.Pod, endpointsAvailable bool) ServiceDiagnosticCheck {
	if !endpointsAvailable {
		return ServiceDiagnosticCheck{ID: "ports", Label: "Target ports", Status: "skipped", Message: "Endpoints are unavailable, so target ports cannot be compared."}
	}
	if len(service.Spec.Ports) == 0 {
		return ServiceDiagnosticCheck{ID: "ports", Label: "Target ports", Status: "skipped", Message: "Service declares no ports."}
	}

	endpointPorts := make(map[int32]struct{})
	endpointPortNames := make(map[string]struct{})
	hasEndpointPorts := false
	if endpoints != nil {
		for _, subset := range endpoints.Subsets {
			for _, port := range subset.Ports {
				endpointPorts[port.Port] = struct{}{}
				if port.Name != "" {
					endpointPortNames[port.Name] = struct{}{}
				}
				hasEndpointPorts = true
			}
		}
	}
	if !hasEndpointPorts {
		return ServiceDiagnosticCheck{ID: "ports", Label: "Target ports", Status: "fail", Message: "Endpoints register no ports for this Service."}
	}

	failed := false
	details := make([]string, 0, len(service.Spec.Ports))
	for _, port := range service.Spec.Ports {
		target := port.TargetPort
		if target.IntVal == 0 && target.StrVal == "" {
			target = intstr.FromInt32(port.Port)
		}
		matched := false
		if target.Type == intstr.String {
			// Endpoints mirror the Service port name, not the named targetPort.
			if port.Name != "" {
				_, matched = endpointPortNames[port.Name]
			}
			if !matched {
				_, matched = endpointPortNames[target.StrVal]
			}
			if !matched {
				if containerPort, ok := resolveNamedContainerPort(pods, target.StrVal); ok {
					_, matched = endpointPorts[containerPort]
				}
			}
		} else {
			_, matched = endpointPorts[target.IntVal]
		}
		portName := port.Name
		if portName == "" {
			portName = fmt.Sprintf("%d", port.Port)
		}
		if matched {
			details = append(details, fmt.Sprintf("%s: service %d -> target %s matched", portName, port.Port, target.String()))
		} else {
			failed = true
			details = append(details, fmt.Sprintf("%s: service %d -> target %s has no endpoint port", portName, port.Port, target.String()))
		}
	}

	if failed {
		return ServiceDiagnosticCheck{ID: "ports", Label: "Target ports", Status: "fail", Message: "At least one Service port does not map to an endpoint port.", Details: details}
	}
	return ServiceDiagnosticCheck{ID: "ports", Label: "Target ports", Status: "pass", Message: "Every Service port maps to an endpoint port.", Details: details}
}

func checkServiceNetworkPolicies(ctx context.Context, client kubernetes.Interface, namespace string, pods []corev1.Pod) ServiceDiagnosticCheck {
	if len(pods) == 0 {
		return ServiceDiagnosticCheck{ID: "networkpolicy", Label: "NetworkPolicy", Status: "skipped", Message: "No selected pods are available to evaluate against NetworkPolicies."}
	}

	policies, err := client.NetworkingV1().NetworkPolicies(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return ServiceDiagnosticCheck{ID: "networkpolicy", Label: "NetworkPolicy", Status: "warning", Message: "Could not list NetworkPolicies in this namespace.", Details: []string{err.Error()}}
	}

	selecting := make([]networkingv1.NetworkPolicy, 0)
	for i := range policies.Items {
		policy := &policies.Items[i]
		selector, selectorErr := metav1.LabelSelectorAsSelector(&policy.Spec.PodSelector)
		if selectorErr != nil {
			continue
		}
		for j := range pods {
			if selector.Matches(labels.Set(pods[j].Labels)) {
				selecting = append(selecting, *policy)
				break
			}
		}
	}

	if len(selecting) == 0 {
		return ServiceDiagnosticCheck{ID: "networkpolicy", Label: "NetworkPolicy", Status: "pass", Message: "No NetworkPolicies select the Service pods."}
	}

	warnings := 0
	details := make([]string, 0, len(selecting))
	for i := range selecting {
		policy := &selecting[i]
		hasIngress := len(policy.Spec.PolicyTypes) == 0
		hasEgress := false
		for _, policyType := range policy.Spec.PolicyTypes {
			switch policyType {
			case networkingv1.PolicyTypeIngress:
				hasIngress = true
			case networkingv1.PolicyTypeEgress:
				hasEgress = true
			}
		}
		if len(policy.Spec.PolicyTypes) == 0 && len(policy.Spec.Egress) > 0 {
			hasEgress = true
		}

		parts := make([]string, 0, 3)
		if hasIngress {
			if len(policy.Spec.Ingress) == 0 {
				warnings++
				parts = append(parts, "denies all ingress")
			} else {
				parts = append(parts, fmt.Sprintf("%d ingress rule(s)", len(policy.Spec.Ingress)))
			}
		}
		if hasEgress {
			if len(policy.Spec.Egress) == 0 {
				parts = append(parts, "denies all egress")
			} else {
				parts = append(parts, fmt.Sprintf("%d egress rule(s)", len(policy.Spec.Egress)))
			}
		}
		details = append(details, fmt.Sprintf("%s: %s", policy.Name, strings.Join(parts, ", ")))
	}

	if warnings > 0 {
		return ServiceDiagnosticCheck{ID: "networkpolicy", Label: "NetworkPolicy", Status: "warning", Message: fmt.Sprintf("%d policy rule set(s) deny traffic for the selected pods.", warnings), Details: details}
	}
	return ServiceDiagnosticCheck{ID: "networkpolicy", Label: "NetworkPolicy", Status: "pass", Message: fmt.Sprintf("%d NetworkPolicy selects the Service pods and permits traffic.", len(selecting)), Details: details}
}

func checkServiceDNS(ctx context.Context, client kubernetes.Interface, fqdn string) ServiceDiagnosticCheck {
	dnsService, err := client.CoreV1().Services("kube-system").Get(ctx, "kube-dns", metav1.GetOptions{})
	if err != nil {
		dnsService, err = client.CoreV1().Services("kube-system").Get(ctx, "coredns", metav1.GetOptions{})
	}
	if err != nil {
		return ServiceDiagnosticCheck{ID: "dns", Label: "DNS", Status: "skipped", Message: "CoreDNS Service was not found in kube-system.", Details: []string{fqdn}}
	}

	dnsIP := strings.TrimSpace(dnsService.Spec.ClusterIP)
	if dnsIP == "" || dnsIP == "None" {
		return ServiceDiagnosticCheck{ID: "dns", Label: "DNS", Status: "skipped", Message: "CoreDNS has no routable ClusterIP.", Details: []string{fqdn}}
	}

	lookupCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	addresses, lookupErr := serviceDNSLookup(lookupCtx, net.JoinHostPort(dnsIP, "53"), fqdn)
	if lookupErr != nil {
		return ServiceDiagnosticCheck{
			ID:      "dns",
			Label:   "DNS",
			Status:  "warning",
			Message: "Cluster DNS is not reachable from this host; DNS was not verified.",
			Details: []string{fqdn, fmt.Sprintf("server %s: %v", dnsIP, lookupErr)},
		}
	}
	return ServiceDiagnosticCheck{
		ID:      "dns",
		Label:   "DNS",
		Status:  "pass",
		Message: fmt.Sprintf("%s resolved to %s.", fqdn, strings.Join(addresses, ", ")),
	}
}

func defaultServiceProbePort(service *corev1.Service) string {
	if service == nil || len(service.Spec.Ports) == 0 {
		return ""
	}
	port := service.Spec.Ports[0]
	if port.Name != "" {
		return port.Name
	}
	return fmt.Sprintf("%d", port.Port)
}

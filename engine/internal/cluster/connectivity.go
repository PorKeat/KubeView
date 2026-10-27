package cluster

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
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

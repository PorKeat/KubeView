package cluster

import (
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

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

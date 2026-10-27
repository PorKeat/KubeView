package cluster

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
)

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

package cluster

import (
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

func TestConvertNetworkPolicyToSummary(t *testing.T) {
	protocol := corev1.ProtocolTCP
	port := intstr.FromInt32(80)
	policy := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{Name: "web-allow", Namespace: "production"},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{MatchLabels: map[string]string{"app": "web"}},
			Ingress: []networkingv1.NetworkPolicyIngressRule{
				{
					From: []networkingv1.NetworkPolicyPeer{
						{PodSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"role": "frontend"}}},
					},
					Ports: []networkingv1.NetworkPolicyPort{{Protocol: &protocol, Port: &port}},
				},
			},
			Egress: []networkingv1.NetworkPolicyEgressRule{{}},
		},
	}

	summary := convertNetworkPolicyToSummary(policy)

	if summary.Status != "Ingress + Egress" {
		t.Errorf("expected Ingress + Egress status, got %s", summary.Status)
	}
	if summary.PodSelector != "app=web" {
		t.Errorf("expected pod selector app=web, got %s", summary.PodSelector)
	}
	if summary.IngressRules != 1 || summary.EgressRules != 1 {
		t.Errorf("expected 1 ingress and 1 egress rule, got %d/%d", summary.IngressRules, summary.EgressRules)
	}
	if len(summary.Ingress) != 1 || !strings.Contains(summary.Ingress[0], "pod: role=frontend") {
		t.Errorf("unexpected ingress summary: %v", summary.Ingress)
	}
	if !strings.Contains(summary.Ingress[0], "80/TCP") {
		t.Errorf("expected port 80/TCP in ingress summary, got %s", summary.Ingress[0])
	}
}

func TestConvertNetworkPolicyDefaultsToIngressOnly(t *testing.T) {
	policy := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{Name: "default-deny"},
	}
	summary := convertNetworkPolicyToSummary(policy)
	if summary.Status != "Ingress" {
		t.Errorf("expected Ingress default status, got %s", summary.Status)
	}
	if len(summary.PolicyTypes) != 1 || summary.PolicyTypes[0] != "Ingress" {
		t.Errorf("unexpected policy types: %v", summary.PolicyTypes)
	}
}

func TestFormatNetworkPolicyPeerIPBlock(t *testing.T) {
	peer := networkingv1.NetworkPolicyPeer{
		IPBlock: &networkingv1.IPBlock{
			CIDR:   "10.0.0.0/8",
			Except: []string{"10.1.0.0/16"},
		},
	}
	formatted := formatNetworkPolicyPeer(peer)
	if !strings.Contains(formatted, "10.0.0.0/8") || !strings.Contains(formatted, "10.1.0.0/16") {
		t.Errorf("unexpected IP block formatting: %s", formatted)
	}
}

func TestFormatNetworkPolicyPeerEmptyNamespaceSelector(t *testing.T) {
	peer := networkingv1.NetworkPolicyPeer{
		NamespaceSelector: &metav1.LabelSelector{},
	}
	formatted := formatNetworkPolicyPeer(peer)
	if !strings.Contains(formatted, "all namespaces") {
		t.Errorf("expected all namespaces wording, got %s", formatted)
	}
}

func TestNetworkPolicyRuleDetails(t *testing.T) {
	protocol := corev1.ProtocolTCP
	port := intstr.FromInt32(443)
	policy := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{Name: "details", Namespace: "production"},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{MatchLabels: map[string]string{"app": "api"}},
			Ingress: []networkingv1.NetworkPolicyIngressRule{
				{
					From:  []networkingv1.NetworkPolicyPeer{{PodSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"role": "frontend"}}}},
					Ports: []networkingv1.NetworkPolicyPort{{Protocol: &protocol, Port: &port}},
				},
			},
			Egress: []networkingv1.NetworkPolicyEgressRule{{}},
		},
	}

	summary := convertNetworkPolicyToSummary(policy)
	if len(summary.IngressDetails) != 1 || summary.IngressDetails[0].Direction != "Ingress" {
		t.Fatalf("unexpected ingress details: %+v", summary.IngressDetails)
	}
	if len(summary.IngressDetails[0].Peers) != 1 || summary.IngressDetails[0].Peers[0] != "pod: role=frontend" {
		t.Errorf("unexpected ingress peers: %+v", summary.IngressDetails[0].Peers)
	}
	if len(summary.IngressDetails[0].Ports) != 1 || summary.IngressDetails[0].Ports[0] != "443/TCP" {
		t.Errorf("unexpected ingress ports: %+v", summary.IngressDetails[0].Ports)
	}
	if len(summary.EgressDetails) != 1 || summary.EgressDetails[0].Direction != "Egress" {
		t.Fatalf("unexpected egress details: %+v", summary.EgressDetails)
	}
	if summary.EgressDetails[0].Peers[0] != "all destinations" || summary.EgressDetails[0].Ports[0] != "all ports" {
		t.Errorf("unexpected egress defaults: %+v", summary.EgressDetails[0])
	}
}

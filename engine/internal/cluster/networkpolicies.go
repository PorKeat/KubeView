package cluster

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// NetworkPolicyRuleDetail is a structured rule for the inspector matrix.
type NetworkPolicyRuleDetail struct {
	Direction   string   `json:"direction"`
	Peers       []string `json:"peers"`
	Ports       []string `json:"ports"`
	Description string   `json:"description"`
}

// NetworkPolicySummary provides display-ready metadata for the network policy list.
type NetworkPolicySummary struct {
	Name              string                    `json:"name"`
	Namespace         string                    `json:"namespace"`
	Status            string                    `json:"status"`
	PodSelector       string                    `json:"podSelector"`
	PolicyTypes       []string                  `json:"policyTypes"`
	IngressRules      int                       `json:"ingressRules"`
	EgressRules       int                       `json:"egressRules"`
	Ingress           []string                  `json:"ingress"`
	Egress            []string                  `json:"egress"`
	IngressDetails    []NetworkPolicyRuleDetail `json:"ingressDetails"`
	EgressDetails     []NetworkPolicyRuleDetail `json:"egressDetails"`
	Age               string                    `json:"age"`
	CreationTimestamp string                    `json:"creationTimestamp"`
	Labels            map[string]string         `json:"labels,omitempty"`
	Annotations       map[string]string         `json:"annotations,omitempty"`
}

// ListNetworkPoliciesParams scopes a network policy list to a context and namespace.
type ListNetworkPoliciesParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListNetworkPoliciesResult is the JSON-RPC payload for networkpolicies.list.
type ListNetworkPoliciesResult struct {
	Items      []NetworkPolicySummary `json:"items"`
	TotalCount int                    `json:"totalCount"`
}

// ListNetworkPolicies queries network policies in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListNetworkPolicies(ctx context.Context, contextName, namespace string) (*ListNetworkPoliciesResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	policyList, err := client.NetworkingV1().NetworkPolicies(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list network policies: %w", err)
	}

	items := make([]NetworkPolicySummary, 0, len(policyList.Items))
	for i := range policyList.Items {
		items = append(items, convertNetworkPolicyToSummary(&policyList.Items[i]))
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListNetworkPoliciesResult{Items: items, TotalCount: len(items)}, nil
}

// convertNetworkPolicyToSummary transforms a client-go NetworkPolicy into a UI-ready row.
func convertNetworkPolicyToSummary(policy *networkingv1.NetworkPolicy) NetworkPolicySummary {
	policyTypes := make([]string, 0, len(policy.Spec.PolicyTypes))
	for _, policyType := range policy.Spec.PolicyTypes {
		policyTypes = append(policyTypes, string(policyType))
	}
	if len(policyTypes) == 0 {
		policyTypes = append(policyTypes, string(networkingv1.PolicyTypeIngress))
		if len(policy.Spec.Egress) > 0 {
			policyTypes = append(policyTypes, string(networkingv1.PolicyTypeEgress))
		}
	}

	ingress := make([]string, 0, len(policy.Spec.Ingress))
	ingressDetails := make([]NetworkPolicyRuleDetail, 0, len(policy.Spec.Ingress))
	for _, rule := range policy.Spec.Ingress {
		detail := networkPolicyIngressRuleDetail(rule)
		ingress = append(ingress, detail.Description)
		ingressDetails = append(ingressDetails, detail)
	}
	egress := make([]string, 0, len(policy.Spec.Egress))
	egressDetails := make([]NetworkPolicyRuleDetail, 0, len(policy.Spec.Egress))
	for _, rule := range policy.Spec.Egress {
		detail := networkPolicyEgressRuleDetail(rule)
		egress = append(egress, detail.Description)
		egressDetails = append(egressDetails, detail)
	}

	creation := ""
	if !policy.CreationTimestamp.IsZero() {
		creation = policy.CreationTimestamp.Time.Format(time.RFC3339)
	}

	return NetworkPolicySummary{
		Name:              policy.Name,
		Namespace:         policy.Namespace,
		Status:            strings.Join(policyTypes, " + "),
		PodSelector:       formatNetworkPolicySelector(&policy.Spec.PodSelector),
		PolicyTypes:       policyTypes,
		IngressRules:      len(policy.Spec.Ingress),
		EgressRules:       len(policy.Spec.Egress),
		Ingress:           ingress,
		Egress:            egress,
		IngressDetails:    ingressDetails,
		EgressDetails:     egressDetails,
		Age:               formatAge(time.Since(policy.CreationTimestamp.Time)),
		CreationTimestamp: creation,
		Labels:            policy.Labels,
		Annotations:       policy.Annotations,
	}
}

func formatNetworkPolicySelector(selector *metav1.LabelSelector) string {
	// In NetworkPolicy semantics an empty selector selects everything. The
	// Kubernetes label formatter represents it as "<none>", so check emptiness
	// before formatting.
	if selector == nil ||
		(len(selector.MatchLabels) == 0 && len(selector.MatchExpressions) == 0) {
		return "all pods"
	}
	formatted := metav1.FormatLabelSelector(selector)
	if formatted == "" {
		return "all pods"
	}
	if formatted == "<none>" {
		return "no pods"
	}
	return formatted
}

func formatNetworkPolicyPeer(peer networkingv1.NetworkPolicyPeer) string {
	parts := make([]string, 0, 3)
	if peer.PodSelector != nil {
		parts = append(parts, "pod: "+formatNetworkPolicySelector(peer.PodSelector))
	}
	if peer.NamespaceSelector != nil {
		namespaceSelector := formatNetworkPolicySelector(peer.NamespaceSelector)
		switch namespaceSelector {
		case "all pods":
			namespaceSelector = "all namespaces"
		case "no pods":
			namespaceSelector = "no namespaces"
		}
		parts = append(parts, "ns: "+namespaceSelector)
	}
	if peer.IPBlock != nil {
		block := "ipBlock: " + peer.IPBlock.CIDR
		if len(peer.IPBlock.Except) > 0 {
			block += " except " + strings.Join(peer.IPBlock.Except, ", ")
		}
		parts = append(parts, block)
	}
	if len(parts) == 0 {
		return "all sources"
	}
	return strings.Join(parts, ", ")
}

func formatNetworkPolicyPort(port networkingv1.NetworkPolicyPort) string {
	protocol := "TCP"
	if port.Protocol != nil {
		protocol = string(*port.Protocol)
	}
	value := "all ports"
	if port.Port != nil {
		value = port.Port.String()
		if port.EndPort != nil {
			value += "-" + strconv.Itoa(int(*port.EndPort))
		}
	}
	return value + "/" + protocol
}

func networkPolicyIngressRuleDetail(rule networkingv1.NetworkPolicyIngressRule) NetworkPolicyRuleDetail {
	peers := make([]string, 0, len(rule.From))
	for _, peer := range rule.From {
		peers = append(peers, formatNetworkPolicyPeer(peer))
	}
	if len(peers) == 0 {
		peers = append(peers, "all sources")
	}

	ports := make([]string, 0, len(rule.Ports))
	for _, port := range rule.Ports {
		ports = append(ports, formatNetworkPolicyPort(port))
	}
	if len(ports) == 0 {
		ports = append(ports, "all ports")
	}

	return NetworkPolicyRuleDetail{
		Direction:   "Ingress",
		Peers:       peers,
		Ports:       ports,
		Description: fmt.Sprintf("From %s on %s", strings.Join(peers, " | "), strings.Join(ports, ", ")),
	}
}

func networkPolicyEgressRuleDetail(rule networkingv1.NetworkPolicyEgressRule) NetworkPolicyRuleDetail {
	peers := make([]string, 0, len(rule.To))
	for _, peer := range rule.To {
		peers = append(peers, formatNetworkPolicyPeer(peer))
	}
	if len(peers) == 0 {
		peers = append(peers, "all destinations")
	}

	ports := make([]string, 0, len(rule.Ports))
	for _, port := range rule.Ports {
		ports = append(ports, formatNetworkPolicyPort(port))
	}
	if len(ports) == 0 {
		ports = append(ports, "all ports")
	}

	return NetworkPolicyRuleDetail{
		Direction:   "Egress",
		Peers:       peers,
		Ports:       ports,
		Description: fmt.Sprintf("To %s on %s", strings.Join(peers, " | "), strings.Join(ports, ", ")),
	}
}

func formatNetworkPolicyIngressRule(rule networkingv1.NetworkPolicyIngressRule) string {
	peers := make([]string, 0, len(rule.From))
	for _, peer := range rule.From {
		peers = append(peers, formatNetworkPolicyPeer(peer))
	}
	source := "all sources"
	if len(peers) > 0 {
		source = strings.Join(peers, " | ")
	}

	ports := make([]string, 0, len(rule.Ports))
	for _, port := range rule.Ports {
		ports = append(ports, formatNetworkPolicyPort(port))
	}
	portSummary := "all ports"
	if len(ports) > 0 {
		portSummary = strings.Join(ports, ", ")
	}
	return fmt.Sprintf("From %s on %s", source, portSummary)
}

func formatNetworkPolicyEgressRule(rule networkingv1.NetworkPolicyEgressRule) string {
	peers := make([]string, 0, len(rule.To))
	for _, peer := range rule.To {
		peers = append(peers, formatNetworkPolicyPeer(peer))
	}
	destination := "all destinations"
	if len(peers) > 0 {
		destination = strings.Join(peers, " | ")
	}

	ports := make([]string, 0, len(rule.Ports))
	for _, port := range rule.Ports {
		ports = append(ports, formatNetworkPolicyPort(port))
	}
	portSummary := "all ports"
	if len(ports) > 0 {
		portSummary = strings.Join(ports, ", ")
	}
	return fmt.Sprintf("To %s on %s", destination, portSummary)
}

// GetNetworkPolicyYaml exports the live NetworkPolicy manifest as YAML.
func (m *Manager) GetNetworkPolicyYaml(ctx context.Context, contextName, namespace, policyName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	policy, err := client.NetworkingV1().NetworkPolicies(namespace).Get(ctx, policyName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get network policy %s: %w", policyName, err)
	}

	policy.TypeMeta = metav1.TypeMeta{APIVersion: "networking.k8s.io/v1", Kind: "NetworkPolicy"}
	policy.ManagedFields = nil

	data, err := yaml.Marshal(policy)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal network policy to YAML: %w", err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

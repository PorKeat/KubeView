package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CNIInfo describes the detected cluster network plugin and its supported views.
type CNIInfo struct {
	Provider        string   `json:"provider"`
	DisplayName     string   `json:"displayName"`
	Version         string   `json:"version,omitempty"`
	Detected        bool     `json:"detected"`
	DetectionSource string   `json:"detectionSource,omitempty"`
	Capabilities    []string `json:"capabilities"`
}

// NetworkObservabilityResult is the provider-neutral networking overview.
type NetworkObservabilityResult struct {
	CNI                CNIInfo  `json:"cni"`
	NodeCount          int      `json:"nodeCount"`
	ReadyNodeCount     int      `json:"readyNodeCount"`
	PodCount           int      `json:"podCount"`
	RunningPodCount    int      `json:"runningPodCount"`
	ServiceCount       int      `json:"serviceCount"`
	NetworkPolicyCount int      `json:"networkPolicyCount"`
	EndpointSliceCount int      `json:"endpointSliceCount"`
	PodCIDRs           []string `json:"podCidrs"`
	IPFamilies         []string `json:"ipFamilies"`
}

type cniDaemonSetSignal struct {
	Namespace string
	Name      string
	Images    []string
}

type cniPodSignal struct {
	Namespace string
	Name      string
	Images    []string
}

type cniDefinition struct {
	Provider        string
	DisplayName     string
	DaemonSetHints  []string
	AnnotationHints []string
}

var cniDefinitions = []cniDefinition{
	{
		Provider:        "cilium",
		DisplayName:     "Cilium",
		DaemonSetHints:  []string{"cilium"},
		AnnotationHints: []string{"cilium.io/"},
	},
	{
		Provider:        "calico",
		DisplayName:     "Calico",
		DaemonSetHints:  []string{"calico-node", "calico-typha"},
		AnnotationHints: []string{"projectcalico.org/"},
	},
	{
		Provider:        "canal",
		DisplayName:     "Canal",
		DaemonSetHints:  []string{"canal"},
		AnnotationHints: []string{"projectcalico.org/"},
	},
	{
		Provider:        "antrea",
		DisplayName:     "Antrea",
		DaemonSetHints:  []string{"antrea-agent", "antrea-controller"},
		AnnotationHints: []string{"antrea.io/"},
	},
	{
		Provider:        "flannel",
		DisplayName:     "Flannel",
		DaemonSetHints:  []string{"flannel"},
		AnnotationHints: []string{"flannel.alpha.coreos.com/"},
	},
	{
		Provider:        "ovn-kubernetes",
		DisplayName:     "OVN-Kubernetes",
		DaemonSetHints:  []string{"ovnkube-node", "ovn-kubernetes-node", "ovn-node"},
		AnnotationHints: []string{"k8s.ovn.org/"},
	},
	{
		Provider:        "aws-vpc-cni",
		DisplayName:     "Amazon VPC CNI",
		DaemonSetHints:  []string{"aws-node", "aws-vpc-cni"},
		AnnotationHints: []string{"vpc.amazonaws.com/", "k8s.amazonaws.com/"},
	},
	{
		Provider:        "azure-cni",
		DisplayName:     "Azure CNI",
		DaemonSetHints:  []string{"azure-cni", "azure-vnet", "azure-ip-masq"},
		AnnotationHints: []string{"azure.com/", "kubernetes.azure.com/"},
	},
	{
		Provider:        "weave",
		DisplayName:     "Weave Net",
		DaemonSetHints:  []string{"weave-net", "weave"},
		AnnotationHints: []string{"weave.works/"},
	},
	{
		Provider:        "kube-router",
		DisplayName:     "kube-router",
		DaemonSetHints:  []string{"kube-router"},
		AnnotationHints: []string{"kube-router.io/"},
	},
	{
		Provider:        "gke-dataplane",
		DisplayName:     "GKE Dataplane",
		DaemonSetHints:  []string{"anetd", "gke-netd"},
		AnnotationHints: []string{"networking.gke.io/"},
	},
}

// GetNetworkObservability returns CNI detection and generic cluster networking counts.
func (m *Manager) GetNetworkObservability(ctx context.Context, contextName string) (*NetworkObservabilityResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	result := &NetworkObservabilityResult{
		PodCIDRs:   make([]string, 0),
		IPFamilies: make([]string, 0),
	}

	var daemonSetSignals []cniDaemonSetSignal
	if daemonSets, listErr := client.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{}); listErr == nil {
		daemonSetSignals = make([]cniDaemonSetSignal, 0, len(daemonSets.Items))
		for i := range daemonSets.Items {
			daemonSetSignals = append(daemonSetSignals, daemonSetSignal(&daemonSets.Items[i]))
		}
	}

	var nodeAnnotations []map[string]string
	if nodes, listErr := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{}); listErr == nil {
		result.NodeCount = len(nodes.Items)
		seenCIDRs := make(map[string]struct{})
		hasIPv4 := false
		hasIPv6 := false
		for i := range nodes.Items {
			node := &nodes.Items[i]
			nodeAnnotations = append(nodeAnnotations, node.Annotations)
			if nodeReady(node) {
				result.ReadyNodeCount++
			}
			cidrs := append([]string{}, node.Spec.PodCIDRs...)
			if node.Spec.PodCIDR != "" {
				cidrs = append(cidrs, node.Spec.PodCIDR)
			}
			for _, cidr := range cidrs {
				cidr = strings.TrimSpace(cidr)
				if cidr == "" {
					continue
				}
				if _, exists := seenCIDRs[cidr]; !exists {
					seenCIDRs[cidr] = struct{}{}
					result.PodCIDRs = append(result.PodCIDRs, cidr)
				}
				if strings.Contains(cidr, ":") {
					hasIPv6 = true
				} else {
					hasIPv4 = true
				}
			}
		}
		sort.Strings(result.PodCIDRs)
		if hasIPv4 {
			result.IPFamilies = append(result.IPFamilies, "IPv4")
		}
		if hasIPv6 {
			result.IPFamilies = append(result.IPFamilies, "IPv6")
		}
	}

	var podSignals []cniPodSignal
	if pods, listErr := client.CoreV1().Pods("").List(ctx, metav1.ListOptions{}); listErr == nil {
		result.PodCount = len(pods.Items)
		for i := range pods.Items {
			pod := &pods.Items[i]
			if pod.Status.Phase == corev1.PodRunning {
				result.RunningPodCount++
			}
			podSignals = append(podSignals, cniPodSignalFromPod(pod))
		}
	}

	result.CNI = detectCNIFromSignals(daemonSetSignals, podSignals, nodeAnnotations)

	options := metav1.ListOptions{Limit: 1}
	if services, listErr := client.CoreV1().Services("").List(ctx, options); listErr == nil {
		result.ServiceCount = listTotalCount(len(services.Items), services.RemainingItemCount)
	}
	if policies, listErr := client.NetworkingV1().NetworkPolicies("").List(ctx, options); listErr == nil {
		result.NetworkPolicyCount = listTotalCount(len(policies.Items), policies.RemainingItemCount)
	}
	if slices, listErr := client.DiscoveryV1().EndpointSlices("").List(ctx, options); listErr == nil {
		result.EndpointSliceCount = listTotalCount(len(slices.Items), slices.RemainingItemCount)
	}

	return result, nil
}

func daemonSetSignal(daemonSet *appsv1.DaemonSet) cniDaemonSetSignal {
	images := make([]string, 0, len(daemonSet.Spec.Template.Spec.Containers))
	for _, container := range daemonSet.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}
	return cniDaemonSetSignal{
		Namespace: daemonSet.Namespace,
		Name:      daemonSet.Name,
		Images:    images,
	}
}

func cniPodSignalFromPod(pod *corev1.Pod) cniPodSignal {
	images := make([]string, 0, len(pod.Spec.Containers))
	for _, container := range pod.Spec.Containers {
		images = append(images, container.Image)
	}
	return cniPodSignal{
		Namespace: pod.Namespace,
		Name:      pod.Name,
		Images:    images,
	}
}

func detectCNIFromSignals(daemonSets []cniDaemonSetSignal, pods []cniPodSignal, nodeAnnotations []map[string]string) CNIInfo {
	for _, definition := range cniDefinitions {
		for _, daemonSet := range daemonSets {
			if matchesCNIHint(daemonSet.Name, definition.DaemonSetHints) {
				return CNIInfo{
					Provider:        definition.Provider,
					DisplayName:     definition.DisplayName,
					Version:         firstImageTag(daemonSet.Images),
					Detected:        true,
					DetectionSource: fmt.Sprintf("DaemonSet %s/%s", daemonSet.Namespace, daemonSet.Name),
					Capabilities:    cniCapabilities(definition.Provider),
				}
			}
		}
	}
	for _, definition := range cniDefinitions {
		for _, pod := range pods {
			if matchesCNIHint(pod.Name, definition.DaemonSetHints) {
				return CNIInfo{
					Provider:        definition.Provider,
					DisplayName:     definition.DisplayName,
					Version:         firstImageTag(pod.Images),
					Detected:        true,
					DetectionSource: fmt.Sprintf("Pod %s/%s", pod.Namespace, pod.Name),
					Capabilities:    cniCapabilities(definition.Provider),
				}
			}
		}
	}
	for _, definition := range cniDefinitions {
		for _, annotations := range nodeAnnotations {
			for key := range annotations {
				if matchesCNIHint(key, definition.AnnotationHints) {
					return CNIInfo{
						Provider:        definition.Provider,
						DisplayName:     definition.DisplayName,
						Detected:        true,
						DetectionSource: fmt.Sprintf("Node annotations (%s)", definition.DisplayName),
						Capabilities:    cniCapabilities(definition.Provider),
					}
				}
			}
		}
	}
	return CNIInfo{
		Provider:        "generic",
		DisplayName:     "Generic CNI",
		Detected:        false,
		DetectionSource: "No known CNI daemonset or node annotations were found",
		Capabilities:    cniCapabilities("generic"),
	}
}

func matchesCNIHint(value string, hints []string) bool {
	value = strings.ToLower(value)
	for _, hint := range hints {
		if strings.Contains(value, strings.ToLower(hint)) {
			return true
		}
	}
	return false
}

func cniCapabilities(provider string) []string {
	capabilities := []string{
		"overview",
		"standardNetworkPolicies",
		"services",
		"endpointSlices",
	}
	if provider == "cilium" {
		capabilities = append(capabilities, "ciliumPolicies", "ciliumEndpoints", "hubbleFlows")
	}
	return capabilities
}

func firstImageTag(images []string) string {
	for _, image := range images {
		image = strings.TrimSpace(image)
		if image == "" || strings.Contains(image, "@") {
			continue
		}
		if index := strings.LastIndex(image, ":"); index > strings.LastIndex(image, "/") {
			return image[index+1:]
		}
	}
	return ""
}

func nodeReady(node *corev1.Node) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

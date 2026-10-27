package cluster

import (
	"context"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
)

func TestDetectCNIFromSignals(t *testing.T) {
	tests := []struct {
		name        string
		daemonSets  []cniDaemonSetSignal
		pods        []cniPodSignal
		annotations []map[string]string
		wantName    string
		wantDisplay string
		wantVersion string
	}{
		{
			name: "cilium",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "kube-system",
				Name:      "cilium",
				Images:    []string{"quay.io/cilium/cilium:v1.17.0"},
			}},
			wantName:    "cilium",
			wantDisplay: "Cilium",
			wantVersion: "v1.17.0",
		},
		{
			name: "calico",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "kube-system",
				Name:      "calico-node",
				Images:    []string{"docker.io/calico/node:v3.29.0"},
			}},
			wantName:    "calico",
			wantDisplay: "Calico",
			wantVersion: "v3.29.0",
		},
		{
			name: "flannel",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "kube-system",
				Name:      "kube-flannel-ds",
				Images:    []string{"ghcr.io/flannel-io/flannel:v0.26.0"},
			}},
			wantName:    "flannel",
			wantDisplay: "Flannel",
			wantVersion: "v0.26.0",
		},
		{
			name: "antrea",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "kube-system",
				Name:      "antrea-agent",
				Images:    []string{"antrea/antrea-agent:v2.2.0"},
			}},
			wantName:    "antrea",
			wantDisplay: "Antrea",
			wantVersion: "v2.2.0",
		},
		{
			name: "ovn-kubernetes",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "ovn-kubernetes",
				Name:      "ovnkube-node",
				Images:    []string{"ovn-kubernetes:v1.0.0"},
			}},
			wantName:    "ovn-kubernetes",
			wantDisplay: "OVN-Kubernetes",
			wantVersion: "v1.0.0",
		},
		{
			name: "amazon vpc cni",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "kube-system",
				Name:      "aws-node",
				Images:    []string{"602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni:v1.19.0"},
			}},
			wantName:    "aws-vpc-cni",
			wantDisplay: "Amazon VPC CNI",
			wantVersion: "v1.19.0",
		},
		{
			name: "azure cni",
			daemonSets: []cniDaemonSetSignal{{
				Namespace: "kube-system",
				Name:      "azure-cni-networkmonitor",
				Images:    []string{"mcr.microsoft.com/containernetworking/azure-cni:v1.4.0"},
			}},
			wantName:    "azure-cni",
			wantDisplay: "Azure CNI",
			wantVersion: "v1.4.0",
		},
		{
			name: "cilium pod fallback",
			pods: []cniPodSignal{{
				Namespace: "kube-system",
				Name:      "cilium-9rxcn",
				Images:    []string{"quay.io/cilium/cilium:v1.17.1"},
			}},
			wantName:    "cilium",
			wantDisplay: "Cilium",
			wantVersion: "v1.17.1",
		},
		{
			name: "calico node annotation fallback",
			annotations: []map[string]string{{
				"projectcalico.org/IPv4Address": "10.0.0.10/24",
			}},
			wantName:    "calico",
			wantDisplay: "Calico",
		},
		{
			name: "flannel node annotation fallback",
			annotations: []map[string]string{{
				"flannel.alpha.coreos.com/backend-type": "vxlan",
			}},
			wantName:    "flannel",
			wantDisplay: "Flannel",
		},
		{
			name:        "generic fallback",
			wantName:    "generic",
			wantDisplay: "Generic CNI",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := detectCNIFromSignals(test.daemonSets, test.pods, test.annotations)
			if got.Provider != test.wantName {
				t.Fatalf("provider = %q, want %q", got.Provider, test.wantName)
			}
			if got.DisplayName != test.wantDisplay {
				t.Fatalf("displayName = %q, want %q", got.DisplayName, test.wantDisplay)
			}
			if got.Version != test.wantVersion {
				t.Fatalf("version = %q, want %q", got.Version, test.wantVersion)
			}
			if test.wantName != "generic" && !got.Detected {
				t.Fatalf("expected provider %q to be detected", test.wantName)
			}
			if len(got.Capabilities) == 0 {
				t.Fatal("expected capabilities to be populated")
			}
		})
	}
}

func TestGetNetworkObservability(t *testing.T) {
	nodeReadyCondition := []corev1.NodeCondition{{
		Type:   corev1.NodeReady,
		Status: corev1.ConditionTrue,
	}}
	objects := []runtime.Object{
		&appsv1.DaemonSet{
			ObjectMeta: metav1.ObjectMeta{Name: "cilium", Namespace: "kube-system"},
			Spec: appsv1.DaemonSetSpec{Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{
				Containers: []corev1.Container{{Image: "quay.io/cilium/cilium:v1.17.0"}},
			}}},
		},
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{Name: "node1"},
			Spec:       corev1.NodeSpec{PodCIDR: "10.244.1.0/24", PodCIDRs: []string{"10.244.1.0/24"}},
			Status:     corev1.NodeStatus{Conditions: nodeReadyCondition},
		},
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{Name: "node2"},
			Spec:       corev1.NodeSpec{PodCIDR: "fd00:10:244:2::/64", PodCIDRs: []string{"fd00:10:244:2::/64"}},
			Status:     corev1.NodeStatus{Conditions: []corev1.NodeCondition{{Type: corev1.NodeReady, Status: corev1.ConditionFalse}}},
		},
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "default"},
			Status:     corev1.PodStatus{Phase: corev1.PodRunning},
		},
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: "pending", Namespace: "default"},
			Status:     corev1.PodStatus{Phase: corev1.PodPending},
		},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "default"}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "allow-web", Namespace: "default"}},
		&discoveryv1.EndpointSlice{
			ObjectMeta:  metav1.ObjectMeta{Name: "web-abc", Namespace: "default"},
			AddressType: discoveryv1.AddressTypeIPv4,
		},
	}
	client := fake.NewSimpleClientset(objects...)
	manager := newFakeManager(client)

	got, err := manager.GetNetworkObservability(context.Background(), "test")
	if err != nil {
		t.Fatalf("GetNetworkObservability returned error: %v", err)
	}
	if got.CNI.Provider != "cilium" || got.CNI.Version != "v1.17.0" {
		t.Fatalf("unexpected CNI: %+v", got.CNI)
	}
	if got.NodeCount != 2 || got.ReadyNodeCount != 1 {
		t.Fatalf("unexpected node counts: total=%d ready=%d", got.NodeCount, got.ReadyNodeCount)
	}
	if got.PodCount != 2 || got.RunningPodCount != 1 {
		t.Fatalf("unexpected pod counts: total=%d running=%d", got.PodCount, got.RunningPodCount)
	}
	if got.ServiceCount != 1 || got.NetworkPolicyCount != 1 || got.EndpointSliceCount != 1 {
		t.Fatalf("unexpected networking counts: services=%d policies=%d slices=%d", got.ServiceCount, got.NetworkPolicyCount, got.EndpointSliceCount)
	}
	if len(got.PodCIDRs) != 2 {
		t.Fatalf("pod CIDRs = %#v, want 2 entries", got.PodCIDRs)
	}
	if len(got.IPFamilies) != 2 || got.IPFamilies[0] != "IPv4" || got.IPFamilies[1] != "IPv6" {
		t.Fatalf("IP families = %#v, want IPv4 and IPv6", got.IPFamilies)
	}
}

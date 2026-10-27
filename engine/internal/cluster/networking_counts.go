package cluster

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NetworkingCountsResult is the lightweight sidebar badge payload.
type NetworkingCountsResult struct {
	Services            int `json:"services"`
	Endpoints           int `json:"endpoints"`
	Ingresses           int `json:"ingresses"`
	GatewayResources    int `json:"gatewayResources"`
	NetworkPolicies     int `json:"networkPolicies"`
	CiliumPolicies      int `json:"ciliumPolicies"`
	CiliumEndpoints     int `json:"ciliumEndpoints"`
	ActivePortForwards  int `json:"activePortForwards"`
	ConfigMaps          int `json:"configMaps"`
	Secrets             int `json:"secrets"`
	PersistentVolumes   int `json:"persistentVolumes"`
	StorageClasses      int `json:"storageClasses"`
	ServiceAccounts     int `json:"serviceAccounts"`
	Roles               int `json:"roles"`
	ClusterRoles        int `json:"clusterRoles"`
	RoleBindings        int `json:"roleBindings"`
	ClusterRoleBindings int `json:"clusterRoleBindings"`
	CRDs                int `json:"crds"`
}

func listTotalCount(items int, remaining *int64) int {
	if remaining != nil {
		return items + int(*remaining)
	}
	return items
}

// GetNetworkingCounts counts networking resources with one-item list calls.
func (m *Manager) GetNetworkingCounts(ctx context.Context, contextName, namespace string) (*NetworkingCountsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	options := metav1.ListOptions{Limit: 1}
	counts := &NetworkingCountsResult{}

	if list, listErr := client.CoreV1().Services(targetNs).List(ctx, options); listErr == nil {
		counts.Services = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.CoreV1().Endpoints(targetNs).List(ctx, options); listErr == nil {
		counts.Endpoints = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.NetworkingV1().Ingresses(targetNs).List(ctx, options); listErr == nil {
		counts.Ingresses = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.NetworkingV1().NetworkPolicies(targetNs).List(ctx, options); listErr == nil {
		counts.NetworkPolicies = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.CoreV1().ConfigMaps(targetNs).List(ctx, options); listErr == nil {
		counts.ConfigMaps = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.CoreV1().Secrets(targetNs).List(ctx, options); listErr == nil {
		counts.Secrets = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.CoreV1().PersistentVolumes().List(ctx, options); listErr == nil {
		counts.PersistentVolumes = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.StorageV1().StorageClasses().List(ctx, options); listErr == nil {
		counts.StorageClasses = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.CoreV1().ServiceAccounts(targetNs).List(ctx, options); listErr == nil {
		counts.ServiceAccounts = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.RbacV1().Roles(targetNs).List(ctx, options); listErr == nil {
		counts.Roles = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.RbacV1().ClusterRoles().List(ctx, options); listErr == nil {
		counts.ClusterRoles = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.RbacV1().RoleBindings(targetNs).List(ctx, options); listErr == nil {
		counts.RoleBindings = listTotalCount(len(list.Items), list.RemainingItemCount)
	}
	if list, listErr := client.RbacV1().ClusterRoleBindings().List(ctx, options); listErr == nil {
		counts.ClusterRoleBindings = listTotalCount(len(list.Items), list.RemainingItemCount)
	}

	if dynamicClient, dynamicErr := m.getDynamicClient(contextName); dynamicErr == nil {
		for _, kind := range gatewayAPIKinds {
			if kind.ClusterScoped && targetNs != "" {
				continue
			}
			if list, listErr := listGatewayResourceKindWithOptions(ctx, dynamicClient, kind, targetNs, options); listErr == nil {
				counts.GatewayResources += listTotalCount(len(list.Items), list.GetRemainingItemCount())
			}
		}
		if list, listErr := dynamicClient.Resource(ciliumNetworkPolicyGVR).Namespace(targetNs).List(ctx, options); listErr == nil {
			counts.CiliumPolicies = listTotalCount(len(list.Items), list.GetRemainingItemCount())
		}
		if list, listErr := dynamicClient.Resource(ciliumEndpointGVR).Namespace(targetNs).List(ctx, options); listErr == nil {
			counts.CiliumEndpoints = listTotalCount(len(list.Items), list.GetRemainingItemCount())
		}
		if list, listErr := dynamicClient.Resource(customResourceDefinitionGVR).List(ctx, options); listErr == nil {
			counts.CRDs = listTotalCount(len(list.Items), list.GetRemainingItemCount())
		}
	}

	m.forwardsMu.Lock()
	sessions := make([]*portForwardSession, 0, len(m.forwards))
	for _, session := range m.forwards {
		sessions = append(sessions, session)
	}
	m.forwardsMu.Unlock()
	active := 0
	for _, session := range sessions {
		if session.snapshot().Status == "active" {
			active++
		}
	}
	counts.ActivePortForwards = active

	return counts, nil
}

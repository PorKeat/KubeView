package cluster

import (
	"context"
	"sync"

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

	type countJob struct {
		key string
		run func() (int, error)
	}
	type countResult struct {
		key   string
		value int
	}

	jobs := []countJob{
		{"services", func() (int, error) {
			list, err := client.CoreV1().Services(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"endpoints", func() (int, error) {
			list, err := client.CoreV1().Endpoints(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"ingresses", func() (int, error) {
			list, err := client.NetworkingV1().Ingresses(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"networkpolicies", func() (int, error) {
			list, err := client.NetworkingV1().NetworkPolicies(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"configmaps", func() (int, error) {
			list, err := client.CoreV1().ConfigMaps(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"secrets", func() (int, error) {
			list, err := client.CoreV1().Secrets(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"persistentvolumes", func() (int, error) {
			list, err := client.CoreV1().PersistentVolumes().List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"storageclasses", func() (int, error) {
			list, err := client.StorageV1().StorageClasses().List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"serviceaccounts", func() (int, error) {
			list, err := client.CoreV1().ServiceAccounts(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"roles", func() (int, error) {
			list, err := client.RbacV1().Roles(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"clusterroles", func() (int, error) {
			list, err := client.RbacV1().ClusterRoles().List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"rolebindings", func() (int, error) {
			list, err := client.RbacV1().RoleBindings(targetNs).List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
		{"clusterrolebindings", func() (int, error) {
			list, err := client.RbacV1().ClusterRoleBindings().List(ctx, options)
			if err != nil {
				return 0, err
			}
			return listTotalCount(len(list.Items), list.RemainingItemCount), nil
		}},
	}

	if dynamicClient, dynamicErr := m.getDynamicClient(contextName); dynamicErr == nil {
		for _, kind := range gatewayAPIKinds {
			kind := kind
			if kind.ClusterScoped && targetNs != "" {
				continue
			}
			jobs = append(jobs, countJob{"gatewayresources", func() (int, error) {
				list, err := listGatewayResourceKindWithOptions(ctx, dynamicClient, kind, targetNs, options)
				if err != nil {
					return 0, err
				}
				return listTotalCount(len(list.Items), list.GetRemainingItemCount()), nil
			}})
		}
		jobs = append(jobs,
			countJob{"ciliumpolicies", func() (int, error) {
				list, err := dynamicClient.Resource(ciliumNetworkPolicyGVR).Namespace(targetNs).List(ctx, options)
				if err != nil {
					return 0, err
				}
				return listTotalCount(len(list.Items), list.GetRemainingItemCount()), nil
			}},
			countJob{"ciliumendpoints", func() (int, error) {
				list, err := dynamicClient.Resource(ciliumEndpointGVR).Namespace(targetNs).List(ctx, options)
				if err != nil {
					return 0, err
				}
				return listTotalCount(len(list.Items), list.GetRemainingItemCount()), nil
			}},
			countJob{"crds", func() (int, error) {
				list, err := dynamicClient.Resource(customResourceDefinitionGVR).List(ctx, options)
				if err != nil {
					return 0, err
				}
				return listTotalCount(len(list.Items), list.GetRemainingItemCount()), nil
			}},
		)
	}

	// Run the independent list calls concurrently. The previous sequential
	// implementation took ~2s on a busy cluster for what is only badge data.
	results := make(chan countResult, len(jobs))
	var wg sync.WaitGroup
	for _, job := range jobs {
		job := job
		wg.Add(1)
		go func() {
			defer wg.Done()
			if value, err := job.run(); err == nil {
				results <- countResult{key: job.key, value: value}
			}
		}()
	}
	go func() {
		wg.Wait()
		close(results)
	}()

	for result := range results {
		switch result.key {
		case "services":
			counts.Services = result.value
		case "endpoints":
			counts.Endpoints = result.value
		case "ingresses":
			counts.Ingresses = result.value
		case "gatewayresources":
			counts.GatewayResources += result.value
		case "networkpolicies":
			counts.NetworkPolicies = result.value
		case "ciliumpolicies":
			counts.CiliumPolicies = result.value
		case "ciliumendpoints":
			counts.CiliumEndpoints = result.value
		case "configmaps":
			counts.ConfigMaps = result.value
		case "secrets":
			counts.Secrets = result.value
		case "persistentvolumes":
			counts.PersistentVolumes = result.value
		case "storageclasses":
			counts.StorageClasses = result.value
		case "serviceaccounts":
			counts.ServiceAccounts = result.value
		case "roles":
			counts.Roles = result.value
		case "clusterroles":
			counts.ClusterRoles = result.value
		case "rolebindings":
			counts.RoleBindings = result.value
		case "clusterrolebindings":
			counts.ClusterRoleBindings = result.value
		case "crds":
			counts.CRDs = result.value
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

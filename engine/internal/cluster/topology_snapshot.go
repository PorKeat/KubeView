package cluster

import (
	"context"
	"sync"
)

// TopologySnapshotResult is the single-round-trip payload used by the
// topology view. It combines the overview, sidebar counts, and networking
// lists so the graph opens from one consistent snapshot.
type TopologySnapshotResult struct {
	Overview         *ClusterOverviewResult     `json:"overview"`
	NetworkingCounts *NetworkingCountsResult    `json:"networkingCounts"`
	Services         *ListServicesResult        `json:"services"`
	Endpoints        *ListEndpointsResult       `json:"endpoints"`
	Ingresses        *ListIngressesResult       `json:"ingresses"`
	NetworkPolicies  *ListNetworkPoliciesResult `json:"networkPolicies"`
}

// GetTopologySnapshot fetches the six topology collections concurrently.
func (m *Manager) GetTopologySnapshot(ctx context.Context, contextName, namespace string) (*TopologySnapshotResult, error) {
	result := &TopologySnapshotResult{}
	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstErr error

	fail := func(err error) {
		if err == nil {
			return
		}
		mu.Lock()
		if firstErr == nil {
			firstErr = err
		}
		mu.Unlock()
	}

	wg.Add(6)
	go func() {
		defer wg.Done()
		overview, err := m.GetClusterOverview(ctx, contextName)
		if err != nil {
			fail(err)
			return
		}
		result.Overview = overview
	}()
	go func() {
		defer wg.Done()
		counts, err := m.GetNetworkingCounts(ctx, contextName, namespace)
		if err != nil {
			fail(err)
			return
		}
		result.NetworkingCounts = counts
	}()
	go func() {
		defer wg.Done()
		services, err := m.ListServices(ctx, contextName, namespace)
		if err != nil {
			fail(err)
			return
		}
		result.Services = services
	}()
	go func() {
		defer wg.Done()
		endpoints, err := m.ListEndpoints(ctx, contextName, namespace)
		if err != nil {
			fail(err)
			return
		}
		result.Endpoints = endpoints
	}()
	go func() {
		defer wg.Done()
		ingresses, err := m.ListIngresses(ctx, contextName, namespace)
		if err != nil {
			fail(err)
			return
		}
		result.Ingresses = ingresses
	}()
	go func() {
		defer wg.Done()
		policies, err := m.ListNetworkPolicies(ctx, contextName, namespace)
		if err != nil {
			fail(err)
			return
		}
		result.NetworkPolicies = policies
	}()

	wg.Wait()
	if firstErr != nil {
		return nil, firstErr
	}
	return result, nil
}

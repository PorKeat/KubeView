package cluster

import (
	"context"
	"sync"
)

// SidebarCountsResult combines the two badge-count payloads into one round
// trip for the resource sidebar.
type SidebarCountsResult struct {
	NetworkingCounts *NetworkingCountsResult     `json:"networkingCounts"`
	SimpleCounts     *SimpleResourceCountsResult `json:"simpleCounts"`
}

// GetSidebarCounts loads networking and simple-resource counts concurrently.
func (m *Manager) GetSidebarCounts(ctx context.Context, contextName, namespace string) (*SidebarCountsResult, error) {
	result := &SidebarCountsResult{}
	var wg sync.WaitGroup
	var networkingErr error

	wg.Add(2)
	go func() {
		defer wg.Done()
		result.NetworkingCounts, networkingErr = m.GetNetworkingCounts(ctx, contextName, namespace)
	}()
	go func() {
		defer wg.Done()
		result.SimpleCounts = m.CountSimpleResources(ctx, contextName)
	}()
	wg.Wait()

	if networkingErr != nil {
		return nil, networkingErr
	}
	return result, nil
}

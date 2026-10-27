package cluster

import (
	"context"
	"sync"
	"time"
)

const (
	fleetOverviewConcurrency = 6
	fleetOverviewTimeout     = 6 * time.Second
)

type fleetOverviewFetcher func(context.Context, string) (*ClusterOverviewResult, error)

// GetFleetOverview fetches compact health snapshots for every configured
// context. Individual cluster failures are returned as offline rows instead of
// failing the entire request.
func (m *Manager) GetFleetOverview(ctx context.Context) (*FleetOverviewResult, error) {
	list, err := m.ListContexts()
	if err != nil {
		return nil, err
	}

	return buildFleetOverview(ctx, list.Contexts, list.CurrentContext, func(
		clusterCtx context.Context,
		contextName string,
	) (*ClusterOverviewResult, error) {
		return m.GetClusterOverview(clusterCtx, contextName)
	}), nil
}

func buildFleetOverview(
	ctx context.Context,
	contexts []ContextSummary,
	currentContext string,
	fetch fleetOverviewFetcher,
) *FleetOverviewResult {
	fetchedAt := time.Now().UTC().Format(time.RFC3339)
	result := &FleetOverviewResult{
		Clusters:  make([]FleetClusterOverview, len(contexts)),
		FetchedAt: fetchedAt,
	}

	semaphore := make(chan struct{}, fleetOverviewConcurrency)
	var waitGroup sync.WaitGroup

	for index, contextSummary := range contexts {
		result.Clusters[index] = FleetClusterOverview{
			ContextName: contextSummary.Name,
			Cluster:     contextSummary.Cluster,
			Server:      contextSummary.Server,
			Provider:    contextSummary.Provider,
			AuthType:    contextSummary.AuthType,
			IsCurrent:   contextSummary.Name == currentContext,
			Status:      "offline",
			FetchedAt:   fetchedAt,
		}

		waitGroup.Add(1)
		go fetchFleetCluster(
			&waitGroup,
			semaphore,
			index,
			contextSummary,
			currentContext,
			ctx,
			fetch,
			result,
		)
	}

	waitGroup.Wait()
	result.Totals = summarizeFleetTotals(result.Clusters)
	return result
}

func fetchFleetCluster(
	waitGroup *sync.WaitGroup,
	semaphore chan struct{},
	index int,
	contextSummary ContextSummary,
	currentContext string,
	ctx context.Context,
	fetch fleetOverviewFetcher,
	result *FleetOverviewResult,
) {
	defer waitGroup.Done()

	select {
	case semaphore <- struct{}{}:
		defer func() { <-semaphore }()
	case <-ctx.Done():
		result.Clusters[index].Error = "Timed out while contacting this cluster."
		return
	}

	clusterCtx, cancel := context.WithTimeout(ctx, fleetOverviewTimeout)
	defer cancel()

	overview, err := fetch(clusterCtx, contextSummary.Name)
	if err != nil {
		result.Clusters[index].Error = err.Error()
		return
	}
	if overview == nil {
		result.Clusters[index].Error = "No overview returned."
		return
	}

	result.Clusters[index] = summarizeFleetCluster(
		contextSummary,
		currentContext,
		overview,
	)
}

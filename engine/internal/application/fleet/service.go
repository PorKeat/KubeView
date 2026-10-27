package fleet

import (
	"context"
	"fmt"
	"sync"
	"time"

	domainfleet "github.com/kubeview/engine/internal/domain/fleet"
)

const (
	defaultConcurrency = 6
	defaultTimeout     = 6 * time.Second
)

type Service struct {
	contexts  ContextRepository
	overviews OverviewReader
}

func New(contexts ContextRepository, overviews OverviewReader) *Service {
	return &Service{contexts: contexts, overviews: overviews}
}

// Read builds a fleet snapshot without exposing Kubernetes types to callers.
// Each context is isolated so one unreachable cluster cannot fail the result.
func (service *Service) Read(ctx context.Context) (*domainfleet.Result, error) {
	contexts, err := service.contexts.ListContexts(ctx)
	if err != nil {
		return nil, err
	}

	fetchedAt := time.Now().UTC()
	result := &domainfleet.Result{
		Clusters:  make([]domainfleet.Snapshot, len(contexts)),
		FetchedAt: fetchedAt,
	}
	semaphore := make(chan struct{}, defaultConcurrency)
	var waitGroup sync.WaitGroup

	for index, contextValue := range contexts {
		result.Clusters[index] = offlineSnapshot(contextValue, fetchedAt)
		waitGroup.Add(1)
		go func(index int, contextValue domainfleet.Context) {
			defer waitGroup.Done()

			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				result.Clusters[index].Error = "Timed out while contacting this cluster."
				return
			}

			clusterCtx, cancel := context.WithTimeout(ctx, defaultTimeout)
			defer cancel()

			overview, overviewErr := service.overviews.ReadOverview(clusterCtx, contextValue.Name)
			if overviewErr != nil {
				result.Clusters[index].Error = overviewErr.Error()
				return
			}
			if overview == nil {
				result.Clusters[index].Error = "No overview returned."
				return
			}
			result.Clusters[index] = healthySnapshot(contextValue, overview, fetchedAt)
		}(index, contextValue)
	}

	waitGroup.Wait()
	result.Totals = totalsFor(result.Clusters)
	return result, nil
}

func offlineSnapshot(contextValue domainfleet.Context, fetchedAt time.Time) domainfleet.Snapshot {
	return domainfleet.Snapshot{
		Context:   contextValue,
		Status:    domainfleet.StatusOffline,
		FetchedAt: fetchedAt,
	}
}

func healthySnapshot(
	contextValue domainfleet.Context,
	overview *domainfleet.Overview,
	fetchedAt time.Time,
) domainfleet.Snapshot {
	degradedWorkloads := overview.DegradedWorkloadsByKind.Total()
	status := domainfleet.StatusHealthy
	if overview.TotalNodes == 0 ||
		overview.ReadyNodes < overview.TotalNodes ||
		overview.FailedPods > 0 ||
		degradedWorkloads > 0 {
		status = domainfleet.StatusDegraded
	}

	return domainfleet.Snapshot{
		Context:   contextValue,
		Status:    status,
		Overview:  *overview,
		FetchedAt: fetchedAt,
	}
}

func totalsFor(clusters []domainfleet.Snapshot) domainfleet.Totals {
	totals := domainfleet.Totals{Total: len(clusters)}
	for _, cluster := range clusters {
		switch cluster.Status {
		case domainfleet.StatusHealthy:
			totals.Healthy++
		case domainfleet.StatusDegraded:
			totals.Degraded++
		default:
			totals.Offline++
		}
		totals.TotalNodes += cluster.Overview.TotalNodes
		totals.ReadyNodes += cluster.Overview.ReadyNodes
		totals.TotalPods += cluster.Overview.TotalPods
		totals.RunningPods += cluster.Overview.RunningPods
		totals.FailedPods += cluster.Overview.FailedPods
		totals.DegradedWorkloads += cluster.Overview.DegradedWorkloadsByKind.Total()
		totals.WarningCount += cluster.Overview.WarningCount
	}
	return totals
}

func (service *Service) Validate() error {
	if service == nil || service.contexts == nil || service.overviews == nil {
		return fmt.Errorf("fleet service dependencies are not configured")
	}
	return nil
}

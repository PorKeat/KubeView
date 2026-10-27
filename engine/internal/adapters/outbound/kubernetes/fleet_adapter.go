package kubernetes

import (
	"context"

	legacycluster "github.com/kubeview/engine/internal/cluster"
	domainfleet "github.com/kubeview/engine/internal/domain/fleet"
)

// FleetAdapter is the temporary outbound adapter around the legacy manager.
// As more slices move to ports, this wrapper is split into focused adapters.
type FleetAdapter struct {
	manager *legacycluster.Manager
}

func NewFleetAdapter(manager *legacycluster.Manager) *FleetAdapter {
	return &FleetAdapter{manager: manager}
}

func (adapter *FleetAdapter) ListContexts(ctx context.Context) ([]domainfleet.Context, error) {
	list, err := adapter.manager.ListContexts()
	if err != nil {
		return nil, err
	}

	contexts := make([]domainfleet.Context, 0, len(list.Contexts))
	for _, item := range list.Contexts {
		contexts = append(contexts, domainfleet.Context{
			Name:      item.Name,
			Cluster:   item.Cluster,
			Server:    item.Server,
			Provider:  string(item.Provider),
			AuthType:  string(item.AuthType),
			IsCurrent: item.IsCurrent,
		})
	}
	return contexts, nil
}

func (adapter *FleetAdapter) ReadOverview(
	ctx context.Context,
	contextName string,
) (*domainfleet.Overview, error) {
	result, err := adapter.manager.GetClusterOverview(ctx, contextName)
	if err != nil {
		return nil, err
	}

	breakdown := breakdownFromWorkloads(result.Workloads)
	return &domainfleet.Overview{
		TotalNodes:              result.TotalNodes,
		ReadyNodes:              result.ReadyNodes,
		TotalPods:               result.TotalPods,
		RunningPods:             result.RunningPods,
		PendingPods:             result.PendingPods,
		FailedPods:              result.FailedPods,
		DegradedWorkloadsByKind: breakdown,
		WarningCount:            warningCount(result),
		TotalCPUCores:           result.TotalCPUCores,
		CPUPercent:              result.CPUPercent,
		CPUUsagePercent:         result.CPUUsagePercent,
		TotalMemoryGiB:          result.TotalMemoryGiB,
		MemoryPercent:           result.MemoryPercent,
		MemoryUsagePercent:      result.MemoryUsagePercent,
		HasMetrics:              result.HasMetrics,
	}, nil
}

func breakdownFromWorkloads(workloads legacycluster.WorkloadsSummary) domainfleet.WorkloadBreakdown {
	return domainfleet.WorkloadBreakdown{
		Deployments:  workloads.Deployments.Degraded,
		ReplicaSets:  workloads.ReplicaSets.Degraded,
		StatefulSets: workloads.StatefulSets.Degraded,
		DaemonSets:   workloads.DaemonSets.Degraded,
		Jobs:         workloads.Jobs.Degraded,
		CronJobs:     workloads.CronJobs.Degraded,
	}
}

func warningCount(result *legacycluster.ClusterOverviewResult) int {
	if result.WarningEventCount > 0 {
		return result.WarningEventCount
	}
	return len(result.WarningEvents)
}

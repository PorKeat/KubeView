package cluster

import "time"

func summarizeFleetCluster(
	contextSummary ContextSummary,
	currentContext string,
	overview *ClusterOverviewResult,
) FleetClusterOverview {
	workloads := fleetWorkloadBreakdown(overview.Workloads)
	degradedWorkloads := countDegradedWorkloads(overview.Workloads)
	status := "healthy"
	if overview.TotalNodes == 0 ||
		overview.ReadyNodes < overview.TotalNodes ||
		overview.FailedPods > 0 ||
		degradedWorkloads > 0 {
		status = "degraded"
	}

	warningCount := overview.WarningEventCount
	if warningCount == 0 && len(overview.WarningEvents) > 0 {
		warningCount = len(overview.WarningEvents)
	}

	return FleetClusterOverview{
		ContextName:             contextSummary.Name,
		Cluster:                 contextSummary.Cluster,
		Server:                  contextSummary.Server,
		Provider:                contextSummary.Provider,
		AuthType:                contextSummary.AuthType,
		IsCurrent:               contextSummary.Name == currentContext,
		Status:                  status,
		TotalNodes:              overview.TotalNodes,
		ReadyNodes:              overview.ReadyNodes,
		TotalPods:               overview.TotalPods,
		RunningPods:             overview.RunningPods,
		PendingPods:             overview.PendingPods,
		FailedPods:              overview.FailedPods,
		DegradedWorkloads:       degradedWorkloads,
		DegradedWorkloadsByKind: workloads,
		WarningCount:            warningCount,
		TotalCPUCores:           overview.TotalCPUCores,
		CPUPercent:              overview.CPUPercent,
		CPUUsagePercent:         overview.CPUUsagePercent,
		TotalMemoryGiB:          overview.TotalMemoryGiB,
		MemoryPercent:           overview.MemoryPercent,
		MemoryUsagePercent:      overview.MemoryUsagePercent,
		HasMetrics:              overview.HasMetrics,
		FetchedAt:               time.Now().UTC().Format(time.RFC3339),
	}
}

func fleetWorkloadBreakdown(workloads WorkloadsSummary) FleetWorkloadBreakdown {
	return FleetWorkloadBreakdown{
		Deployments:  workloads.Deployments.Degraded,
		ReplicaSets:  workloads.ReplicaSets.Degraded,
		StatefulSets: workloads.StatefulSets.Degraded,
		DaemonSets:   workloads.DaemonSets.Degraded,
		Jobs:         workloads.Jobs.Degraded,
		CronJobs:     workloads.CronJobs.Degraded,
	}
}

func countDegradedWorkloads(workloads WorkloadsSummary) int {
	breakdown := fleetWorkloadBreakdown(workloads)
	return breakdown.Deployments +
		breakdown.ReplicaSets +
		breakdown.StatefulSets +
		breakdown.DaemonSets +
		breakdown.Jobs +
		breakdown.CronJobs
}

func summarizeFleetTotals(clusters []FleetClusterOverview) FleetOverviewTotals {
	totals := FleetOverviewTotals{Total: len(clusters)}
	for _, cluster := range clusters {
		switch cluster.Status {
		case "healthy":
			totals.Healthy++
		case "degraded":
			totals.Degraded++
		default:
			totals.Offline++
		}
		totals.TotalNodes += cluster.TotalNodes
		totals.ReadyNodes += cluster.ReadyNodes
		totals.TotalPods += cluster.TotalPods
		totals.RunningPods += cluster.RunningPods
		totals.FailedPods += cluster.FailedPods
		totals.DegradedWorkloads += cluster.DegradedWorkloads
		totals.WarningCount += cluster.WarningCount
	}
	return totals
}

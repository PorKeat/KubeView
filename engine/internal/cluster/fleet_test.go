package cluster

import (
	"context"
	"errors"
	"testing"
)

func TestBuildFleetOverviewAggregatesClusterHealth(t *testing.T) {
	contexts := []ContextSummary{
		{
			Name:     "production",
			Cluster:  "prod-cluster",
			Server:   "https://prod.example:6443",
			Provider: ProviderEKS,
			AuthType: AuthExec,
		},
		{
			Name:     "development",
			Cluster:  "dev-cluster",
			Server:   "https://dev.example:6443",
			Provider: ProviderKind,
			AuthType: AuthCert,
		},
		{
			Name:     "offline",
			Cluster:  "offline-cluster",
			Server:   "https://offline.example:6443",
			Provider: ProviderGeneric,
			AuthType: AuthToken,
		},
	}

	fetch := func(_ context.Context, contextName string) (*ClusterOverviewResult, error) {
		switch contextName {
		case "production":
			return &ClusterOverviewResult{
				ContextName:       "production",
				TotalNodes:        2,
				ReadyNodes:        2,
				TotalPods:         10,
				RunningPods:       10,
				WarningEventCount: 12,
			}, nil
		case "development":
			return &ClusterOverviewResult{
				ContextName: "development",
				TotalNodes:  2,
				ReadyNodes:  1,
				TotalPods:   5,
				RunningPods: 3,
				FailedPods:  1,
				Workloads: WorkloadsSummary{
					Deployments: WorkloadControllerHealth{
						Total:    2,
						Ready:    1,
						Degraded: 1,
					},
					StatefulSets: WorkloadControllerHealth{
						Total:    2,
						Ready:    0,
						Degraded: 2,
					},
				},
			}, nil
		default:
			return nil, errors.New("connection refused")
		}
	}

	result := buildFleetOverview(context.Background(), contexts, "production", fetch)

	if result == nil {
		t.Fatal("expected a fleet overview result")
	}
	if len(result.Clusters) != 3 {
		t.Fatalf("expected 3 clusters, got %d", len(result.Clusters))
	}
	if result.FetchedAt == "" {
		t.Error("expected an aggregate fetch timestamp")
	}

	if !result.Clusters[0].IsCurrent {
		t.Error("production should be marked current")
	}
	if result.Clusters[0].Status != "healthy" {
		t.Errorf("production status = %q, want healthy", result.Clusters[0].Status)
	}
	if result.Clusters[1].Status != "degraded" {
		t.Errorf("development status = %q, want degraded", result.Clusters[1].Status)
	}
	if result.Clusters[1].DegradedWorkloads != 3 {
		t.Errorf("development degraded workloads = %d, want 3", result.Clusters[1].DegradedWorkloads)
	}
	if result.Clusters[1].DegradedWorkloadsByKind.Deployments != 1 ||
		result.Clusters[1].DegradedWorkloadsByKind.StatefulSets != 2 {
		t.Errorf("unexpected workload breakdown: %+v", result.Clusters[1].DegradedWorkloadsByKind)
	}
	if result.Clusters[2].Status != "offline" {
		t.Errorf("offline status = %q, want offline", result.Clusters[2].Status)
	}
	if result.Clusters[2].Error != "connection refused" {
		t.Errorf("offline error = %q", result.Clusters[2].Error)
	}

	totals := result.Totals
	if totals.Total != 3 || totals.Healthy != 1 || totals.Degraded != 1 || totals.Offline != 1 {
		t.Errorf("unexpected health totals: %+v", totals)
	}
	if totals.TotalNodes != 4 || totals.ReadyNodes != 3 {
		t.Errorf("unexpected node totals: %+v", totals)
	}
	if totals.TotalPods != 15 || totals.RunningPods != 13 || totals.FailedPods != 1 {
		t.Errorf("unexpected pod totals: %+v", totals)
	}
	if totals.DegradedWorkloads != 3 {
		t.Errorf("degradedWorkloads = %d, want 3", totals.DegradedWorkloads)
	}
	if totals.WarningCount != 12 {
		t.Errorf("warningCount = %d, want 12", totals.WarningCount)
	}
}

func TestBuildFleetOverviewHandlesCanceledRequest(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	fetch := func(clusterCtx context.Context, _ string) (*ClusterOverviewResult, error) {
		return nil, clusterCtx.Err()
	}

	result := buildFleetOverview(ctx, []ContextSummary{
		{Name: "one", Cluster: "one"},
		{Name: "two", Cluster: "two"},
	}, "one", fetch)

	if len(result.Clusters) != 2 {
		t.Fatalf("expected 2 clusters, got %d", len(result.Clusters))
	}
	for _, cluster := range result.Clusters {
		if cluster.Status != "offline" {
			t.Errorf("%s status = %q, want offline", cluster.ContextName, cluster.Status)
		}
		if cluster.Error == "" {
			t.Errorf("%s should include a timeout error", cluster.ContextName)
		}
	}
	if result.Totals.Offline != 2 {
		t.Errorf("offline total = %d, want 2", result.Totals.Offline)
	}
}

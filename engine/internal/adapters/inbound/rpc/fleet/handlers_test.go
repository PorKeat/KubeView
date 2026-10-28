package fleet

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	domainfleet "github.com/kubeview/engine/internal/domain/fleet"
)

func TestOverviewResponsePreservesWireShape(t *testing.T) {
	result := &domainfleet.Result{
		Clusters: []domainfleet.Snapshot{{
			Context: domainfleet.Context{
				Name:      "prod",
				Cluster:   "prod-cluster",
				Server:    "https://prod.example:6443",
				Provider:  "eks",
				AuthType:  "exec",
				IsCurrent: true,
			},
			Status: domainfleet.StatusDegraded,
			Overview: domainfleet.Overview{
				TotalNodes:              3,
				ReadyNodes:              2,
				TotalPods:               10,
				RunningPods:             9,
				FailedPods:              1,
				DegradedWorkloadsByKind: domainfleet.WorkloadBreakdown{Deployments: 2},
				WarningCount:            5,
				TotalCPUCores:           12,
				CPUPercent:              40,
				TotalMemoryGiB:          32,
				MemoryPercent:           51,
				HasMetrics:              true,
			},
			FetchedAt: time.Date(2026, 10, 27, 12, 0, 0, 0, time.UTC),
		}},
		Totals: domainfleet.Totals{
			Total: 1, Degraded: 1, TotalNodes: 3, ReadyNodes: 2,
			TotalPods: 10, RunningPods: 9, FailedPods: 1,
			DegradedWorkloads: 2, WarningCount: 5,
		},
		FetchedAt: time.Date(2026, 10, 27, 12, 0, 0, 0, time.UTC),
	}

	response := overviewToResponse(result)
	if response.Clusters[0].ContextName != "prod" || response.Clusters[0].Status != "degraded" {
		t.Fatalf("unexpected cluster mapping: %+v", response.Clusters[0])
	}
	if response.Clusters[0].DegradedWorkloadsByKind.Deployments != 2 {
		t.Fatalf("unexpected workload breakdown: %+v", response.Clusters[0].DegradedWorkloadsByKind)
	}
	payload, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	jsonText := string(payload)
	for _, field := range []string{
		`"clusters"`, `"contextName"`, `"degradedWorkloadsByKind"`,
		`"totalCpuCores"`, `"hasMetrics"`, `"fetchedAt"`, `"totals"`,
	} {
		if !strings.Contains(jsonText, field) {
			t.Errorf("wire response missing %s: %s", field, jsonText)
		}
	}
}

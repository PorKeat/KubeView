package fleet

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	appfleet "github.com/kubeview/engine/internal/application/fleet"
	domainfleet "github.com/kubeview/engine/internal/domain/fleet"
	"github.com/kubeview/engine/internal/ipc"
)

type workloadBreakdownResponse struct {
	Deployments  int `json:"deployments"`
	ReplicaSets  int `json:"replicaSets"`
	StatefulSets int `json:"statefulSets"`
	DaemonSets   int `json:"daemonSets"`
	Jobs         int `json:"jobs"`
	CronJobs     int `json:"cronJobs"`
}

type clusterResponse struct {
	ContextName             string                    `json:"contextName"`
	Cluster                 string                    `json:"cluster"`
	Server                  string                    `json:"server"`
	Provider                string                    `json:"provider"`
	AuthType                string                    `json:"authType"`
	IsCurrent               bool                      `json:"isCurrent"`
	Status                  string                    `json:"status"`
	Error                   string                    `json:"error,omitempty"`
	TotalNodes              int                       `json:"totalNodes"`
	ReadyNodes              int                       `json:"readyNodes"`
	TotalPods               int                       `json:"totalPods"`
	RunningPods             int                       `json:"runningPods"`
	PendingPods             int                       `json:"pendingPods"`
	FailedPods              int                       `json:"failedPods"`
	DegradedWorkloads       int                       `json:"degradedWorkloads"`
	DegradedWorkloadsByKind workloadBreakdownResponse `json:"degradedWorkloadsByKind"`
	WarningCount            int                       `json:"warningCount"`
	TotalCPUCores           float64                   `json:"totalCpuCores"`
	CPUPercent              int                       `json:"cpuPercent"`
	CPUUsagePercent         int                       `json:"cpuUsagePercent,omitempty"`
	TotalMemoryGiB          float64                   `json:"totalMemoryGiB"`
	MemoryPercent           int                       `json:"memoryPercent"`
	MemoryUsagePercent      int                       `json:"memoryUsagePercent,omitempty"`
	HasMetrics              bool                      `json:"hasMetrics"`
	FetchedAt               string                    `json:"fetchedAt"`
}

type totalsResponse struct {
	Total             int `json:"total"`
	Healthy           int `json:"healthy"`
	Degraded          int `json:"degraded"`
	Offline           int `json:"offline"`
	TotalNodes        int `json:"totalNodes"`
	ReadyNodes        int `json:"readyNodes"`
	TotalPods         int `json:"totalPods"`
	RunningPods       int `json:"runningPods"`
	FailedPods        int `json:"failedPods"`
	DegradedWorkloads int `json:"degradedWorkloads"`
	WarningCount      int `json:"warningCount"`
}

type overviewResponse struct {
	Clusters  []clusterResponse `json:"clusters"`
	Totals    totalsResponse    `json:"totals"`
	FetchedAt string            `json:"fetchedAt"`
}

func RegisterHandlers(server *ipc.Server, service *appfleet.Service) {
	rpc.Register(server, "clusters.fleetOverview", 20*time.Second, func(
		ctx context.Context,
		_ json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		if service == nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrEngineUnavailable,
				Message: "Fleet service is not initialized",
			}
		}

		result, err := service.Read(ctx)
		if err != nil {
			return nil, rpc.MapError(
				err,
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to get fleet overview: %v", err),
			)
		}
		return overviewToResponse(result), nil
	})
}

func overviewToResponse(result *domainfleet.Result) *overviewResponse {
	clusters := make([]clusterResponse, 0, len(result.Clusters))
	for _, cluster := range result.Clusters {
		overview := cluster.Overview
		clusters = append(clusters, clusterResponse{
			ContextName:             cluster.Context.Name,
			Cluster:                 cluster.Context.Cluster,
			Server:                  cluster.Context.Server,
			Provider:                cluster.Context.Provider,
			AuthType:                cluster.Context.AuthType,
			IsCurrent:               cluster.Context.IsCurrent,
			Status:                  string(cluster.Status),
			Error:                   cluster.Error,
			TotalNodes:              overview.TotalNodes,
			ReadyNodes:              overview.ReadyNodes,
			TotalPods:               overview.TotalPods,
			RunningPods:             overview.RunningPods,
			PendingPods:             overview.PendingPods,
			FailedPods:              overview.FailedPods,
			DegradedWorkloads:       overview.DegradedWorkloadsByKind.Total(),
			DegradedWorkloadsByKind: workloadBreakdown(overview.DegradedWorkloadsByKind),
			WarningCount:            overview.WarningCount,
			TotalCPUCores:           overview.TotalCPUCores,
			CPUPercent:              overview.CPUPercent,
			CPUUsagePercent:         overview.CPUUsagePercent,
			TotalMemoryGiB:          overview.TotalMemoryGiB,
			MemoryPercent:           overview.MemoryPercent,
			MemoryUsagePercent:      overview.MemoryUsagePercent,
			HasMetrics:              overview.HasMetrics,
			FetchedAt:               cluster.FetchedAt.UTC().Format(time.RFC3339),
		})
	}

	return &overviewResponse{
		Clusters: clusters,
		Totals: totalsResponse{
			Total:             result.Totals.Total,
			Healthy:           result.Totals.Healthy,
			Degraded:          result.Totals.Degraded,
			Offline:           result.Totals.Offline,
			TotalNodes:        result.Totals.TotalNodes,
			ReadyNodes:        result.Totals.ReadyNodes,
			TotalPods:         result.Totals.TotalPods,
			RunningPods:       result.Totals.RunningPods,
			FailedPods:        result.Totals.FailedPods,
			DegradedWorkloads: result.Totals.DegradedWorkloads,
			WarningCount:      result.Totals.WarningCount,
		},
		FetchedAt: result.FetchedAt.UTC().Format(time.RFC3339),
	}
}

func workloadBreakdown(breakdown domainfleet.WorkloadBreakdown) workloadBreakdownResponse {
	return workloadBreakdownResponse{
		Deployments:  breakdown.Deployments,
		ReplicaSets:  breakdown.ReplicaSets,
		StatefulSets: breakdown.StatefulSets,
		DaemonSets:   breakdown.DaemonSets,
		Jobs:         breakdown.Jobs,
		CronJobs:     breakdown.CronJobs,
	}
}

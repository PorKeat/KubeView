package cluster

import (
	"context"
	"strings"
	"time"
)

type NodeSummary struct {
	Name               string   `json:"name"`
	Status             string   `json:"status"` // "Ready", "NotReady"
	Roles              []string `json:"roles"`
	Version            string   `json:"version"`
	Architecture       string   `json:"architecture"`
	InternalIP         string   `json:"internalIP"`
	PodCIDR            string   `json:"podCIDR,omitempty"`
	PodCIDRs           []string `json:"podCIDRs,omitempty"`
	CPUCapacity        string   `json:"cpuCapacity"`
	CPUCores           float64  `json:"cpuCores"`
	CPUAllocated       string   `json:"cpuAllocated"`
	CPUPercent         int      `json:"cpuPercent"`
	CPUUsage           string   `json:"cpuUsage,omitempty"`
	CPUUsagePercent    int      `json:"cpuUsagePercent,omitempty"`
	MemoryCapacity     string   `json:"memoryCapacity"`
	MemoryGiB          float64  `json:"memoryGiB"`
	MemoryAllocated    string   `json:"memoryAllocated"`
	MemoryPercent      int      `json:"memoryPercent"`
	MemoryUsage        string   `json:"memoryUsage,omitempty"`
	MemoryUsagePercent int      `json:"memoryUsagePercent,omitempty"`
	PodCapacity        int64    `json:"podCapacity"`
	ActivePods         int      `json:"activePods"`
}

type ClusterOverviewParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace,omitempty"`
}

type WorkloadControllerHealth struct {
	Total       int      `json:"total"`
	Ready       int      `json:"ready"`
	Degraded    int      `json:"degraded"`
	UnreadyList []string `json:"unreadyList,omitempty"`
}

type WorkloadsSummary struct {
	Deployments  WorkloadControllerHealth `json:"deployments"`
	ReplicaSets  WorkloadControllerHealth `json:"replicaSets"`
	StatefulSets WorkloadControllerHealth `json:"statefulSets"`
	DaemonSets   WorkloadControllerHealth `json:"daemonSets"`
	Jobs         WorkloadControllerHealth `json:"jobs"`
	CronJobs     WorkloadControllerHealth `json:"cronJobs"`
}

type ClusterOverviewResult struct {
	ContextName        string           `json:"contextName"`
	Namespace          string           `json:"namespace,omitempty"`
	TotalNodes         int              `json:"totalNodes"`
	ReadyNodes         int              `json:"readyNodes"`
	TotalPods          int              `json:"totalPods"`
	RunningPods        int              `json:"runningPods"`
	PendingPods        int              `json:"pendingPods"`
	FailedPods         int              `json:"failedPods"`
	SucceededPods      int              `json:"succeededPods"`
	TotalCPUCores      float64          `json:"totalCpuCores"`
	AllocatedCPUCores  float64          `json:"allocatedCpuCores"`
	CPUPercent         int              `json:"cpuPercent"`
	UsedCPUCores       float64          `json:"usedCpuCores,omitempty"`
	CPUUsagePercent    int              `json:"cpuUsagePercent,omitempty"`
	TotalMemoryGiB     float64          `json:"totalMemoryGiB"`
	AllocatedMemoryGiB float64          `json:"allocatedMemoryGiB"`
	MemoryPercent      int              `json:"memoryPercent"`
	UsedMemoryGiB      float64          `json:"usedMemoryGiB,omitempty"`
	MemoryUsagePercent int              `json:"memoryUsagePercent,omitempty"`
	PodCapacity        int64            `json:"podCapacity"`
	PodPercent         int              `json:"podPercent"`
	HasMetrics         bool             `json:"hasMetrics"`
	Nodes              []NodeSummary    `json:"nodes"`
	WarningEvents      []PodEventItem   `json:"warningEvents"`
	WarningEventCount  int              `json:"warningEventCount"`
	Workloads          WorkloadsSummary `json:"workloads"`
}

// GetClusterOverview aggregates node capacity, pod allocations, and cluster events.
// It leverages in-memory caching (2.5s TTL) and in-flight request coalescing (singleflight)
// to prevent hammering the Kubernetes API Server during rapid UI interactions or event bursts.
func (m *Manager) GetClusterOverview(ctx context.Context, contextName string, namespace ...string) (*ClusterOverviewResult, error) {
	targetNs := ""
	if len(namespace) > 0 && namespace[0] != "all" {
		targetNs = strings.TrimSpace(namespace[0])
	}

	cacheKey := contextName
	if targetNs != "" {
		cacheKey = contextName + "::" + targetNs
	}

	// 1. Fast path: return fresh cache if within TTL (2.5 seconds)
	m.overviewMu.RLock()
	cached, hasCache := m.overviewCache[cacheKey]
	m.overviewMu.RUnlock()
	if hasCache && cached.result != nil && time.Since(cached.cachedAt) < 2500*time.Millisecond {
		return cached.result, nil
	}

	// 2. In-flight request coalescing (singleflight deduplication)
	m.overviewCallMu.Lock()
	if m.overviewCalls == nil {
		m.overviewCalls = make(map[string]*overviewCall)
	}
	if call, inFlight := m.overviewCalls[cacheKey]; inFlight {
		m.overviewCallMu.Unlock()
		call.wg.Wait()
		return call.val, call.err
	}

	call := &overviewCall{}
	call.wg.Add(1)
	m.overviewCalls[cacheKey] = call
	m.overviewCallMu.Unlock()

	defer func() {
		m.overviewCallMu.Lock()
		delete(m.overviewCalls, cacheKey)
		m.overviewCallMu.Unlock()
	}()

	res, err := m.fetchClusterOverviewRaw(ctx, contextName, targetNs, cacheKey)
	call.val = res
	call.err = err
	call.wg.Done()

	return res, err
}

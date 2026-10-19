package cluster

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type NodeSummary struct {
	Name               string   `json:"name"`
	Status             string   `json:"status"` // "Ready", "NotReady"
	Roles              []string `json:"roles"`
	Version            string   `json:"version"`
	Architecture       string   `json:"architecture"`
	InternalIP         string   `json:"internalIP"`
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
}

type ClusterOverviewResult struct {
	ContextName        string         `json:"contextName"`
	TotalNodes         int            `json:"totalNodes"`
	ReadyNodes         int            `json:"readyNodes"`
	TotalPods          int            `json:"totalPods"`
	RunningPods        int            `json:"runningPods"`
	PendingPods        int            `json:"pendingPods"`
	FailedPods         int            `json:"failedPods"`
	SucceededPods      int            `json:"succeededPods"`
	TotalCPUCores      float64        `json:"totalCpuCores"`
	AllocatedCPUCores  float64        `json:"allocatedCpuCores"`
	CPUPercent         int            `json:"cpuPercent"`
	UsedCPUCores       float64        `json:"usedCpuCores,omitempty"`
	CPUUsagePercent    int            `json:"cpuUsagePercent,omitempty"`
	TotalMemoryGiB     float64        `json:"totalMemoryGiB"`
	AllocatedMemoryGiB float64        `json:"allocatedMemoryGiB"`
	MemoryPercent      int            `json:"memoryPercent"`
	UsedMemoryGiB      float64        `json:"usedMemoryGiB,omitempty"`
	MemoryUsagePercent int            `json:"memoryUsagePercent,omitempty"`
	PodCapacity        int64          `json:"podCapacity"`
	PodPercent         int            `json:"podPercent"`
	HasMetrics         bool           `json:"hasMetrics"`
	Nodes              []NodeSummary  `json:"nodes"`
	WarningEvents      []PodEventItem `json:"warningEvents"`
}


// GetClusterOverview aggregates node capacity, pod allocations, and cluster events
func (m *Manager) GetClusterOverview(ctx context.Context, contextName string) (*ClusterOverviewResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	// 1. Fetch all Nodes
	nodeList, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	// 2. Fetch all Pods
	podList, err := client.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list cluster pods: %w", err)
	}

	// 3. Fetch cluster Warning Events
	eventList, _ := client.CoreV1().Events("").List(ctx, metav1.ListOptions{
		Limit: 100,
	})

	// 4. Attempt to fetch real-time Node metrics from Metrics Server (metrics.k8s.io/v1beta1/nodes)
	hasMetrics := false
	type nodeMetricItem struct {
		Metadata struct {
			Name string `json:"name"`
		} `json:"metadata"`
		Usage struct {
			CPU    string `json:"cpu"`
			Memory string `json:"memory"`
		} `json:"usage"`
	}
	type nodeMetricsList struct {
		Items []nodeMetricItem `json:"items"`
	}

	nodeCpuUsageMillis := make(map[string]int64)
	nodeMemUsageBytes := make(map[string]int64)
	var totalCpuUsageMillis int64
	var totalMemUsageBytes int64

	metricsCtx, metricsCancel := context.WithTimeout(ctx, 3*time.Second)
	defer metricsCancel()

	metricsRaw, metricsErr := client.CoreV1().RESTClient().Get().AbsPath("/apis/metrics.k8s.io/v1beta1/nodes").DoRaw(metricsCtx)
	if metricsErr == nil && len(metricsRaw) > 0 {
		var ml nodeMetricsList
		if err := json.Unmarshal(metricsRaw, &ml); err == nil && len(ml.Items) > 0 {
			hasMetrics = true
			for _, item := range ml.Items {
				name := item.Metadata.Name
				if cpuQ, err := resource.ParseQuantity(item.Usage.CPU); err == nil {
					millis := cpuQ.MilliValue()
					nodeCpuUsageMillis[name] = millis
					totalCpuUsageMillis += millis
				}
				if memQ, err := resource.ParseQuantity(item.Usage.Memory); err == nil {
					bytes := memQ.Value()
					nodeMemUsageBytes[name] = bytes
					totalMemUsageBytes += bytes
				}
			}
		}
	}

	// Pod counts by phase & node mapping
	var runningPods, pendingPods, failedPods, succeededPods int
	nodePodCounts := make(map[string]int)
	nodeCpuReqs := make(map[string]int64)
	nodeMemReqs := make(map[string]int64)

	var totalCpuReqMillis int64
	var totalMemReqBytes int64

	for _, pod := range podList.Items {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			runningPods++
		case corev1.PodPending:
			pendingPods++
		case corev1.PodFailed:
			failedPods++
		case corev1.PodSucceeded:
			succeededPods++
		}

		nodeName := pod.Spec.NodeName
		if nodeName != "" {
			nodePodCounts[nodeName]++
		}

		// Only active (non-terminated) pods consume scheduled CPU and memory allocations
		if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
			continue
		}

		var podCpu int64
		var podMem int64
		for _, c := range pod.Spec.Containers {
			if q, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
				podCpu += q.MilliValue()
			}
			if q, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
				podMem += q.Value()
			}
		}

		totalCpuReqMillis += podCpu
		totalMemReqBytes += podMem

		if nodeName != "" {
			nodeCpuReqs[nodeName] += podCpu
			nodeMemReqs[nodeName] += podMem
		}
	}

	// Process Nodes
	var totalCpuCapacityMillis int64
	var totalCpuAllocatableMillis int64
	var totalMemCapacityBytes int64
	var totalMemAllocatableBytes int64
	var totalPodCapacity int64
	var readyNodes int
	var nodeSummaries []NodeSummary

	for _, n := range nodeList.Items {
		isReady := false
		for _, cond := range n.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				isReady = true
				break
			}
		}
		if isReady {
			readyNodes++
		}

		statusStr := "NotReady"
		if isReady {
			statusStr = "Ready"
		}

		// Roles
		var roles []string
		for lk := range n.Labels {
			if strings.HasPrefix(lk, "node-role.kubernetes.io/") {
				role := strings.TrimPrefix(lk, "node-role.kubernetes.io/")
				if role != "" {
					roles = append(roles, role)
				}
			}
		}
		if len(roles) == 0 {
			if strings.Contains(strings.ToLower(n.Name), "control-plane") || strings.Contains(strings.ToLower(n.Name), "master") {
				roles = append(roles, "control-plane")
			} else {
				roles = append(roles, "worker")
			}
		}

		// Internal IP
		internalIP := "-"
		for _, addr := range n.Status.Addresses {
			if addr.Type == corev1.NodeInternalIP {
				internalIP = addr.Address
				break
			}
		}

		cpuCapQ := n.Status.Capacity[corev1.ResourceCPU]
		memCapQ := n.Status.Capacity[corev1.ResourceMemory]
		podCapQ := n.Status.Capacity[corev1.ResourcePods]

		nodeCpuCapMillis := cpuCapQ.MilliValue()
		nodeMemCapBytes := memCapQ.Value()
		nodePodCap := podCapQ.Value()

		// Allocatable resources (used for scheduler and kubectl top metrics percentages)
		cpuAllocQ := n.Status.Allocatable[corev1.ResourceCPU]
		memAllocQ := n.Status.Allocatable[corev1.ResourceMemory]
		nodeCpuAllocMillis := cpuAllocQ.MilliValue()
		if nodeCpuAllocMillis <= 0 {
			nodeCpuAllocMillis = nodeCpuCapMillis
		}
		nodeMemAllocBytes := memAllocQ.Value()
		if nodeMemAllocBytes <= 0 {
			nodeMemAllocBytes = nodeMemCapBytes
		}

		totalCpuCapacityMillis += nodeCpuCapMillis
		totalCpuAllocatableMillis += nodeCpuAllocMillis
		totalMemCapacityBytes += nodeMemCapBytes
		totalMemAllocatableBytes += nodeMemAllocBytes
		totalPodCapacity += nodePodCap

		nodeAllocatedCpu := nodeCpuReqs[n.Name]
		nodeAllocatedMem := nodeMemReqs[n.Name]

		// CPU & Memory Allocation % (Requested by active pods)
		nodeCpuPct := 0
		if nodeCpuCapMillis > 0 {
			nodeCpuPct = int((nodeAllocatedCpu * 100) / nodeCpuCapMillis)
		}
		nodeMemPct := 0
		if nodeMemCapBytes > 0 {
			nodeMemPct = int((nodeAllocatedMem * 100) / nodeMemCapBytes)
		}

		// Real-time Usage (from Metrics Server / kubectl top)
		var cpuUsageStr string
		var cpuUsagePct int
		if usageMillis, ok := nodeCpuUsageMillis[n.Name]; ok {
			cpuUsageStr = fmt.Sprintf("%dm", usageMillis)
			if nodeCpuAllocMillis > 0 {
				cpuUsagePct = int(math.Round(float64(usageMillis*100) / float64(nodeCpuAllocMillis)))
			}
		}

		var memUsageStr string
		var memUsagePct int
		if usageBytes, ok := nodeMemUsageBytes[n.Name]; ok {
			memUsageStr = formatBytes(usageBytes)
			if nodeMemAllocBytes > 0 {
				memUsagePct = int(math.Round(float64(usageBytes*100) / float64(nodeMemAllocBytes)))
			}
		}

		cpuCores := float64(nodeCpuCapMillis) / 1000.0
		memGiB := float64(nodeMemCapBytes) / (1024 * 1024 * 1024.0)

		nodeSummaries = append(nodeSummaries, NodeSummary{
			Name:               n.Name,
			Status:             statusStr,
			Roles:              roles,
			Version:            n.Status.NodeInfo.KubeletVersion,
			Architecture:       n.Status.NodeInfo.Architecture,
			InternalIP:         internalIP,
			CPUCapacity:        fmt.Sprintf("%.1f Cores", cpuCores),
			CPUCores:           math.Round(cpuCores*10) / 10,
			CPUAllocated:       fmt.Sprintf("%dm", nodeAllocatedCpu),
			CPUPercent:         nodeCpuPct,
			CPUUsage:           cpuUsageStr,
			CPUUsagePercent:    cpuUsagePct,
			MemoryCapacity:     formatBytes(nodeMemCapBytes),
			MemoryGiB:          math.Round(memGiB*10) / 10,
			MemoryAllocated:    formatBytes(nodeAllocatedMem),
			MemoryPercent:      nodeMemPct,
			MemoryUsage:        memUsageStr,
			MemoryUsagePercent: memUsagePct,
			PodCapacity:        nodePodCap,
			ActivePods:         nodePodCounts[n.Name],
		})
	}

	// Sort nodeSummaries alphabetically by name
	sort.Slice(nodeSummaries, func(i, j int) bool {
		return nodeSummaries[i].Name < nodeSummaries[j].Name
	})

	// Overall Cluster Calculations
	totalCpuCores := float64(totalCpuCapacityMillis) / 1000.0
	allocatedCpuCores := float64(totalCpuReqMillis) / 1000.0
	cpuPercent := 0
	if totalCpuCapacityMillis > 0 {
		cpuPercent = int((totalCpuReqMillis * 100) / totalCpuCapacityMillis)
	}

	usedCpuCores := float64(totalCpuUsageMillis) / 1000.0
	cpuUsagePercent := 0
	if totalCpuAllocatableMillis > 0 {
		cpuUsagePercent = int(math.Round(float64(totalCpuUsageMillis*100) / float64(totalCpuAllocatableMillis)))
	}

	totalMemGiB := float64(totalMemCapacityBytes) / (1024 * 1024 * 1024.0)
	allocatedMemGiB := float64(totalMemReqBytes) / (1024 * 1024 * 1024.0)
	memPercent := 0
	if totalMemCapacityBytes > 0 {
		memPercent = int((totalMemReqBytes * 100) / totalMemCapacityBytes)
	}

	usedMemGiB := float64(totalMemUsageBytes) / (1024 * 1024 * 1024.0)
	memoryUsagePercent := 0
	if totalMemAllocatableBytes > 0 {
		memoryUsagePercent = int(math.Round(float64(totalMemUsageBytes*100) / float64(totalMemAllocatableBytes)))
	}

	podPercent := 0
	if totalPodCapacity > 0 {
		podPercent = int((int64(len(podList.Items)) * 100) / totalPodCapacity)
	}

	// Process Warning Events
	var warningItems []PodEventItem
	if eventList != nil {
		for _, e := range eventList.Items {
			if e.Type == corev1.EventTypeWarning {
				ts := e.LastTimestamp.Time.Format(time.RFC3339)
				if e.LastTimestamp.IsZero() {
					ts = e.EventTime.Time.Format(time.RFC3339)
				}
				warningItems = append(warningItems, PodEventItem{
					Type:          e.Type,
					Reason:        e.Reason,
					Message:       e.Message,
					Count:         e.Count,
					LastTimestamp: ts,
					Source:        e.Source.Component,
				})
			}
		}
	}

	// Sort events latest first and take top 10
	sort.Slice(warningItems, func(i, j int) bool {
		return warningItems[i].LastTimestamp > warningItems[j].LastTimestamp
	})
	if len(warningItems) > 10 {
		warningItems = warningItems[:10]
	}

	return &ClusterOverviewResult{
		ContextName:        contextName,
		TotalNodes:         len(nodeList.Items),
		ReadyNodes:         readyNodes,
		TotalPods:          len(podList.Items),
		RunningPods:        runningPods,
		PendingPods:        pendingPods,
		FailedPods:         failedPods,
		SucceededPods:      succeededPods,
		TotalCPUCores:      math.Round(totalCpuCores*10) / 10,
		AllocatedCPUCores:  math.Round(allocatedCpuCores*10) / 10,
		CPUPercent:         cpuPercent,
		UsedCPUCores:       math.Round(usedCpuCores*100) / 100,
		CPUUsagePercent:    cpuUsagePercent,
		TotalMemoryGiB:     math.Round(totalMemGiB*10) / 10,
		AllocatedMemoryGiB: math.Round(allocatedMemGiB*10) / 10,
		MemoryPercent:      memPercent,
		UsedMemoryGiB:      math.Round(usedMemGiB*10) / 10,
		MemoryUsagePercent: memoryUsagePercent,
		PodCapacity:        totalPodCapacity,
		PodPercent:         podPercent,
		HasMetrics:         hasMetrics,
		Nodes:              nodeSummaries,
		WarningEvents:      warningItems,
	}, nil
}

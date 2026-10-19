package cluster

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type NodeSummary struct {
	Name            string   `json:"name"`
	Status          string   `json:"status"` // "Ready", "NotReady"
	Roles           []string `json:"roles"`
	Version         string   `json:"version"`
	Architecture    string   `json:"architecture"`
	InternalIP      string   `json:"internalIP"`
	CPUCapacity     string   `json:"cpuCapacity"`
	CPUCores        float64  `json:"cpuCores"`
	CPUAllocated    string   `json:"cpuAllocated"`
	CPUPercent      int      `json:"cpuPercent"`
	MemoryCapacity  string   `json:"memoryCapacity"`
	MemoryGiB       float64  `json:"memoryGiB"`
	MemoryAllocated string   `json:"memoryAllocated"`
	MemoryPercent   int      `json:"memoryPercent"`
	PodCapacity     int64    `json:"podCapacity"`
	ActivePods      int      `json:"activePods"`
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
	TotalMemoryGiB     float64        `json:"totalMemoryGiB"`
	AllocatedMemoryGiB float64        `json:"allocatedMemoryGiB"`
	MemoryPercent      int            `json:"memoryPercent"`
	PodCapacity        int64          `json:"podCapacity"`
	PodPercent         int            `json:"podPercent"`
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
	var totalMemCapacityBytes int64
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

		totalCpuCapacityMillis += nodeCpuCapMillis
		totalMemCapacityBytes += nodeMemCapBytes
		totalPodCapacity += nodePodCap

		nodeAllocatedCpu := nodeCpuReqs[n.Name]
		nodeAllocatedMem := nodeMemReqs[n.Name]

		nodeCpuPct := 0
		if nodeCpuCapMillis > 0 {
			nodeCpuPct = int((nodeAllocatedCpu * 100) / nodeCpuCapMillis)
		}
		nodeMemPct := 0
		if nodeMemCapBytes > 0 {
			nodeMemPct = int((nodeAllocatedMem * 100) / nodeMemCapBytes)
		}

		cpuCores := float64(nodeCpuCapMillis) / 1000.0
		memGiB := float64(nodeMemCapBytes) / (1024 * 1024 * 1024.0)

		nodeSummaries = append(nodeSummaries, NodeSummary{
			Name:            n.Name,
			Status:          statusStr,
			Roles:           roles,
			Version:         n.Status.NodeInfo.KubeletVersion,
			Architecture:    n.Status.NodeInfo.Architecture,
			InternalIP:      internalIP,
			CPUCapacity:     fmt.Sprintf("%.1f Cores", cpuCores),
			CPUCores:        math.Round(cpuCores*10) / 10,
			CPUAllocated:    fmt.Sprintf("%dm (%d%%)", nodeAllocatedCpu, nodeCpuPct),
			CPUPercent:      nodeCpuPct,
			MemoryCapacity:  formatBytes(nodeMemCapBytes),
			MemoryGiB:       math.Round(memGiB*10) / 10,
			MemoryAllocated: fmt.Sprintf("%s (%d%%)", formatBytes(nodeAllocatedMem), nodeMemPct),
			MemoryPercent:   nodeMemPct,
			PodCapacity:     nodePodCap,
			ActivePods:      nodePodCounts[n.Name],
		})
	}

	// Overall Cluster Calculations
	totalCpuCores := float64(totalCpuCapacityMillis) / 1000.0
	allocatedCpuCores := float64(totalCpuReqMillis) / 1000.0
	cpuPercent := 0
	if totalCpuCapacityMillis > 0 {
		cpuPercent = int((totalCpuReqMillis * 100) / totalCpuCapacityMillis)
	}

	totalMemGiB := float64(totalMemCapacityBytes) / (1024 * 1024 * 1024.0)
	allocatedMemGiB := float64(totalMemReqBytes) / (1024 * 1024 * 1024.0)
	memPercent := 0
	if totalMemCapacityBytes > 0 {
		memPercent = int((totalMemReqBytes * 100) / totalMemCapacityBytes)
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
		TotalMemoryGiB:     math.Round(totalMemGiB*10) / 10,
		AllocatedMemoryGiB: math.Round(allocatedMemGiB*10) / 10,
		MemoryPercent:      memPercent,
		PodCapacity:        totalPodCapacity,
		PodPercent:         podPercent,
		Nodes:              nodeSummaries,
		WarningEvents:      warningItems,
	}, nil
}

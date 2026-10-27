package cluster

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

type overviewNodeMetrics struct {
	hasMetrics     bool
	cpuUsageMillis map[string]int64
	memUsageBytes  map[string]int64
	totalCpuMillis int64
	totalMemBytes  int64
}

func parseOverviewNodeMetrics(metricsRaw []byte) overviewNodeMetrics {
	metrics := overviewNodeMetrics{
		cpuUsageMillis: make(map[string]int64),
		memUsageBytes:  make(map[string]int64),
	}

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

	if len(metricsRaw) > 0 {
		var ml nodeMetricsList
		if err := json.Unmarshal(metricsRaw, &ml); err == nil && len(ml.Items) > 0 {
			metrics.hasMetrics = true
			for _, item := range ml.Items {
				name := item.Metadata.Name
				if cpuQ, err := resource.ParseQuantity(item.Usage.CPU); err == nil {
					millis := cpuQ.MilliValue()
					metrics.cpuUsageMillis[name] = millis
					metrics.totalCpuMillis += millis
				}
				if memQ, err := resource.ParseQuantity(item.Usage.Memory); err == nil {
					bytes := memQ.Value()
					metrics.memUsageBytes[name] = bytes
					metrics.totalMemBytes += bytes
				}
			}
		}
	}

	return metrics
}

type overviewPodAggregate struct {
	runningPods       int
	pendingPods       int
	failedPods        int
	succeededPods     int
	nodePodCounts     map[string]int
	nodeCpuReqs       map[string]int64
	nodeMemReqs       map[string]int64
	totalCpuReqMillis int64
	totalMemReqBytes  int64
}

func aggregateOverviewPods(podList []corev1.Pod) overviewPodAggregate {
	aggregate := overviewPodAggregate{
		nodePodCounts: make(map[string]int),
		nodeCpuReqs:   make(map[string]int64),
		nodeMemReqs:   make(map[string]int64),
	}

	for _, pod := range podList {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			aggregate.runningPods++
		case corev1.PodPending:
			aggregate.pendingPods++
		case corev1.PodFailed:
			aggregate.failedPods++
		case corev1.PodSucceeded:
			aggregate.succeededPods++
		}

		// Only active (non-terminated) pods consume scheduled CPU, memory allocations, and pod capacity
		if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
			continue
		}

		nodeName := pod.Spec.NodeName
		if nodeName != "" {
			aggregate.nodePodCounts[nodeName]++
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

		aggregate.totalCpuReqMillis += podCpu
		aggregate.totalMemReqBytes += podMem

		if nodeName != "" {
			aggregate.nodeCpuReqs[nodeName] += podCpu
			aggregate.nodeMemReqs[nodeName] += podMem
		}
	}

	return aggregate
}

type overviewNodeTotals struct {
	readyNodes                int
	totalCpuCapacityMillis    int64
	totalCpuAllocatableMillis int64
	totalMemCapacityBytes     int64
	totalMemAllocatableBytes  int64
	totalPodCapacity          int64
}

func buildNodeSummaries(nodes []corev1.Node, pods overviewPodAggregate, metrics overviewNodeMetrics) ([]NodeSummary, overviewNodeTotals) {
	var totals overviewNodeTotals
	var nodeSummaries []NodeSummary

	for _, n := range nodes {
		isReady := false
		for _, cond := range n.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				isReady = true
				break
			}
		}
		if isReady {
			totals.readyNodes++
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

		// True schedulable pod capacity follows Allocatable, fallback to Capacity, default 110
		podCapQ := n.Status.Allocatable[corev1.ResourcePods]
		nodePodCap := podCapQ.Value()
		if nodePodCap <= 0 {
			podCapQ = n.Status.Capacity[corev1.ResourcePods]
			nodePodCap = podCapQ.Value()
		}
		if nodePodCap <= 0 {
			nodePodCap = 110
		}

		nodeCpuCapMillis := cpuCapQ.MilliValue()
		nodeMemCapBytes := memCapQ.Value()

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

		totals.totalCpuCapacityMillis += nodeCpuCapMillis
		totals.totalCpuAllocatableMillis += nodeCpuAllocMillis
		totals.totalMemCapacityBytes += nodeMemCapBytes
		totals.totalMemAllocatableBytes += nodeMemAllocBytes
		totals.totalPodCapacity += nodePodCap

		nodeAllocatedCpu := pods.nodeCpuReqs[n.Name]
		nodeAllocatedMem := pods.nodeMemReqs[n.Name]

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
		if usageMillis, ok := metrics.cpuUsageMillis[n.Name]; ok {
			cpuUsageStr = fmt.Sprintf("%dm", usageMillis)
			if nodeCpuAllocMillis > 0 {
				cpuUsagePct = int(math.Round(float64(usageMillis*100) / float64(nodeCpuAllocMillis)))
			}
		}

		var memUsageStr string
		var memUsagePct int
		if usageBytes, ok := metrics.memUsageBytes[n.Name]; ok {
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
			PodCIDR:            n.Spec.PodCIDR,
			PodCIDRs:           n.Spec.PodCIDRs,
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
			ActivePods:         pods.nodePodCounts[n.Name],
		})
	}

	// Sort nodeSummaries alphabetically by name
	sort.Slice(nodeSummaries, func(i, j int) bool {
		return nodeSummaries[i].Name < nodeSummaries[j].Name
	})

	return nodeSummaries, totals
}

type overviewClusterTotals struct {
	totalCpuCores      float64
	allocatedCpuCores  float64
	cpuPercent         int
	usedCpuCores       float64
	cpuUsagePercent    int
	totalMemGiB        float64
	allocatedMemGiB    float64
	memPercent         int
	usedMemGiB         float64
	memoryUsagePercent int
	podPercent         int
}

func computeOverviewClusterTotals(podCount int, nodes overviewNodeTotals, pods overviewPodAggregate, metrics overviewNodeMetrics) overviewClusterTotals {
	totalCpuCores := float64(nodes.totalCpuCapacityMillis) / 1000.0
	allocatedCpuCores := float64(pods.totalCpuReqMillis) / 1000.0
	cpuPercent := 0
	if nodes.totalCpuCapacityMillis > 0 {
		cpuPercent = int((pods.totalCpuReqMillis * 100) / nodes.totalCpuCapacityMillis)
	}

	usedCpuCores := float64(metrics.totalCpuMillis) / 1000.0
	cpuUsagePercent := 0
	if nodes.totalCpuAllocatableMillis > 0 {
		cpuUsagePercent = int(math.Round(float64(metrics.totalCpuMillis*100) / float64(nodes.totalCpuAllocatableMillis)))
	}

	totalMemGiB := float64(nodes.totalMemCapacityBytes) / (1024 * 1024 * 1024.0)
	allocatedMemGiB := float64(pods.totalMemReqBytes) / (1024 * 1024 * 1024.0)
	memPercent := 0
	if nodes.totalMemCapacityBytes > 0 {
		memPercent = int((pods.totalMemReqBytes * 100) / nodes.totalMemCapacityBytes)
	}

	usedMemGiB := float64(metrics.totalMemBytes) / (1024 * 1024 * 1024.0)
	memoryUsagePercent := 0
	if nodes.totalMemAllocatableBytes > 0 {
		memoryUsagePercent = int(math.Round(float64(metrics.totalMemBytes*100) / float64(nodes.totalMemAllocatableBytes)))
	}

	podPercent := 0
	if nodes.totalPodCapacity > 0 {
		podPercent = int((int64(podCount) * 100) / nodes.totalPodCapacity)
	}

	return overviewClusterTotals{
		totalCpuCores:      totalCpuCores,
		allocatedCpuCores:  allocatedCpuCores,
		cpuPercent:         cpuPercent,
		usedCpuCores:       usedCpuCores,
		cpuUsagePercent:    cpuUsagePercent,
		totalMemGiB:        totalMemGiB,
		allocatedMemGiB:    allocatedMemGiB,
		memPercent:         memPercent,
		usedMemGiB:         usedMemGiB,
		memoryUsagePercent: memoryUsagePercent,
		podPercent:         podPercent,
	}
}

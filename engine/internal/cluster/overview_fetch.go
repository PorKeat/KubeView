package cluster

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// overviewData holds the raw Kubernetes responses gathered in parallel for an
// overview request.
type overviewData struct {
	nodeList     *corev1.NodeList
	podList      *corev1.PodList
	eventList    *corev1.EventList
	metricsRaw   []byte
	depsList     *appsv1.DeploymentList
	rssList      *appsv1.ReplicaSetList
	stssList     *appsv1.StatefulSetList
	dssList      *appsv1.DaemonSetList
	jobsList     *batchv1.JobList
	cronJobsList *batchv1.CronJobList
	nodeErr      error
	podErr       error
}

// fetchOverviewData gathers nodes, pods, events, metrics, and workload
// controllers concurrently.
func fetchOverviewData(ctx context.Context, client kubernetes.Interface, targetNs string) overviewData {
	var (
		data overviewData
		wg   sync.WaitGroup
	)

	wg.Add(10)

	// 1. Fetch all Nodes (parallel)
	go func() {
		defer wg.Done()
		data.nodeList, data.nodeErr = client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	}()

	// 2. Fetch Pods (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.podList, data.podErr = client.CoreV1().Pods(targetNs).List(ctx, metav1.ListOptions{})
	}()

	// 3. Fetch cluster Warning Events (scoped if namespace specified)
	go func() {
		defer wg.Done()
		evs, err := client.CoreV1().Events(targetNs).List(ctx, metav1.ListOptions{
			FieldSelector: "type=Warning",
			Limit:         100,
		})
		if err != nil || evs == nil || len(evs.Items) == 0 {
			// Fallback to regular list if field-selector is unsupported or returns 0
			evs, _ = client.CoreV1().Events(targetNs).List(ctx, metav1.ListOptions{
				Limit: 100,
			})
		}
		data.eventList = evs
	}()

	// 4. Real-time Node metrics from Metrics Server (parallel)
	go func() {
		defer wg.Done()
		metricsCtx, metricsCancel := context.WithTimeout(ctx, 3*time.Second)
		defer metricsCancel()
		raw, _ := client.CoreV1().RESTClient().Get().AbsPath("/apis/metrics.k8s.io/v1beta1/nodes").DoRaw(metricsCtx)
		data.metricsRaw = raw
	}()

	// 5. Deployments (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.depsList, _ = client.AppsV1().Deployments(targetNs).List(ctx, metav1.ListOptions{})
	}()

	// 6. StatefulSets (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.stssList, _ = client.AppsV1().StatefulSets(targetNs).List(ctx, metav1.ListOptions{})
	}()

	// 7. DaemonSets (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.dssList, _ = client.AppsV1().DaemonSets(targetNs).List(ctx, metav1.ListOptions{})
	}()

	// 8. ReplicaSets (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.rssList, _ = client.AppsV1().ReplicaSets(targetNs).List(ctx, metav1.ListOptions{})
	}()

	// 9. Jobs (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.jobsList, _ = client.BatchV1().Jobs(targetNs).List(ctx, metav1.ListOptions{})
	}()

	// 10. CronJobs (scoped if namespace specified)
	go func() {
		defer wg.Done()
		data.cronJobsList, _ = client.BatchV1().CronJobs(targetNs).List(ctx, metav1.ListOptions{})
	}()

	wg.Wait()

	return data
}

// cachedOverviewResult returns a previously cached overview, if one exists.
func (m *Manager) cachedOverviewResult(cacheKey string) (*ClusterOverviewResult, bool) {
	m.overviewMu.RLock()
	cached, ok := m.overviewCache[cacheKey]
	m.overviewMu.RUnlock()
	if ok && cached.result != nil {
		return cached.result, true
	}
	return nil, false
}

func (m *Manager) fetchClusterOverviewRaw(ctx context.Context, contextName, targetNs, cacheKey string) (*ClusterOverviewResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		if cached, ok := m.cachedOverviewResult(cacheKey); ok {
			log.Printf("[overview] Using cached overview for '%s' due to client error: %v", cacheKey, err)
			return cached, nil
		}
		return nil, err
	}

	data := fetchOverviewData(ctx, client, targetNs)

	// If node listing failed due to transient timeout/network jitter, return cached overview if available
	if data.nodeErr != nil {
		if cached, ok := m.cachedOverviewResult(cacheKey); ok {
			log.Printf("[overview] Node list failed, returning cached overview for '%s': %v", cacheKey, data.nodeErr)
			return cached, nil
		}
		return nil, fmt.Errorf("failed to list nodes: %w", data.nodeErr)
	}

	// If pod listing failed, return cached overview if available
	if data.podErr != nil {
		if cached, ok := m.cachedOverviewResult(cacheKey); ok {
			log.Printf("[overview] Pod list failed, returning cached overview for '%s': %v", cacheKey, data.podErr)
			return cached, nil
		}
		return nil, fmt.Errorf("failed to list cluster pods: %w", data.podErr)
	}

	metrics := parseOverviewNodeMetrics(data.metricsRaw)
	pods := aggregateOverviewPods(data.podList.Items)
	nodeSummaries, nodeTotals := buildNodeSummaries(data.nodeList.Items, pods, metrics)
	warningItems, warningEventCount := summarizeWarningEvents(data.eventList)
	workloads := summarizeWorkloads(data.depsList, data.rssList, data.stssList, data.dssList, data.jobsList, data.cronJobsList)
	totals := computeOverviewClusterTotals(len(data.podList.Items), nodeTotals, pods, metrics)

	result := &ClusterOverviewResult{
		ContextName:        contextName,
		Namespace:          targetNs,
		TotalNodes:         len(data.nodeList.Items),
		ReadyNodes:         nodeTotals.readyNodes,
		TotalPods:          len(data.podList.Items),
		RunningPods:        pods.runningPods,
		PendingPods:        pods.pendingPods,
		FailedPods:         pods.failedPods,
		SucceededPods:      pods.succeededPods,
		TotalCPUCores:      math.Round(totals.totalCpuCores*10) / 10,
		AllocatedCPUCores:  math.Round(totals.allocatedCpuCores*10) / 10,
		CPUPercent:         totals.cpuPercent,
		UsedCPUCores:       math.Round(totals.usedCpuCores*100) / 100,
		CPUUsagePercent:    totals.cpuUsagePercent,
		TotalMemoryGiB:     math.Round(totals.totalMemGiB*10) / 10,
		AllocatedMemoryGiB: math.Round(totals.allocatedMemGiB*10) / 10,
		MemoryPercent:      totals.memPercent,
		UsedMemoryGiB:      math.Round(totals.usedMemGiB*10) / 10,
		MemoryUsagePercent: totals.memoryUsagePercent,
		PodCapacity:        nodeTotals.totalPodCapacity,
		PodPercent:         totals.podPercent,
		HasMetrics:         metrics.hasMetrics,
		Nodes:              nodeSummaries,
		WarningEvents:      warningItems,
		WarningEventCount:  warningEventCount,
		Workloads:          workloads,
	}

	m.overviewMu.Lock()
	if m.overviewCache == nil {
		m.overviewCache = make(map[string]cachedOverview)
	}
	m.overviewCache[cacheKey] = cachedOverview{
		result:   result,
		cachedAt: time.Now(),
	}
	m.overviewMu.Unlock()

	return result, nil
}

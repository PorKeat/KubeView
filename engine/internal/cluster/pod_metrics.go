package cluster

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
)

const podMetricsCacheTTL = 10 * time.Second

// PodUsageParams selects the context and namespace for a pod usage read.
type PodUsageParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace,omitempty"`
}

// PodUsageContainer is the live usage reported for one container.
type PodUsageContainer struct {
	Name               string `json:"name"`
	CPUUsageMillicores int64  `json:"cpuUsageMillicores"`
	MemoryUsageBytes   int64  `json:"memoryUsageBytes"`
}

// PodUsage is the live usage reported for one pod.
type PodUsage struct {
	Namespace          string              `json:"namespace"`
	Name               string              `json:"name"`
	CPUUsageMillicores int64               `json:"cpuUsageMillicores"`
	MemoryUsageBytes   int64               `json:"memoryUsageBytes"`
	Containers         []PodUsageContainer `json:"containers"`
}

// PodUsageResult is a namespaced snapshot of Metrics Server pod usage.
type PodUsageResult struct {
	ContextName      string     `json:"contextName"`
	Namespace        string     `json:"namespace"`
	MetricsAvailable bool       `json:"metricsAvailable"`
	Reason           string     `json:"reason,omitempty"`
	FetchedAt        string     `json:"fetchedAt"`
	Items            []PodUsage `json:"items"`
}

type cachedPodMetrics struct {
	result   *PodUsageResult
	cachedAt time.Time
}

type podMetricsPayload struct {
	Items []struct {
		Metadata struct {
			Name      string `json:"name"`
			Namespace string `json:"namespace"`
		} `json:"metadata"`
		Containers []struct {
			Name  string `json:"name"`
			Usage struct {
				CPU    string `json:"cpu"`
				Memory string `json:"memory"`
			} `json:"usage"`
		} `json:"containers"`
	} `json:"items"`
}

// GetPodUsage reads live pod CPU and memory usage from Metrics Server.
//
// Metrics Server may be absent or the current identity may not be allowed to
// read metrics. Both are normal conditions: the result reports
// MetricsAvailable=false and an explanatory reason instead of failing the RPC,
// so pod lists can still render requests and limits.
func (m *Manager) GetPodUsage(
	ctx context.Context,
	contextName string,
	namespace string,
) (*PodUsageResult, error) {
	contextName = strings.TrimSpace(contextName)
	if contextName == "" {
		contextName = m.GetCurrentContext()
	}

	targetNs := strings.TrimSpace(namespace)
	if targetNs == "all" {
		targetNs = ""
	}

	cacheKey := contextName + "::" + targetNs
	m.podMetricsMu.RLock()
	cached, hasCache := m.podMetricsCache[cacheKey]
	m.podMetricsMu.RUnlock()
	if hasCache && cached.result != nil &&
		time.Since(cached.cachedAt) < podMetricsCacheTTL {
		return cached.result, nil
	}

	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	metricsCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	path := "/apis/metrics.k8s.io/v1beta1/pods"
	if targetNs != "" {
		path = fmt.Sprintf(
			"/apis/metrics.k8s.io/v1beta1/namespaces/%s/pods",
			url.PathEscape(targetNs),
		)
	}

	raw, fetchErr := client.CoreV1().RESTClient().Get().
		AbsPath(path).
		DoRaw(metricsCtx)

	result := &PodUsageResult{
		ContextName: contextName,
		Namespace:   targetNs,
		FetchedAt:   time.Now().UTC().Format(time.RFC3339),
		Items:       []PodUsage{},
	}

	if fetchErr != nil {
		result.Reason = podMetricsReason(fetchErr)
		m.cachePodUsage(cacheKey, result)
		return result, nil
	}

	items, parseErr := parsePodMetrics(raw, targetNs)
	if parseErr != nil {
		result.Reason = parseErr.Error()
		m.cachePodUsage(cacheKey, result)
		return result, nil
	}

	result.MetricsAvailable = true
	result.Items = items
	m.cachePodUsage(cacheKey, result)
	return result, nil
}

func parsePodMetrics(raw []byte, targetNamespace string) ([]PodUsage, error) {
	var payload podMetricsPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, fmt.Errorf("Metrics API returned an invalid response: %v", err)
	}

	items := make([]PodUsage, 0, len(payload.Items))
	for _, item := range payload.Items {
		usage := PodUsage{
			Namespace:  strings.TrimSpace(item.Metadata.Namespace),
			Name:       strings.TrimSpace(item.Metadata.Name),
			Containers: make([]PodUsageContainer, 0, len(item.Containers)),
		}
		if usage.Namespace == "" {
			usage.Namespace = targetNamespace
		}
		for _, container := range item.Containers {
			entry := PodUsageContainer{Name: strings.TrimSpace(container.Name)}
			if cpu, err := resource.ParseQuantity(container.Usage.CPU); err == nil {
				entry.CPUUsageMillicores = cpu.MilliValue()
			}
			if memory, err := resource.ParseQuantity(container.Usage.Memory); err == nil {
				entry.MemoryUsageBytes = memory.Value()
			}
			usage.CPUUsageMillicores += entry.CPUUsageMillicores
			usage.MemoryUsageBytes += entry.MemoryUsageBytes
			usage.Containers = append(usage.Containers, entry)
		}
		if usage.Name != "" {
			items = append(items, usage)
		}
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return items, nil
}

func (m *Manager) resetPodMetricsCache() {
	m.podMetricsMu.Lock()
	m.podMetricsCache = make(map[string]cachedPodMetrics)
	m.podMetricsMu.Unlock()
}

func (m *Manager) cachePodUsage(cacheKey string, result *PodUsageResult) {
	m.podMetricsMu.Lock()
	defer m.podMetricsMu.Unlock()
	if m.podMetricsCache == nil {
		m.podMetricsCache = make(map[string]cachedPodMetrics)
	}
	m.podMetricsCache[cacheKey] = cachedPodMetrics{
		result:   result,
		cachedAt: time.Now(),
	}
}

func podMetricsReason(err error) string {
	switch {
	case apierrors.IsNotFound(err):
		return "Metrics Server is not installed or the metrics API is unavailable."
	case apierrors.IsForbidden(err):
		return "This identity is not allowed to read pod metrics (metrics.k8s.io)."
	case apierrors.IsUnauthorized(err):
		return "The current credentials are not authorized to read pod metrics."
	case apierrors.IsTimeout(err), apierrors.IsServerTimeout(err):
		return "Metrics Server did not respond before the request timed out."
	default:
		return fmt.Sprintf("Unable to read pod metrics: %v", err)
	}
}

package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	appdiagnosis "github.com/kubeview/engine/internal/application/diagnosis"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	domaindiagnosis "github.com/kubeview/engine/internal/domain/diagnosis"
)

type containerUsage struct {
	cpuMillicores int64
	memoryBytes   int64
}

type podMetricsPayload struct {
	Items []struct {
		Containers []struct {
			Name  string `json:"name"`
			Usage struct {
				CPU    string `json:"cpu"`
				Memory string `json:"memory"`
			} `json:"usage"`
		} `json:"containers"`
	} `json:"items"`
}

// PodDiagnosisAdapter implements the diagnosis evidence port using the legacy
// manager and client-go. It is the only place where Kubernetes types meet the
// diagnosis slice.
type PodDiagnosisAdapter struct {
	manager *legacycluster.Manager
}

func NewPodDiagnosisAdapter(manager *legacycluster.Manager) *PodDiagnosisAdapter {
	return &PodDiagnosisAdapter{manager: manager}
}

// Collect gathers pod state, events, current/previous logs, probe
// configuration, resource limits, and available metrics for one pod.
func (adapter *PodDiagnosisAdapter) Collect(
	ctx context.Context,
	params appdiagnosis.Params,
) (*domaindiagnosis.Snapshot, error) {
	namespace := params.Namespace
	podName := params.PodName

	contextName := params.ContextName
	if contextName == "" {
		contextName = adapter.manager.GetCurrentContext()
	}

	client, _, err := adapter.manager.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	pod, err := client.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod %s/%s: %w", namespace, podName, err)
	}

	events := []domaindiagnosis.Event{}
	if eventResult, eventErr := adapter.manager.GetPodEvents(ctx, contextName, namespace, podName); eventErr == nil && eventResult != nil {
		events = mapEvents(eventResult.Events)
	}

	usage, metricsAvailable := fetchPodMetrics(ctx, client, namespace, podName)
	containers := buildContainers(pod, usage, metricsAvailable, events)
	attachLogs(ctx, adapter.manager, contextName, namespace, podName, containers)

	return &domaindiagnosis.Snapshot{
		ContextName:      contextName,
		Pod:              mapPodSnapshot(pod),
		Containers:       containers,
		Events:           events,
		MetricsAvailable: metricsAvailable,
	}, nil
}

func mapPodSnapshot(pod *corev1.Pod) domaindiagnosis.PodSnapshot {
	ownerKind := ""
	ownerName := ""
	if len(pod.OwnerReferences) > 0 {
		ownerKind = pod.OwnerReferences[0].Kind
		ownerName = pod.OwnerReferences[0].Name
	}

	conditions := make([]domaindiagnosis.Condition, 0, len(pod.Status.Conditions))
	for _, condition := range pod.Status.Conditions {
		conditions = append(conditions, domaindiagnosis.Condition{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			LastTransitionTime: condition.LastTransitionTime.Time.Format(time.RFC3339),
			Reason:             condition.Reason,
			Message:            condition.Message,
		})
	}

	return domaindiagnosis.PodSnapshot{
		Name:       pod.Name,
		Namespace:  pod.Namespace,
		Phase:      string(pod.Status.Phase),
		NodeName:   pod.Spec.NodeName,
		Conditions: conditions,
		OwnerKind:  ownerKind,
		OwnerName:  ownerName,
	}
}

func mapEvents(items []legacycluster.PodEventItem) []domaindiagnosis.Event {
	events := make([]domaindiagnosis.Event, 0, len(items))
	for _, item := range items {
		events = append(events, domaindiagnosis.Event{
			Context:                 item.Context,
			Type:                    item.Type,
			Reason:                  item.Reason,
			Message:                 item.Message,
			Count:                   item.Count,
			LastTimestamp:           item.LastTimestamp,
			Source:                  item.Source,
			InvolvedObjectKind:      item.InvolvedObjectKind,
			InvolvedObjectName:      item.InvolvedObjectName,
			InvolvedObjectNamespace: item.InvolvedObjectNamespace,
		})
	}
	return events
}

func fetchPodMetrics(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
	podName string,
) (map[string]containerUsage, bool) {
	restClient := client.CoreV1().RESTClient()
	if restClient == nil {
		return nil, false
	}

	metricsCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	path := fmt.Sprintf(
		"/apis/metrics.k8s.io/v1beta1/namespaces/%s/pods/%s",
		url.PathEscape(namespace),
		url.PathEscape(podName),
	)
	raw, err := restClient.Get().AbsPath(path).DoRaw(metricsCtx)
	if err != nil || len(raw) == 0 {
		return nil, false
	}

	var payload podMetricsPayload
	if err := json.Unmarshal(raw, &payload); err != nil || len(payload.Items) == 0 {
		return nil, false
	}

	usage := make(map[string]containerUsage)
	for _, item := range payload.Items[0].Containers {
		var entry containerUsage
		if cpu, err := resource.ParseQuantity(item.Usage.CPU); err == nil {
			entry.cpuMillicores = cpu.MilliValue()
		}
		if memory, err := resource.ParseQuantity(item.Usage.Memory); err == nil {
			entry.memoryBytes = memory.Value()
		}
		usage[item.Name] = entry
	}
	return usage, len(usage) > 0
}

func buildContainers(
	pod *corev1.Pod,
	usage map[string]containerUsage,
	metricsAvailable bool,
	events []domaindiagnosis.Event,
) []domaindiagnosis.Container {
	statuses := make(map[string]corev1.ContainerStatus, len(pod.Status.ContainerStatuses))
	for _, status := range pod.Status.ContainerStatuses {
		statuses[status.Name] = status
	}
	initStatuses := make(map[string]corev1.ContainerStatus, len(pod.Status.InitContainerStatuses))
	for _, status := range pod.Status.InitContainerStatuses {
		initStatuses[status.Name] = status
	}

	containers := make([]domaindiagnosis.Container, 0, len(pod.Spec.InitContainers)+len(pod.Spec.Containers))
	for _, spec := range pod.Spec.InitContainers {
		containers = append(containers, buildContainer(spec, initStatuses[spec.Name], usage, metricsAvailable, events))
	}
	for _, spec := range pod.Spec.Containers {
		containers = append(containers, buildContainer(spec, statuses[spec.Name], usage, metricsAvailable, events))
	}
	return containers
}

func buildContainer(
	spec corev1.Container,
	status corev1.ContainerStatus,
	usage map[string]containerUsage,
	metricsAvailable bool,
	events []domaindiagnosis.Event,
) domaindiagnosis.Container {
	container := domaindiagnosis.Container{
		Name:             spec.Name,
		Image:            spec.Image,
		Requests:         resourceList(spec.Resources.Requests),
		Limits:           resourceList(spec.Resources.Limits),
		MetricsAvailable: metricsAvailable,
	}
	if item, ok := usage[spec.Name]; ok {
		container.CPUUsageMillicores = item.cpuMillicores
		container.MemoryUsageBytes = item.memoryBytes
	}
	container.Probes = buildProbes(spec, status.Ready, events)

	if status.Name == "" {
		container.State = "Unknown"
		return container
	}

	container.Ready = status.Ready
	container.RestartCount = status.RestartCount
	switch {
	case status.State.Running != nil:
		container.State = "Running"
	case status.State.Waiting != nil:
		container.State = "Waiting"
		container.StateReason = status.State.Waiting.Reason
		container.StateMessage = status.State.Waiting.Message
	case status.State.Terminated != nil:
		container.State = "Terminated"
		container.StateReason = status.State.Terminated.Reason
		container.StateMessage = status.State.Terminated.Message
		exitCode := status.State.Terminated.ExitCode
		container.ExitCode = &exitCode
	default:
		container.State = "Unknown"
	}

	if status.LastTerminationState.Terminated != nil {
		last := status.LastTerminationState.Terminated
		container.LastTerminatedReason = last.Reason
		container.LastTerminatedMessage = last.Message
		if container.ExitCode == nil {
			exitCode := last.ExitCode
			container.ExitCode = &exitCode
		}
	}
	return container
}

func resourceList(list corev1.ResourceList) *domaindiagnosis.ResourceList {
	if len(list) == 0 {
		return nil
	}
	item := &domaindiagnosis.ResourceList{}
	if cpu, ok := list[corev1.ResourceCPU]; ok {
		item.CPU = cpu.String()
	}
	if memory, ok := list[corev1.ResourceMemory]; ok {
		item.Memory = memory.String()
	}
	if item.CPU == "" && item.Memory == "" {
		return nil
	}
	return item
}

func buildProbes(spec corev1.Container, ready bool, events []domaindiagnosis.Event) []domaindiagnosis.Probe {
	probes := make([]domaindiagnosis.Probe, 0, 3)
	probes = appendProbe(probes, "readiness", spec.ReadinessProbe, ready, events)
	probes = appendProbe(probes, "liveness", spec.LivenessProbe, ready, events)
	probes = appendProbe(probes, "startup", spec.StartupProbe, ready, events)
	return probes
}

func appendProbe(
	probes []domaindiagnosis.Probe,
	kind string,
	probe *corev1.Probe,
	ready bool,
	events []domaindiagnosis.Event,
) []domaindiagnosis.Probe {
	if probe == nil {
		return probes
	}

	diagnosis := domaindiagnosis.Probe{
		Kind:                kind,
		Configured:          true,
		Handler:             probeHandler(probe),
		InitialDelaySeconds: probe.InitialDelaySeconds,
		TimeoutSeconds:      probe.TimeoutSeconds,
		PeriodSeconds:       probe.PeriodSeconds,
		FailureThreshold:    probe.FailureThreshold,
		SuccessThreshold:    probe.SuccessThreshold,
		Status:              domaindiagnosis.StatusWarning,
	}
	if ready {
		diagnosis.Status = domaindiagnosis.StatusPass
	}

	needle := strings.ToLower(kind + " probe failed")
	for _, event := range events {
		if strings.Contains(strings.ToLower(event.Message), needle) {
			diagnosis.Status = domaindiagnosis.StatusFail
			diagnosis.Message = event.Message
			break
		}
	}
	return append(probes, diagnosis)
}

func probeHandler(probe *corev1.Probe) string {
	switch {
	case probe.HTTPGet != nil:
		scheme := string(probe.HTTPGet.Scheme)
		if scheme == "" {
			scheme = "HTTP"
		}
		return fmt.Sprintf("%s %s:%s", scheme, probe.HTTPGet.Path, probe.HTTPGet.Port.String())
	case probe.TCPSocket != nil:
		return "TCP " + probe.TCPSocket.Port.String()
	case probe.Exec != nil:
		return "exec " + strings.Join(probe.Exec.Command, " ")
	case probe.GRPC != nil:
		return fmt.Sprintf("gRPC :%d", probe.GRPC.Port)
	default:
		return "unknown handler"
	}
}

func attachLogs(
	ctx context.Context,
	mgr *legacycluster.Manager,
	contextName string,
	namespace string,
	podName string,
	containers []domaindiagnosis.Container,
) {
	fetched := 0
	for index := range containers {
		container := &containers[index]
		if fetched >= 2 || !needsLogs(*container) {
			continue
		}
		fetched++

		previous := container.RestartCount > 0 ||
			container.StateReason == "CrashLoopBackOff" ||
			container.LastTerminatedReason != ""
		excerpt, source, logErr := fetchContainerLog(
			ctx, mgr, contextName, namespace, podName, container.Name, previous,
		)
		if excerpt == "" && previous {
			excerpt, source, logErr = fetchContainerLog(
				ctx, mgr, contextName, namespace, podName, container.Name, false,
			)
		}
		container.LogExcerpt = excerpt
		container.LogSource = source
		container.LogError = logErr
	}
}

func needsLogs(container domaindiagnosis.Container) bool {
	return !container.Ready ||
		container.RestartCount > 0 ||
		container.State != "Running" ||
		container.LastTerminatedReason != ""
}

func fetchContainerLog(
	ctx context.Context,
	mgr *legacycluster.Manager,
	contextName string,
	namespace string,
	podName string,
	containerName string,
	previous bool,
) (string, string, string) {
	result, err := mgr.GetPodLogs(ctx, legacycluster.PodLogsParams{
		ContextName: contextName,
		Namespace:   namespace,
		PodName:     podName,
		Container:   containerName,
		TailLines:   80,
		Previous:    previous,
	})
	if err != nil {
		return "", "", err.Error()
	}
	if result == nil || result.Logs == "" {
		return "", "", ""
	}
	source := "current"
	if previous {
		source = "previous"
	}
	return trimLog(result.Logs), source, ""
}

func trimLog(value string) string {
	lines := strings.Split(strings.TrimSpace(value), "\n")
	if len(lines) > 80 {
		lines = lines[len(lines)-80:]
	}
	joined := strings.Join(lines, "\n")
	if len(joined) > 12000 {
		joined = joined[len(joined)-12000:]
	}
	return joined
}

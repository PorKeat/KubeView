package cluster

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/remotecommand"
	"sigs.k8s.io/yaml"
)

// ContainerInfo provides runtime status of an individual container
type ContainerInfo struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	Ready        bool   `json:"ready"`
	RestartCount int32  `json:"restartCount"`
	State        string `json:"state"`
	StateReason  string `json:"stateReason,omitempty"`
}

// PodSummary provides display-ready metadata and metrics for list/detail views
type PodSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Status            string            `json:"status"`
	Ready             string            `json:"ready"`
	Restarts          int32             `json:"restarts"`
	Age               string            `json:"age"`
	Cpu               string            `json:"cpu"`
	CpuPercent        int               `json:"cpuPercent"`
	Memory            string            `json:"memory"`
	MemoryPercent     int               `json:"memoryPercent"`
	NodeName          string            `json:"nodeName"`
	IP                string            `json:"ip"`
	Containers        []ContainerInfo   `json:"containers"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	ControlledBy      string            `json:"controlledBy,omitempty"`
}

type ListPodsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

type ListPodsResult struct {
	Items      []PodSummary `json:"items"`
	TotalCount int          `json:"totalCount"`
}

type PodLogsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	PodName     string `json:"podName"`
	Container   string `json:"container,omitempty"`
	TailLines   int64  `json:"tailLines,omitempty"`
	Previous    bool   `json:"previous,omitempty"`
}

type PodLogsResult struct {
	Logs       string   `json:"logs"`
	Container  string   `json:"container"`
	Containers []string `json:"containers"`
}

type DeletePodParams struct {
	ContextName        string `json:"contextName"`
	Namespace          string `json:"namespace"`
	PodName            string `json:"podName"`
	GracePeriodSeconds *int64 `json:"gracePeriodSeconds,omitempty"`
}

type RestartPodParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	PodName     string `json:"podName"`
}

type ExecPodParams struct {
	ContextName string   `json:"contextName"`
	Namespace   string   `json:"namespace"`
	PodName     string   `json:"podName"`
	Container   string   `json:"container,omitempty"`
	Command     []string `json:"command"`
}

type ExecPodResult struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
}

type PodEventItem struct {
	Type          string `json:"type"`
	Reason        string `json:"reason"`
	Message       string `json:"message"`
	Count         int32  `json:"count"`
	LastTimestamp string `json:"lastTimestamp"`
	Source        string `json:"source"`
}

type PodEventsResult struct {
	Events []PodEventItem `json:"events"`
}

type PodYamlResult struct {
	YAML string `json:"yaml"`
}

// ListPods queries pods in the specified namespace (or all namespaces if empty / "all")
func (m *Manager) ListPods(ctx context.Context, contextName, namespace string) (*ListPodsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	podList, err := client.CoreV1().Pods(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	var items []PodSummary
	for _, p := range podList.Items {
		items = append(items, convertPodToSummary(&p))
	}

	return &ListPodsResult{
		Items:      items,
		TotalCount: len(items),
	}, nil
}

// GetPodLogs fetches the log stream for a specific container in a pod
func (m *Manager) GetPodLogs(ctx context.Context, p PodLogsParams) (*PodLogsResult, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod %s: %w", p.PodName, err)
	}

	var containerNames []string
	for _, c := range pod.Spec.Containers {
		containerNames = append(containerNames, c.Name)
	}
	for _, c := range pod.Spec.InitContainers {
		containerNames = append(containerNames, c.Name)
	}

	selectedContainer := p.Container
	if selectedContainer == "" {
		if len(containerNames) > 0 {
			selectedContainer = containerNames[0]
		}
	}

	opts := &corev1.PodLogOptions{
		Container: selectedContainer,
		Previous:  p.Previous,
	}
	if p.TailLines > 0 {
		opts.TailLines = &p.TailLines
	} else {
		defaultTail := int64(500)
		opts.TailLines = &defaultTail
	}

	req := client.CoreV1().Pods(p.Namespace).GetLogs(p.PodName, opts)
	stream, err := req.Stream(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to open log stream: %w", err)
	}
	defer stream.Close()

	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, stream)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read log stream: %w", err)
	}

	return &PodLogsResult{
		Logs:       buf.String(),
		Container:  selectedContainer,
		Containers: containerNames,
	}, nil
}

// DeletePod terminates a pod in the specified namespace
func (m *Manager) DeletePod(ctx context.Context, p DeletePodParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	opts := metav1.DeleteOptions{}
	if p.GracePeriodSeconds != nil {
		opts.GracePeriodSeconds = p.GracePeriodSeconds
	}

	if err := client.CoreV1().Pods(p.Namespace).Delete(ctx, p.PodName, opts); err != nil {
		return fmt.Errorf("failed to delete pod %s: %w", p.PodName, err)
	}

	return nil
}

// RestartPod triggers restart of a pod by deleting it so its controller recreates it,
// or recreating it if standalone
func (m *Manager) RestartPod(ctx context.Context, p RestartPodParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to inspect pod %s for restart: %w", p.PodName, err)
	}

	isControlled := len(pod.OwnerReferences) > 0

	// Delete current pod
	if err := client.CoreV1().Pods(p.Namespace).Delete(ctx, p.PodName, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to terminate pod %s: %w", p.PodName, err)
	}

	// If standalone, re-create from clean spec
	if !isControlled {
		newPod := &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:        pod.Name,
				Namespace:   pod.Namespace,
				Labels:      pod.Labels,
				Annotations: pod.Annotations,
			},
			Spec: pod.Spec,
		}
		newPod.Spec.NodeName = "" // Let scheduler re-place it
		_, _ = client.CoreV1().Pods(p.Namespace).Create(ctx, newPod, metav1.CreateOptions{})
	}

	return nil
}

// ExecPod runs a command inside the selected pod container and returns stdout/stderr/exitCode
func (m *Manager) ExecPod(ctx context.Context, p ExecPodParams) (*ExecPodResult, error) {
	client, restConfig, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("pod %s not found: %w", p.PodName, err)
	}

	containerName := p.Container
	if containerName == "" && len(pod.Spec.Containers) > 0 {
		containerName = pod.Spec.Containers[0].Name
	}

	cmd := p.Command
	if len(cmd) == 0 {
		cmd = []string{"/bin/sh", "-c", "echo 'KubeView shell session active'; uname -a; uptime"}
	}

	req := client.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(p.PodName).
		Namespace(p.Namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: containerName,
			Command:   cmd,
			Stdout:    true,
			Stderr:    true,
			TTY:       false,
		}, scheme.ParameterCodec)

	executor, err := remotecommand.NewSPDYExecutor(restConfig, "POST", req.URL())
	if err != nil {
		return nil, fmt.Errorf("failed to create SPDY executor: %w", err)
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	execErr := executor.StreamWithContext(ctx, remotecommand.StreamOptions{
		Stdout: &stdoutBuf,
		Stderr: &stderrBuf,
	})

	exitCode := 0
	if execErr != nil {
		if exitErr, ok := execErr.(interface{ ExitStatus() int }); ok {
			exitCode = exitErr.ExitStatus()
		} else {
			exitCode = 1
		}
	}

	return &ExecPodResult{
		Stdout:   stdoutBuf.String(),
		Stderr:   stderrBuf.String(),
		ExitCode: exitCode,
	}, nil
}

// GetPodYaml exports the live Kubernetes resource definition as YAML
func (m *Manager) GetPodYaml(ctx context.Context, contextName, namespace, podName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	pod, err := client.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod %s: %w", podName, err)
	}

	// Clean internal noise
	pod.ManagedFields = nil

	data, err := yaml.Marshal(pod)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal pod to YAML: %w", err)
	}

	return &PodYamlResult{
		YAML: string(data),
	}, nil
}

// GetPodEvents retrieves recent cluster events involving this pod
func (m *Manager) GetPodEvents(ctx context.Context, contextName, namespace, podName string) (*PodEventsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	fieldSelector := fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod", podName)
	events, err := client.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fieldSelector,
		Limit:         30,
	})
	if err != nil {
		return &PodEventsResult{Events: []PodEventItem{}}, nil
	}

	var items []PodEventItem
	for _, e := range events.Items {
		ts := e.LastTimestamp.Time.Format(time.RFC3339)
		if e.LastTimestamp.IsZero() {
			ts = e.EventTime.Time.Format(time.RFC3339)
		}
		items = append(items, PodEventItem{
			Type:          e.Type,
			Reason:        e.Reason,
			Message:       e.Message,
			Count:         e.Count,
			LastTimestamp: ts,
			Source:        e.Source.Component,
		})
	}

	return &PodEventsResult{Events: items}, nil
}

// Helper: convertPodToSummary transforms a client-go Pod into a UI-ready PodSummary
func convertPodToSummary(pod *corev1.Pod) PodSummary {
	var totalContainers int = len(pod.Spec.Containers)
	var readyContainers int = 0
	var totalRestarts int32 = 0
	var containerInfos []ContainerInfo

	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyContainers++
		}
		totalRestarts += cs.RestartCount

		stateStr := "Unknown"
		reasonStr := ""
		if cs.State.Running != nil {
			stateStr = "Running"
		} else if cs.State.Waiting != nil {
			stateStr = "Waiting"
			reasonStr = cs.State.Waiting.Reason
		} else if cs.State.Terminated != nil {
			stateStr = "Terminated"
			reasonStr = cs.State.Terminated.Reason
		}

		containerInfos = append(containerInfos, ContainerInfo{
			Name:         cs.Name,
			Image:        cs.Image,
			Ready:        cs.Ready,
			RestartCount: cs.RestartCount,
			State:        stateStr,
			StateReason:  reasonStr,
		})
	}

	// Status resolution (align with kubectl)
	status := string(pod.Status.Phase)
	if pod.DeletionTimestamp != nil {
		status = "Terminating"
	} else {
		// Check for container failures
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
				status = cs.State.Waiting.Reason
				break
			}
			if cs.State.Terminated != nil && cs.State.Terminated.Reason != "" {
				status = cs.State.Terminated.Reason
				break
			}
		}
	}

	// Calculate CPU & Memory requests
	var cpuMillis int64 = 0
	var memBytes int64 = 0
	var cpuLimitMillis int64 = 0
	var memLimitBytes int64 = 0

	for _, c := range pod.Spec.Containers {
		if req, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
			cpuMillis += req.MilliValue()
		}
		if req, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
			memBytes += req.Value()
		}
		if lim, ok := c.Resources.Limits[corev1.ResourceCPU]; ok {
			cpuLimitMillis += lim.MilliValue()
		}
		if lim, ok := c.Resources.Limits[corev1.ResourceMemory]; ok {
			memLimitBytes += lim.Value()
		}
	}

	cpuStr := "-"
	cpuPercent := 0
	if cpuMillis > 0 {
		cpuStr = fmt.Sprintf("%dm", cpuMillis)
		if cpuLimitMillis > 0 {
			cpuPercent = int((cpuMillis * 100) / cpuLimitMillis)
		} else {
			cpuPercent = int(cpuMillis / 20) // proportional scale
		}
		if cpuPercent > 100 {
			cpuPercent = 100
		}
	}

	memStr := "-"
	memPercent := 0
	if memBytes > 0 {
		memStr = formatBytes(memBytes)
		if memLimitBytes > 0 {
			memPercent = int((memBytes * 100) / memLimitBytes)
		} else {
			memPercent = int(memBytes / (1024 * 1024 * 10)) // proportional scale
		}
		if memPercent > 100 {
			memPercent = 100
		}
	}

	age := formatAge(time.Since(pod.CreationTimestamp.Time))

	controlledBy := ""
	if len(pod.OwnerReferences) > 0 {
		controlledBy = fmt.Sprintf("%s/%s", pod.OwnerReferences[0].Kind, pod.OwnerReferences[0].Name)
	}

	return PodSummary{
		Name:              pod.Name,
		Namespace:         pod.Namespace,
		Status:            status,
		Ready:             fmt.Sprintf("%d/%d", readyContainers, totalContainers),
		Restarts:          totalRestarts,
		Age:               age,
		Cpu:               cpuStr,
		CpuPercent:        cpuPercent,
		Memory:            memStr,
		MemoryPercent:     memPercent,
		NodeName:          pod.Spec.NodeName,
		IP:                pod.Status.PodIP,
		Containers:        containerInfos,
		CreationTimestamp: pod.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:            pod.Labels,
		Annotations:       pod.Annotations,
		ControlledBy:      controlledBy,
	}
}

func formatAge(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	days := int(d.Hours()) / 24
	return fmt.Sprintf("%dd", days)
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f%ci", float64(b)/float64(div), "KMGTPE"[exp])
}

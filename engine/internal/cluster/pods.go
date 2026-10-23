package cluster

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
	"sigs.k8s.io/yaml"
)

type ContainerEnvVar struct {
	Name      string `json:"name"`
	Value     string `json:"value,omitempty"`
	ValueFrom string `json:"valueFrom,omitempty"`
}

type ContainerPortInfo struct {
	Name          string `json:"name,omitempty"`
	ContainerPort int32  `json:"containerPort"`
	Protocol      string `json:"protocol,omitempty"`
}

type ContainerVolumeMountInfo struct {
	Name      string `json:"name"`
	MountPath string `json:"mountPath"`
	ReadOnly  bool   `json:"readOnly,omitempty"`
}

type ContainerResourceItem struct {
	Cpu    string `json:"cpu,omitempty"`
	Memory string `json:"memory,omitempty"`
}

type ContainerResourcesInfo struct {
	Requests *ContainerResourceItem `json:"requests,omitempty"`
	Limits   *ContainerResourceItem `json:"limits,omitempty"`
}

// ContainerInfo provides runtime status of an individual container
type ContainerInfo struct {
	Name                  string                     `json:"name"`
	Image                 string                     `json:"image"`
	Ready                 bool                       `json:"ready"`
	RestartCount          int32                      `json:"restartCount"`
	State                 string                     `json:"state"`
	StateReason           string                     `json:"stateReason,omitempty"`
	ExitCode              *int32                     `json:"exitCode,omitempty"`
	LastTerminatedReason  string                     `json:"lastTerminatedReason,omitempty"`
	LastTerminatedMessage string                     `json:"lastTerminatedMessage,omitempty"`
	WaitingReason         string                     `json:"waitingReason,omitempty"`
	WaitingMessage        string                     `json:"waitingMessage,omitempty"`
	Env                   []ContainerEnvVar          `json:"env,omitempty"`
	Ports                 []ContainerPortInfo        `json:"ports,omitempty"`
	VolumeMounts          []ContainerVolumeMountInfo `json:"volumeMounts,omitempty"`
	Resources             *ContainerResourcesInfo    `json:"resources,omitempty"`
}

// PodConditionItem represents a live Kubernetes status condition
type PodConditionItem struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
}

// PodSummary provides display-ready metadata and metrics for list/detail views
type PodSummary struct {
	Name              string             `json:"name"`
	Namespace         string             `json:"namespace"`
	Status            string             `json:"status"`
	Ready             string             `json:"ready"`
	Restarts          int32              `json:"restarts"`
	Age               string             `json:"age"`
	Cpu               string             `json:"cpu"`
	CpuPercent        int                `json:"cpuPercent"`
	Memory            string             `json:"memory"`
	MemoryPercent     int                `json:"memoryPercent"`
	NodeName          string             `json:"nodeName"`
	IP                string             `json:"ip"`
	Containers        []ContainerInfo    `json:"containers"`
	CreationTimestamp string             `json:"creationTimestamp"`
	Labels            map[string]string  `json:"labels,omitempty"`
	Annotations       map[string]string  `json:"annotations,omitempty"`
	ControlledBy      string             `json:"controlledBy,omitempty"`
	QoSClass          string             `json:"qosClass,omitempty"`
	Conditions        []PodConditionItem `json:"conditions,omitempty"`
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
	ContextName  string `json:"contextName"`
	Namespace    string `json:"namespace"`
	PodName      string `json:"podName"`
	Container    string `json:"container,omitempty"`
	TailLines    int64  `json:"tailLines,omitempty"`
	Previous     bool   `json:"previous,omitempty"`
	Timestamps   bool   `json:"timestamps,omitempty"`
	SinceSeconds *int64 `json:"sinceSeconds,omitempty"`
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

type LaunchDebugContainerParams struct {
	ContextName     string `json:"contextName"`
	Namespace       string `json:"namespace"`
	PodName         string `json:"podName"`
	TargetContainer string `json:"targetContainer"`
	Image           string `json:"image,omitempty"`
}

type LaunchDebugContainerResult struct {
	ContainerName string `json:"containerName"`
	Success       bool   `json:"success"`
	Message       string `json:"message"`
}

type PodEventItem struct {
	Context                 string `json:"context,omitempty"`
	Type                    string `json:"type"`
	Reason                  string `json:"reason"`
	Message                 string `json:"message"`
	Count                   int32  `json:"count"`
	LastTimestamp           string `json:"lastTimestamp"`
	Source                  string `json:"source"`
	InvolvedObjectKind      string `json:"involvedObjectKind,omitempty"`
	InvolvedObjectName      string `json:"involvedObjectName,omitempty"`
	InvolvedObjectNamespace string `json:"involvedObjectNamespace,omitempty"`
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

	selectedContainer := p.Container
	var containerNames []string

	// Fast path: if container is already specified, avoid the extra network round-trip of Pod.Get
	if selectedContainer == "" {
		pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to get pod %s: %w", p.PodName, err)
		}

		for _, c := range pod.Spec.Containers {
			containerNames = append(containerNames, c.Name)
		}
		for _, c := range pod.Spec.InitContainers {
			containerNames = append(containerNames, c.Name)
		}
		if len(containerNames) > 0 {
			selectedContainer = containerNames[0]
		}
	} else {
		containerNames = []string{selectedContainer}
	}

	opts := &corev1.PodLogOptions{
		Container:  selectedContainer,
		Previous:   p.Previous,
		Timestamps: p.Timestamps,
	}
	if p.SinceSeconds != nil && *p.SinceSeconds > 0 {
		opts.SinceSeconds = p.SinceSeconds
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
		// When previous logs are requested and no previous container exists, return empty logs gracefully without failing RPC
		if p.Previous && (strings.Contains(strings.ToLower(err.Error()), "previous terminated container") || strings.Contains(strings.ToLower(err.Error()), "not found")) {
			return &PodLogsResult{
				Logs:       "",
				Container:  selectedContainer,
				Containers: containerNames,
			}, nil
		}
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

	m.InvalidateOverviewCache(p.ContextName)
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

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

func executeInContainer(ctx context.Context, client kubernetes.Interface, execConfig *rest.Config, namespace, podName, containerName string, cmd []string) (*ExecPodResult, error) {
	req := client.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: containerName,
			Command:   cmd,
			Stdout:    true,
			Stderr:    true,
			TTY:       false,
		}, scheme.ParameterCodec)

	executor, err := remotecommand.NewSPDYExecutor(execConfig, "POST", req.URL())
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
		if stderrBuf.Len() == 0 {
			stderrBuf.WriteString(execErr.Error())
		}
	}

	return &ExecPodResult{
		Stdout:   stdoutBuf.String(),
		Stderr:   stderrBuf.String(),
		ExitCode: exitCode,
	}, nil
}

// ExecPod runs a command inside the selected pod container and returns stdout/stderr/exitCode
func (m *Manager) ExecPod(ctx context.Context, p ExecPodParams) (*ExecPodResult, error) {
	client, restConfig, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	containerName := p.Container
	var pod *corev1.Pod
	if containerName == "" {
		var getErr error
		pod, getErr = client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("pod %s not found: %w", p.PodName, getErr)
		}
		if len(pod.Spec.Containers) > 0 {
			containerName = pod.Spec.Containers[0].Name
		}
	}

	cmd := p.Command
	if len(cmd) == 0 {
		cmd = []string{"/bin/sh", "-c", "echo 'KubeView shell session active'; uname -a; uptime"}
	}

	execConfig := rest.CopyConfig(restConfig)
	execConfig.Timeout = 0 // Required for SPDY / streaming connections!

	res, err := executeInContainer(ctx, client, execConfig, p.Namespace, p.PodName, containerName, cmd)
	isNoShellErr := (err == nil && res.ExitCode != 0 && (strings.Contains(res.Stderr, "no such file or directory") ||
		strings.Contains(res.Stderr, "not found") ||
		strings.Contains(res.Stderr, "executable file not found") ||
		strings.Contains(res.Stderr, "OCI runtime exec failed")))

	isShellCmd := len(cmd) >= 3 && (cmd[0] == "/bin/sh" || cmd[0] == "sh" ||
		cmd[0] == "/bin/bash" || cmd[0] == "bash" ||
		cmd[0] == "/bin/ash" || cmd[0] == "ash" ||
		cmd[0] == "/bin/zsh" || cmd[0] == "zsh")

	if isNoShellErr && isShellCmd {
		cmdPayload := cmd[2]
		fallbacks := [][]string{
			{"/bin/sh", "-c", cmdPayload},
			{"/bin/bash", "-c", cmdPayload},
			{"bash", "-c", cmdPayload},
			{"/bin/ash", "-c", cmdPayload},
			{"ash", "-c", cmdPayload},
			{"sh", "-c", cmdPayload},
			strings.Fields(cmdPayload), // Direct binary execution for distroless (e.g. "woodpecker-server version")
		}
		for _, fb := range fallbacks {
			if len(fb) == 0 || fb[0] == cmd[0] {
				continue
			}
			fbRes, fbErr := executeInContainer(ctx, client, execConfig, p.Namespace, p.PodName, containerName, fb)
			if fbErr == nil && !strings.Contains(fbRes.Stderr, "no such file or directory") && !strings.Contains(fbRes.Stderr, "not found") && !strings.Contains(fbRes.Stderr, "OCI runtime exec failed") {
				return fbRes, nil
			}
		}

		// If all fallbacks failed, provide clear and actionable distroless container guidance
		if pod == nil {
			pod, _ = client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
		}
		otherContainers := []string{}
		if pod != nil {
			for _, c := range pod.Spec.Containers {
				if c.Name != containerName {
					otherContainers = append(otherContainers, c.Name)
				}
			}
		}
		otherHint := ""
		if len(otherContainers) > 0 {
			otherHint = fmt.Sprintf("• Alternative container(s) in this pod: %s (try selecting from container dropdown above)\n", strings.Join(otherContainers, ", "))
		}

		res.Stderr = fmt.Sprintf(
			"Distroless or minimal container: No shell environment (/bin/sh, /bin/bash, /bin/ash) found in container '%s'.\n\n"+
				"• Container '%s' only includes compiled application binaries without standard shell tools (ls, ps).\n"+
				"%s"+
				"• To run full diagnostic tools, attach an ephemeral debug container:\n"+
				"  kubectl debug -it -n %s %s --image=busybox --target=%s\n",
			containerName, containerName, otherHint, p.Namespace, p.PodName, containerName,
		)
	}

	return res, err
}

// LaunchDebugContainer attaches an ephemeral debug container with full Unix tools to a running pod
func (m *Manager) LaunchDebugContainer(ctx context.Context, p LaunchDebugContainerParams) (*LaunchDebugContainerResult, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pod %s: %w", p.PodName, err)
	}

	// Check if a debug container targeting this container is already running
	for _, ec := range pod.Status.EphemeralContainerStatuses {
		if ec.State.Running != nil {
			for _, specEC := range pod.Spec.EphemeralContainers {
				if specEC.Name == ec.Name && (specEC.TargetContainerName == p.TargetContainer || p.TargetContainer == "") {
					return &LaunchDebugContainerResult{
						ContainerName: ec.Name,
						Success:       true,
						Message:       fmt.Sprintf("Reusing active debug container '%s'", ec.Name),
					}, nil
				}
			}
		}
	}

	img := p.Image
	if img == "" {
		img = "busybox:stable-musl"
	}

	cleanTarget := strings.ReplaceAll(p.TargetContainer, "_", "-")
	if cleanTarget == "" {
		cleanTarget = "app"
	}
	debugName := fmt.Sprintf("debug-%s-%d", cleanTarget, time.Now().Unix()%10000)
	if len(debugName) > 40 {
		debugName = debugName[:40]
	}

	ephem := corev1.EphemeralContainer{
		TargetContainerName: p.TargetContainer,
		EphemeralContainerCommon: corev1.EphemeralContainerCommon{
			Name:                     debugName,
			Image:                    img,
			Command:                  []string{"sh"},
			Stdin:                    true,
			TTY:                      true,
			TerminationMessagePolicy: corev1.TerminationMessageReadFile,
			ImagePullPolicy:          corev1.PullIfNotPresent,
		},
	}

	pod.Spec.EphemeralContainers = append(pod.Spec.EphemeralContainers, ephem)

	_, err = client.CoreV1().Pods(p.Namespace).UpdateEphemeralContainers(ctx, p.PodName, pod, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to attach ephemeral debug container: %w", err)
	}

	// Wait up to 8 seconds for container to enter Running status
	timeoutCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	ticker := time.NewTicker(400 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-timeoutCtx.Done():
			m.InvalidateOverviewCache(p.ContextName)
			return &LaunchDebugContainerResult{
				ContainerName: debugName,
				Success:       true,
				Message:       fmt.Sprintf("Debug container '%s' created (image pull in progress)", debugName),
			}, nil
		case <-ticker.C:
			current, err := client.CoreV1().Pods(p.Namespace).Get(timeoutCtx, p.PodName, metav1.GetOptions{})
			if err == nil {
				for _, status := range current.Status.EphemeralContainerStatuses {
					if status.Name == debugName {
						if status.State.Running != nil {
							m.InvalidateOverviewCache(p.ContextName)
							return &LaunchDebugContainerResult{
								ContainerName: debugName,
								Success:       true,
								Message:       fmt.Sprintf("Debug container '%s' is ready", debugName),
							}, nil
						} else if status.State.Waiting != nil && status.State.Waiting.Reason == "CrashLoopBackOff" {
							return nil, fmt.Errorf("debug container failed: %s", status.State.Waiting.Message)
						}
					}
				}
			}
		}
	}
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

	pod.TypeMeta = metav1.TypeMeta{APIVersion: "v1", Kind: "Pod"}

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
			Type:                    e.Type,
			Reason:                  e.Reason,
			Message:                 e.Message,
			Count:                   e.Count,
			LastTimestamp:           ts,
			Source:                  e.Source.Component,
			InvolvedObjectKind:      e.InvolvedObject.Kind,
			InvolvedObjectName:      e.InvolvedObject.Name,
			InvolvedObjectNamespace: e.InvolvedObject.Namespace,
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

	specContainerMap := make(map[string]corev1.Container)
	for _, sc := range pod.Spec.Containers {
		specContainerMap[sc.Name] = sc
	}
	for _, sc := range pod.Spec.InitContainers {
		specContainerMap[sc.Name] = sc
	}

	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyContainers++
		}
		totalRestarts += cs.RestartCount

		stateStr := "Unknown"
		reasonStr := ""
		var waitingReason string
		var waitingMsg string
		if cs.State.Running != nil {
			stateStr = "Running"
		} else if cs.State.Waiting != nil {
			stateStr = "Waiting"
			reasonStr = cs.State.Waiting.Reason
			waitingReason = cs.State.Waiting.Reason
			waitingMsg = cs.State.Waiting.Message
		} else if cs.State.Terminated != nil {
			stateStr = "Terminated"
			reasonStr = cs.State.Terminated.Reason
		}

		var exitCode *int32
		var lastTermReason string
		var lastTermMsg string
		if cs.LastTerminationState.Terminated != nil {
			ec := cs.LastTerminationState.Terminated.ExitCode
			exitCode = &ec
			lastTermReason = cs.LastTerminationState.Terminated.Reason
			lastTermMsg = cs.LastTerminationState.Terminated.Message
		}

		var envList []ContainerEnvVar
		var portsList []ContainerPortInfo
		var volumeMountsList []ContainerVolumeMountInfo
		var resourcesInfo *ContainerResourcesInfo

		if sc, found := specContainerMap[cs.Name]; found {
			for _, env := range sc.Env {
				valFrom := ""
				if env.ValueFrom != nil {
					if env.ValueFrom.SecretKeyRef != nil {
						valFrom = fmt.Sprintf("Secret:%s[%s]", env.ValueFrom.SecretKeyRef.Name, env.ValueFrom.SecretKeyRef.Key)
					} else if env.ValueFrom.ConfigMapKeyRef != nil {
						valFrom = fmt.Sprintf("ConfigMap:%s[%s]", env.ValueFrom.ConfigMapKeyRef.Name, env.ValueFrom.ConfigMapKeyRef.Key)
					} else if env.ValueFrom.FieldRef != nil {
						valFrom = fmt.Sprintf("Field:%s", env.ValueFrom.FieldRef.FieldPath)
					} else {
						valFrom = "DynamicRef"
					}
				}
				envList = append(envList, ContainerEnvVar{
					Name:      env.Name,
					Value:     env.Value,
					ValueFrom: valFrom,
				})
			}

			for _, p := range sc.Ports {
				portsList = append(portsList, ContainerPortInfo{
					Name:          p.Name,
					ContainerPort: p.ContainerPort,
					Protocol:      string(p.Protocol),
				})
			}

			for _, vm := range sc.VolumeMounts {
				volumeMountsList = append(volumeMountsList, ContainerVolumeMountInfo{
					Name:      vm.Name,
					MountPath: vm.MountPath,
					ReadOnly:  vm.ReadOnly,
				})
			}

			var reqItem, limItem *ContainerResourceItem
			if len(sc.Resources.Requests) > 0 {
				reqItem = &ContainerResourceItem{}
				if cpu, ok := sc.Resources.Requests[corev1.ResourceCPU]; ok {
					reqItem.Cpu = cpu.String()
				}
				if mem, ok := sc.Resources.Requests[corev1.ResourceMemory]; ok {
					reqItem.Memory = mem.String()
				}
			}
			if len(sc.Resources.Limits) > 0 {
				limItem = &ContainerResourceItem{}
				if cpu, ok := sc.Resources.Limits[corev1.ResourceCPU]; ok {
					limItem.Cpu = cpu.String()
				}
				if mem, ok := sc.Resources.Limits[corev1.ResourceMemory]; ok {
					limItem.Memory = mem.String()
				}
			}
			if reqItem != nil || limItem != nil {
				resourcesInfo = &ContainerResourcesInfo{
					Requests: reqItem,
					Limits:   limItem,
				}
			}
		}

		containerInfos = append(containerInfos, ContainerInfo{
			Name:                  cs.Name,
			Image:                 cs.Image,
			Ready:                 cs.Ready,
			RestartCount:          cs.RestartCount,
			State:                 stateStr,
			StateReason:           reasonStr,
			ExitCode:              exitCode,
			LastTerminatedReason:  lastTermReason,
			LastTerminatedMessage: lastTermMsg,
			WaitingReason:         waitingReason,
			WaitingMessage:        waitingMsg,
			Env:                   envList,
			Ports:                 portsList,
			VolumeMounts:          volumeMountsList,
			Resources:             resourcesInfo,
		})
	}

	// Include running ephemeral debug containers
	for _, ecs := range pod.Status.EphemeralContainerStatuses {
		stateStr := "Unknown"
		reasonStr := ""
		if ecs.State.Running != nil {
			stateStr = "Running"
		} else if ecs.State.Waiting != nil {
			stateStr = "Waiting"
			reasonStr = ecs.State.Waiting.Reason
		} else if ecs.State.Terminated != nil {
			stateStr = "Terminated"
			reasonStr = ecs.State.Terminated.Reason
		}
		containerInfos = append(containerInfos, ContainerInfo{
			Name:         ecs.Name,
			Image:        ecs.Image,
			Ready:        ecs.Ready,
			RestartCount: ecs.RestartCount,
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

	// Real Kubernetes Pod Conditions from pod.Status.Conditions
	var conditionItems []PodConditionItem
	for _, c := range pod.Status.Conditions {
		transTime := ""
		if !c.LastTransitionTime.IsZero() {
			transTime = c.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditionItems = append(conditionItems, PodConditionItem{
			Type:               string(c.Type),
			Status:             string(c.Status),
			LastTransitionTime: transTime,
			Reason:             c.Reason,
			Message:            c.Message,
		})
	}

	qosClass := string(pod.Status.QOSClass)

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
		QoSClass:          qosClass,
		Conditions:        conditionItems,
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

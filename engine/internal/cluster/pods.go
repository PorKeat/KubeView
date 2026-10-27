package cluster

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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

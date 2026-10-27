package poddiagnosis

import "github.com/kubeview/engine/internal/cluster"

type DiagnoseParams struct {
	ContextName string `json:"contextName,omitempty"`
	Namespace   string `json:"namespace"`
	PodName     string `json:"podName"`
}

type Container struct {
	Name                  string                         `json:"name"`
	Image                 string                         `json:"image"`
	Ready                 bool                           `json:"ready"`
	RestartCount          int32                          `json:"restartCount"`
	State                 string                         `json:"state"`
	StateReason           string                         `json:"stateReason,omitempty"`
	StateMessage          string                         `json:"stateMessage,omitempty"`
	ExitCode              *int32                         `json:"exitCode,omitempty"`
	LastTerminatedReason  string                         `json:"lastTerminatedReason,omitempty"`
	LastTerminatedMessage string                         `json:"lastTerminatedMessage,omitempty"`
	Requests              *cluster.ContainerResourceItem `json:"requests,omitempty"`
	Limits                *cluster.ContainerResourceItem `json:"limits,omitempty"`
	CPUUsageMillicores    int64                          `json:"cpuUsageMillicores,omitempty"`
	MemoryUsageBytes      int64                          `json:"memoryUsageBytes,omitempty"`
	MetricsAvailable      bool                           `json:"metricsAvailable"`
	Probes                []Probe                        `json:"probes"`
	LogExcerpt            string                         `json:"logExcerpt,omitempty"`
	LogSource             string                         `json:"logSource,omitempty"`
	LogError              string                         `json:"logError,omitempty"`
}

type Probe struct {
	Kind                string `json:"kind"`
	Configured          bool   `json:"configured"`
	Handler             string `json:"handler,omitempty"`
	InitialDelaySeconds int32  `json:"initialDelaySeconds,omitempty"`
	TimeoutSeconds      int32  `json:"timeoutSeconds,omitempty"`
	PeriodSeconds       int32  `json:"periodSeconds,omitempty"`
	FailureThreshold    int32  `json:"failureThreshold,omitempty"`
	SuccessThreshold    int32  `json:"successThreshold,omitempty"`
	Status              string `json:"status"`
	Message             string `json:"message,omitempty"`
}

type Evidence struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Status  string   `json:"status"`
	Summary string   `json:"summary"`
	Details []string `json:"details,omitempty"`
}

type Command struct {
	Label       string `json:"label"`
	Command     string `json:"command"`
	Description string `json:"description,omitempty"`
}

type Fix struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

type Result struct {
	ContextName       string                     `json:"contextName"`
	Namespace         string                     `json:"namespace"`
	PodName           string                     `json:"podName"`
	GeneratedAt       string                     `json:"generatedAt"`
	Severity          string                     `json:"severity"`
	IssueType         string                     `json:"issueType"`
	Healthy           bool                       `json:"healthy"`
	Title             string                     `json:"title"`
	Summary           string                     `json:"summary"`
	RootCause         string                     `json:"rootCause"`
	OwnerKind         string                     `json:"ownerKind,omitempty"`
	OwnerName         string                     `json:"ownerName,omitempty"`
	NodeName          string                     `json:"nodeName,omitempty"`
	Conditions        []cluster.PodConditionItem `json:"conditions"`
	Containers        []Container                `json:"containers"`
	Events            []cluster.PodEventItem     `json:"events"`
	Evidence          []Evidence                 `json:"evidence"`
	SuggestedCommands []Command                  `json:"suggestedCommands"`
	SuggestedFixes    []Fix                      `json:"suggestedFixes"`
}

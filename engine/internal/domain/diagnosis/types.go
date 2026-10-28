package diagnosis

import "time"

// Pod phases reproduced from the Kubernetes API so the analyzer never has to
// depend on k8s.io types.
const (
	PhasePending = "Pending"
	PhaseRunning = "Running"
	PhaseFailed  = "Failed"
)

// Pod condition names and values used by the analyzer.
const (
	ConditionTrue           = "True"
	ConditionPodScheduled   = "PodScheduled"
	ConditionPodInitialized = "PodInitialized"
)

// EventTypeWarning is the Kubernetes event type for warning events.
const EventTypeWarning = "Warning"

// Diagnosis statuses reported on evidence and probes.
const (
	StatusPass    = "pass"
	StatusWarning = "warning"
	StatusFail    = "fail"
)

// Severities used by diagnosis results and suggested fixes.
const (
	SeverityHealthy  = "healthy"
	SeverityInfo     = "info"
	SeverityWarning  = "warning"
	SeverityCritical = "critical"
)

// IssueHealthy is the issue type reported when no failure is detected.
const IssueHealthy = "healthy"

// ResourceList is a container's CPU and memory quantities as Kubernetes
// serializes them (for example "100m" and "128Mi").
type ResourceList struct {
	CPU    string
	Memory string
}

// Condition is a pod status condition. LastTransitionTime is formatted the
// same way Kubernetes reports it (RFC3339) so ordering and wire output stay
// stable.
type Condition struct {
	Type               string
	Status             string
	LastTransitionTime string
	Reason             string
	Message            string
}

// Event is a Kubernetes event involving the diagnosed pod. LastTimestamp is
// an RFC3339 timestamp; the analyzer sorts events by this value.
type Event struct {
	Context                 string
	Type                    string
	Reason                  string
	Message                 string
	Count                   int32
	LastTimestamp           string
	Source                  string
	InvolvedObjectKind      string
	InvolvedObjectName      string
	InvolvedObjectNamespace string
}

// PodSnapshot is the transport-independent state of the pod under diagnosis.
type PodSnapshot struct {
	Name       string
	Namespace  string
	Phase      string
	NodeName   string
	Conditions []Condition
	OwnerKind  string
	OwnerName  string
}

// Probe is the observed configuration and status of a container probe.
type Probe struct {
	Kind                string
	Configured          bool
	Handler             string
	InitialDelaySeconds int32
	TimeoutSeconds      int32
	PeriodSeconds       int32
	FailureThreshold    int32
	SuccessThreshold    int32
	Status              string
	Message             string
}

// Container is the runtime state, resource configuration, probe status, and
// log evidence collected for one pod container.
type Container struct {
	Name                  string
	Image                 string
	Ready                 bool
	RestartCount          int32
	State                 string
	StateReason           string
	StateMessage          string
	ExitCode              *int32
	LastTerminatedReason  string
	LastTerminatedMessage string
	Requests              *ResourceList
	Limits                *ResourceList
	CPUUsageMillicores    int64
	MemoryUsageBytes      int64
	MetricsAvailable      bool
	Probes                []Probe
	LogExcerpt            string
	LogSource             string
	LogError              string
}

// Evidence is one supporting observation rendered by the diagnosis UI.
type Evidence struct {
	ID      string
	Label   string
	Status  string
	Summary string
	Details []string
}

// Command is a suggested kubectl command.
type Command struct {
	Label       string
	Command     string
	Description string
}

// Fix is a suggested remediation.
type Fix struct {
	ID          string
	Title       string
	Description string
	Severity    string
}

// Snapshot bundles every piece of evidence collected for one pod. It is the
// input to the pure analyzer.
type Snapshot struct {
	ContextName      string
	Pod              PodSnapshot
	Containers       []Container
	Events           []Event
	MetricsAvailable bool
}

// Result is the complete, transport-independent diagnosis report.
type Result struct {
	ContextName       string
	Namespace         string
	PodName           string
	GeneratedAt       time.Time
	Severity          string
	IssueType         string
	Healthy           bool
	Title             string
	Summary           string
	RootCause         string
	OwnerKind         string
	OwnerName         string
	NodeName          string
	Conditions        []Condition
	Containers        []Container
	Events            []Event
	Evidence          []Evidence
	SuggestedCommands []Command
	SuggestedFixes    []Fix
}

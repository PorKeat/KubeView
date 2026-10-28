package diagnosis

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

type finding struct {
	issueType string
	severity  string
	title     string
	summary   string
	rootCause string
	container string
}

// Analyze correlates pod state, events, containers, probes, resources, and
// logs into one diagnosis. It is pure: all cluster-derived data must arrive
// through the snapshot.
func Analyze(snapshot *Snapshot) *Result {
	if snapshot == nil {
		return nil
	}

	sortedEvents := append([]Event{}, snapshot.Events...)
	sort.SliceStable(sortedEvents, func(i, j int) bool {
		return sortedEvents[i].LastTimestamp > sortedEvents[j].LastTimestamp
	})
	if len(sortedEvents) > 12 {
		sortedEvents = sortedEvents[:12]
	}

	resultFinding := detectFinding(snapshot.Pod, snapshot.Containers, sortedEvents)
	if signal := logSignal(snapshot.Containers); signal != "" {
		resultFinding.rootCause += " " + signal
	}

	return &Result{
		ContextName:       snapshot.ContextName,
		Namespace:         snapshot.Pod.Namespace,
		PodName:           snapshot.Pod.Name,
		GeneratedAt:       time.Now().UTC(),
		Severity:          resultFinding.severity,
		IssueType:         resultFinding.issueType,
		Healthy:           resultFinding.issueType == IssueHealthy,
		Title:             resultFinding.title,
		Summary:           resultFinding.summary,
		RootCause:         resultFinding.rootCause,
		OwnerKind:         snapshot.Pod.OwnerKind,
		OwnerName:         snapshot.Pod.OwnerName,
		NodeName:          snapshot.Pod.NodeName,
		Conditions:        snapshot.Pod.Conditions,
		Containers:        snapshot.Containers,
		Events:            sortedEvents,
		Evidence:          buildEvidence(snapshot.Pod, snapshot.Containers, sortedEvents, resultFinding, snapshot.MetricsAvailable),
		SuggestedCommands: buildCommands(snapshot.Pod, snapshot.Containers, resultFinding, snapshot.MetricsAvailable),
		SuggestedFixes:    buildFixes(snapshot.Containers, resultFinding),
	}
}

func detectFinding(pod PodSnapshot, containers []Container, events []Event) finding {
	if pod.Phase == PhasePending && !conditionTrue(pod.Conditions, ConditionPodScheduled) {
		message := conditionMessage(pod.Conditions, ConditionPodScheduled)
		if message == "" {
			message = eventMessage(events, "FailedScheduling")
		}
		if message == "" {
			message = "The scheduler could not place this pod on a node."
		}
		return finding{
			issueType: "scheduling",
			severity:  SeverityCritical,
			title:     "Pod Cannot Be Scheduled",
			summary:   "The pod is Pending because Kubernetes has not assigned it to a node.",
			rootCause: message,
		}
	}

	for _, container := range containers {
		if issue := containerIssue(container); issue != nil {
			return *issue
		}
	}

	for _, container := range containers {
		if probe := firstFailingProbe(container.Probes); probe != nil {
			message := probe.Message
			if message == "" {
				message = fmt.Sprintf("%s probe is failing for container '%s'.", probe.Kind, container.Name)
			}
			return finding{
				issueType: "probe",
				severity:  SeverityWarning,
				title:     fmt.Sprintf("%s Probe Failing", titleCase(probe.Kind)),
				summary:   fmt.Sprintf("Container '%s' is running but Kubernetes reports an unhealthy probe.", container.Name),
				rootCause: message,
				container: container.Name,
			}
		}
		if container.State == "Running" && !container.Ready {
			return finding{
				issueType: "probe",
				severity:  SeverityWarning,
				title:     "Container Not Ready",
				summary:   fmt.Sprintf("Container '%s' is running but is excluded from service traffic.", container.Name),
				rootCause: "The container is running, but its readiness condition is false. Check the readiness probe endpoint and application health.",
				container: container.Name,
			}
		}
	}

	if pod.Phase == PhaseFailed {
		return finding{
			issueType: "runtime",
			severity:  SeverityCritical,
			title:     "Pod Failed",
			summary:   "The pod reached a terminal Failed phase.",
			rootCause: "Kubernetes marked the pod as Failed. Inspect the container exit status and the most recent events.",
		}
	}

	if pod.Phase == PhasePending {
		return finding{
			issueType: "pending",
			severity:  SeverityWarning,
			title:     "Pod Is Still Starting",
			summary:   "The pod has been scheduled but is not ready yet.",
			rootCause: "Container initialization is still in progress. Check image pulls, volume mounts, and init container logs if this persists.",
		}
	}

	return finding{
		issueType: IssueHealthy,
		severity:  SeverityHealthy,
		title:     "No Active Failure Detected",
		summary:   "The pod is running and all containers are ready.",
		rootCause: "No failure indicators were found in pod status, conditions, events, probes, or recent logs.",
	}
}

func containerIssue(container Container) *finding {
	if isOOM(container) {
		limit := "not configured"
		if container.Limits != nil && container.Limits.Memory != "" {
			limit = container.Limits.Memory
		}
		message := lastMessage(container)
		if message == "" {
			message = fmt.Sprintf("Container '%s' exceeded its memory limit and was OOMKilled (exit 137).", container.Name)
		}
		return &finding{
			issueType: "oom",
			severity:  SeverityCritical,
			title:     "Out Of Memory (OOMKilled)",
			summary:   fmt.Sprintf("Container '%s' was killed after exceeding its memory limit.", container.Name),
			rootCause: fmt.Sprintf("%s Memory limit: %s.", message, limit),
			container: container.Name,
		}
	}

	reason := strings.ToLower(container.StateReason + " " + container.LastTerminatedReason)
	if strings.Contains(reason, "imagepullbackoff") || strings.Contains(reason, "errimagepull") || strings.Contains(reason, "invalidimagename") {
		message := lastMessage(container)
		if message == "" {
			message = fmt.Sprintf("Kubernetes cannot pull image '%s'.", container.Image)
		}
		return &finding{
			issueType: "image",
			severity:  SeverityCritical,
			title:     "Image Pull Failure",
			summary:   fmt.Sprintf("Container '%s' cannot start because its image is unavailable.", container.Name),
			rootCause: message,
			container: container.Name,
		}
	}

	if strings.Contains(reason, "createcontainerconfigerror") || strings.Contains(reason, "createcontainererror") {
		message := lastMessage(container)
		if message == "" {
			message = "The kubelet could not create the container because a referenced ConfigMap, Secret, or mount is invalid."
		}
		return &finding{
			issueType: "config",
			severity:  SeverityCritical,
			title:     "Container Configuration Error",
			summary:   fmt.Sprintf("Container '%s' could not be created.", container.Name),
			rootCause: message,
			container: container.Name,
		}
	}

	if strings.Contains(reason, "crashloopbackoff") {
		message := lastMessage(container)
		if message == "" {
			message = fmt.Sprintf("Container '%s' is repeatedly exiting during startup.", container.Name)
		}
		return &finding{
			issueType: "crash",
			severity:  SeverityCritical,
			title:     "CrashLoopBackOff",
			summary:   fmt.Sprintf("Container '%s' is crash-looping with %d restart(s).", container.Name, container.RestartCount),
			rootCause: message,
			container: container.Name,
		}
	}

	if container.ExitCode != nil && *container.ExitCode != 0 && container.State != "Running" {
		message := lastMessage(container)
		if message == "" {
			message = fmt.Sprintf("Container '%s' exited with code %d.", container.Name, *container.ExitCode)
		}
		return &finding{
			issueType: "runtime",
			severity:  SeverityCritical,
			title:     "Container Execution Failure",
			summary:   fmt.Sprintf("Container '%s' terminated with a non-zero exit code.", container.Name),
			rootCause: message,
			container: container.Name,
		}
	}
	return nil
}

func isOOM(container Container) bool {
	return container.LastTerminatedReason == "OOMKilled" ||
		container.StateReason == "OOMKilled" ||
		(container.ExitCode != nil && *container.ExitCode == 137)
}

func lastMessage(container Container) string {
	if container.StateMessage != "" {
		return container.StateMessage
	}
	if container.LastTerminatedMessage != "" {
		return container.LastTerminatedMessage
	}
	if container.StateReason != "" {
		return container.StateReason
	}
	return ""
}

func firstFailingProbe(probes []Probe) *Probe {
	for index := range probes {
		if probes[index].Status == StatusFail {
			return &probes[index]
		}
	}
	return nil
}

func logSignal(containers []Container) string {
	needles := []string{
		"panic:",
		"outofmemoryerror",
		"out of memory",
		"oomkilled",
		"connection refused",
		"permission denied",
		"no such file",
		"deadline exceeded",
		"fatal error",
	}
	for _, container := range containers {
		lower := strings.ToLower(container.LogExcerpt)
		for _, needle := range needles {
			if strings.Contains(lower, needle) {
				return fmt.Sprintf("The %s logs contain %q.", container.LogSource, needle)
			}
		}
	}
	return ""
}

func supportsRolloutRestart(kind string) bool {
	switch kind {
	case "Deployment", "StatefulSet", "DaemonSet":
		return true
	default:
		return false
	}
}

func containerByName(containers []Container, name string) *Container {
	for index := range containers {
		if containers[index].Name == name {
			return &containers[index]
		}
	}
	return nil
}

func conditionTrue(conditions []Condition, conditionType string) bool {
	for _, condition := range conditions {
		if condition.Type == conditionType {
			return condition.Status == ConditionTrue
		}
	}
	return false
}

func conditionMessage(conditions []Condition, conditionType string) string {
	for _, condition := range conditions {
		if condition.Type == conditionType && condition.Message != "" {
			return condition.Message
		}
	}
	return ""
}

func eventMessage(events []Event, reason string) string {
	for _, event := range events {
		if strings.EqualFold(event.Reason, reason) && event.Message != "" {
			return event.Message
		}
	}
	return ""
}

func titleCase(value string) string {
	if value == "" {
		return value
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

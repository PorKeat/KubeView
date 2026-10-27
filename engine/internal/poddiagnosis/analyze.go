package poddiagnosis

import (
	"fmt"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"

	"github.com/kubeview/engine/internal/cluster"
)

type finding struct {
	issueType string
	severity  string
	title     string
	summary   string
	rootCause string
	container string
}

func analyzePodDiagnosis(
	contextName string,
	pod *corev1.Pod,
	containers []Container,
	events []cluster.PodEventItem,
	metricsAvailable bool,
) *Result {
	sortedEvents := append([]cluster.PodEventItem{}, events...)
	sort.SliceStable(sortedEvents, func(i, j int) bool {
		return sortedEvents[i].LastTimestamp > sortedEvents[j].LastTimestamp
	})
	if len(sortedEvents) > 12 {
		sortedEvents = sortedEvents[:12]
	}

	resultFinding := detectFinding(pod, containers, sortedEvents)
	if signal := logSignal(containers); signal != "" {
		resultFinding.rootCause += " " + signal
	}
	ownerKind, ownerName := podOwner(pod)
	result := &Result{
		ContextName:       contextName,
		Namespace:         pod.Namespace,
		PodName:           pod.Name,
		GeneratedAt:       time.Now().UTC().Format(time.RFC3339),
		Severity:          resultFinding.severity,
		IssueType:         resultFinding.issueType,
		Healthy:           resultFinding.issueType == "healthy",
		Title:             resultFinding.title,
		Summary:           resultFinding.summary,
		RootCause:         resultFinding.rootCause,
		OwnerKind:         ownerKind,
		OwnerName:         ownerName,
		NodeName:          pod.Spec.NodeName,
		Conditions:        podConditions(pod),
		Containers:        containers,
		Events:            sortedEvents,
		Evidence:          buildEvidence(pod, containers, sortedEvents, resultFinding, metricsAvailable),
		SuggestedCommands: buildCommands(pod, containers, resultFinding, metricsAvailable),
		SuggestedFixes:    buildFixes(pod, containers, resultFinding),
	}
	return result
}

func detectFinding(
	pod *corev1.Pod,
	containers []Container,
	events []cluster.PodEventItem,
) finding {
	if pod.Status.Phase == corev1.PodPending && !conditionTrue(pod, corev1.PodScheduled) {
		message := conditionMessage(pod, corev1.PodScheduled)
		if message == "" {
			message = eventMessage(events, "FailedScheduling")
		}
		if message == "" {
			message = "The scheduler could not place this pod on a node."
		}
		return finding{
			issueType: "scheduling",
			severity:  "critical",
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
				severity:  "warning",
				title:     fmt.Sprintf("%s Probe Failing", titleCase(probe.Kind)),
				summary:   fmt.Sprintf("Container '%s' is running but Kubernetes reports an unhealthy probe.", container.Name),
				rootCause: message,
				container: container.Name,
			}
		}
		if container.State == "Running" && !container.Ready {
			return finding{
				issueType: "probe",
				severity:  "warning",
				title:     "Container Not Ready",
				summary:   fmt.Sprintf("Container '%s' is running but is excluded from service traffic.", container.Name),
				rootCause: fmt.Sprintf("The container is running, but its readiness condition is false. Check the readiness probe endpoint and application health."),
				container: container.Name,
			}
		}
	}

	if pod.Status.Phase == corev1.PodFailed {
		return finding{
			issueType: "runtime",
			severity:  "critical",
			title:     "Pod Failed",
			summary:   "The pod reached a terminal Failed phase.",
			rootCause: "Kubernetes marked the pod as Failed. Inspect the container exit status and the most recent events.",
		}
	}

	if pod.Status.Phase == corev1.PodPending {
		return finding{
			issueType: "pending",
			severity:  "warning",
			title:     "Pod Is Still Starting",
			summary:   "The pod has been scheduled but is not ready yet.",
			rootCause: "Container initialization is still in progress. Check image pulls, volume mounts, and init container logs if this persists.",
		}
	}

	return finding{
		issueType: "healthy",
		severity:  "healthy",
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
			severity:  "critical",
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
			severity:  "critical",
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
			severity:  "critical",
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
			severity:  "critical",
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
			severity:  "critical",
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
		if probes[index].Status == "fail" {
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

func podConditions(pod *corev1.Pod) []cluster.PodConditionItem {
	conditions := make([]cluster.PodConditionItem, 0, len(pod.Status.Conditions))
	for _, condition := range pod.Status.Conditions {
		conditions = append(conditions, cluster.PodConditionItem{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			LastTransitionTime: condition.LastTransitionTime.Time.Format(time.RFC3339),
			Reason:             condition.Reason,
			Message:            condition.Message,
		})
	}
	return conditions
}

func podOwner(pod *corev1.Pod) (string, string) {
	if len(pod.OwnerReferences) == 0 {
		return "", ""
	}
	return pod.OwnerReferences[0].Kind, pod.OwnerReferences[0].Name
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

func conditionTrue(pod *corev1.Pod, conditionType corev1.PodConditionType) bool {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == conditionType {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

func conditionMessage(pod *corev1.Pod, conditionType corev1.PodConditionType) string {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == conditionType && condition.Message != "" {
			return condition.Message
		}
	}
	return ""
}

func eventMessage(events []cluster.PodEventItem, reason string) string {
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

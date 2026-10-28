package diagnosis

import (
	"fmt"
	"strings"
)

func buildCommands(
	pod PodSnapshot,
	containers []Container,
	resultFinding finding,
	metricsAvailable bool,
) []Command {
	namespace := pod.Namespace
	name := pod.Name
	commands := []Command{
		{Label: "Describe pod", Command: fmt.Sprintf("kubectl describe pod -n %s %s", namespace, name), Description: "Show scheduler, container, probe, and event details."},
		{Label: "Pod events", Command: fmt.Sprintf("kubectl get events -n %s --field-selector involvedObject.name=%s --sort-by=.lastTimestamp", namespace, name), Description: "List the latest events for this pod."},
		{Label: "Pod manifest", Command: fmt.Sprintf("kubectl get pod -n %s %s -o yaml", namespace, name), Description: "Inspect the full live spec and status."},
	}
	seen := make(map[string]bool, len(commands))
	for _, command := range commands {
		seen[command.Command] = true
	}
	add := func(command Command) {
		if command.Command == "" || seen[command.Command] {
			return
		}
		seen[command.Command] = true
		commands = append(commands, command)
	}

	for _, container := range containers {
		if container.Name != resultFinding.container && container.Ready && resultFinding.container != "" {
			continue
		}
		add(Command{
			Label:       "Current logs · " + container.Name,
			Command:     fmt.Sprintf("kubectl logs -n %s %s -c %s --tail=200", namespace, name, container.Name),
			Description: "Read recent container output.",
		})
		if container.RestartCount > 0 || container.LastTerminatedReason != "" {
			add(Command{
				Label:       "Previous logs · " + container.Name,
				Command:     fmt.Sprintf("kubectl logs -n %s %s -c %s --previous --tail=200", namespace, name, container.Name),
				Description: "Inspect logs from the last terminated instance.",
			})
		}
	}

	if metricsAvailable {
		add(Command{
			Label:       "Container usage",
			Command:     fmt.Sprintf("kubectl top pod -n %s %s --containers", namespace, name),
			Description: "Compare current CPU and memory usage with limits.",
		})
	}
	if pod.OwnerName != "" && resultFinding.issueType != IssueHealthy && supportsRolloutRestart(pod.OwnerKind) {
		add(Command{
			Label:       "Restart owner after fix",
			Command:     fmt.Sprintf("kubectl rollout restart %s/%s -n %s", strings.ToLower(pod.OwnerKind), pod.OwnerName, namespace),
			Description: "Optional: roll the owning workload after correcting its configuration.",
		})
	}
	return commands
}

func buildFixes(containers []Container, resultFinding finding) []Fix {
	switch resultFinding.issueType {
	case "oom":
		limit := "not configured"
		container := containerByName(containers, resultFinding.container)
		if container != nil && container.Limits != nil && container.Limits.Memory != "" {
			limit = container.Limits.Memory
		}
		return []Fix{
			{ID: "raise-memory-limit", Title: "Increase the memory limit", Description: fmt.Sprintf("The current memory limit is %s. Raise resources.limits.memory or reduce the workload's memory footprint.", limit), Severity: SeverityCritical},
			{ID: "investigate-memory-growth", Title: "Investigate memory growth", Description: "Compare the last log lines with the memory graph and profile the application for leaks or unbounded caches.", Severity: SeverityWarning},
		}
	case "image":
		return []Fix{
			{ID: "verify-image", Title: "Verify the image reference", Description: "Check the image name, tag, and registry path in the pod template; the tag may be missing or the registry may be unreachable.", Severity: SeverityCritical},
			{ID: "verify-pull-secret", Title: "Verify imagePullSecrets", Description: "Confirm the referenced registry credentials exist in this namespace and are attached to the workload service account.", Severity: SeverityCritical},
		}
	case "config":
		return []Fix{
			{ID: "repair-config-reference", Title: "Repair the referenced configuration", Description: "Create or correct the missing ConfigMap/Secret keys and volume mounts. Restart the workload after the fix.", Severity: SeverityCritical},
		}
	case "crash":
		return []Fix{
			{ID: "inspect-crash-logs", Title: "Inspect previous container logs", Description: "Use the previous log excerpt and stack trace to identify the startup failure.", Severity: SeverityCritical},
			{ID: "check-startup-dependencies", Title: "Check startup dependencies", Description: "Confirm environment variables, mounted configuration, database connectivity, and startup probes are valid.", Severity: SeverityWarning},
		}
	case "probe":
		return []Fix{
			{ID: "fix-health-endpoint", Title: "Fix the health endpoint", Description: "Verify the readiness endpoint path, port, and status code from inside the pod before changing probe timings.", Severity: SeverityWarning},
			{ID: "tune-probe-timing", Title: "Tune probe timing", Description: "Increase initialDelaySeconds, timeoutSeconds, or failureThreshold only after confirming the application is actually healthy.", Severity: SeverityInfo},
		}
	case "scheduling":
		return []Fix{
			{ID: "check-capacity", Title: "Check node capacity and pressure", Description: "Inspect node allocatable resources, taints, and disk/memory pressure; add capacity or reduce pod requests.", Severity: SeverityCritical},
			{ID: "check-placement-rules", Title: "Check placement rules", Description: "Verify nodeSelector, affinity, tolerations, topology spread constraints, and persistent volume node affinity.", Severity: SeverityWarning},
		}
	case "runtime":
		return []Fix{
			{ID: "inspect-exit", Title: "Inspect the exit path", Description: "Read the current and previous logs and fix the application or command that is terminating the container.", Severity: SeverityCritical},
		}
	case "pending":
		return []Fix{
			{ID: "watch-startup", Title: "Watch pod initialization", Description: "Check image pulls, init container logs, and volume provisioning if the pod remains Pending.", Severity: SeverityInfo},
		}
	default:
		return []Fix{}
	}
}

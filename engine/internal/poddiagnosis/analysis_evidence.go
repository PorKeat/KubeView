package poddiagnosis

import (
	"fmt"
	"strings"

	corev1 "k8s.io/api/core/v1"

	"github.com/kubeview/engine/internal/cluster"
)

func buildEvidence(
	pod *corev1.Pod,
	containers []Container,
	events []cluster.PodEventItem,
	resultFinding finding,
	metricsAvailable bool,
) []Evidence {
	evidence := make([]Evidence, 0, 16)

	for _, condition := range pod.Status.Conditions {
		status := "pass"
		if condition.Status != corev1.ConditionTrue {
			status = "warning"
			if condition.Type == corev1.PodScheduled || condition.Type == corev1.PodInitialized {
				status = "fail"
			}
		}
		summary := fmt.Sprintf("%s=%s", condition.Type, condition.Status)
		detail := strings.TrimSpace(strings.Join([]string{condition.Reason, condition.Message}, ": "))
		if detail == "" {
			detail = "No condition message."
		}
		evidence = append(evidence, Evidence{
			ID:      "condition-" + strings.ToLower(string(condition.Type)),
			Label:   string(condition.Type),
			Status:  status,
			Summary: summary,
			Details: []string{detail},
		})
	}

	for _, container := range containers {
		status := "pass"
		if !container.Ready || container.State != "Running" || container.RestartCount > 0 {
			status = "warning"
		}
		if container.Name == resultFinding.container && resultFinding.severity == "critical" {
			status = "fail"
		}
		summary := fmt.Sprintf("%s · ready=%t · restarts=%d", container.State, container.Ready, container.RestartCount)
		details := make([]string, 0, 4)
		if container.StateReason != "" {
			details = append(details, "reason: "+container.StateReason)
		}
		if container.StateMessage != "" {
			details = append(details, "message: "+container.StateMessage)
		}
		if container.ExitCode != nil {
			details = append(details, fmt.Sprintf("last exit code: %d", *container.ExitCode))
		}
		if container.LastTerminatedReason != "" {
			details = append(details, "last termination: "+container.LastTerminatedReason)
		}
		evidence = append(evidence, Evidence{
			ID:      "container-" + container.Name,
			Label:   "Container " + container.Name,
			Status:  status,
			Summary: summary,
			Details: details,
		})

		for _, probe := range container.Probes {
			evidence = append(evidence, Evidence{
				ID:      "probe-" + container.Name + "-" + probe.Kind,
				Label:   titleCase(probe.Kind) + " probe",
				Status:  probe.Status,
				Summary: probe.Handler,
				Details: compactDetails(probe.Message),
			})
		}

		if container.Requests != nil || container.Limits != nil || metricsAvailable {
			detail := []string{}
			if container.Requests != nil {
				detail = append(detail, "requests: CPU "+valueOrDash(container.Requests.Cpu)+", memory "+valueOrDash(container.Requests.Memory))
			}
			if container.Limits != nil {
				detail = append(detail, "limits: CPU "+valueOrDash(container.Limits.Cpu)+", memory "+valueOrDash(container.Limits.Memory))
			}
			if metricsAvailable {
				detail = append(detail, fmt.Sprintf("usage: %dm CPU, %s memory", container.CPUUsageMillicores, humanBytes(container.MemoryUsageBytes)))
			}
			evidence = append(evidence, Evidence{
				ID:      "resources-" + container.Name,
				Label:   "Resources " + container.Name,
				Status:  resourceStatus(container, resultFinding),
				Summary: "Requests, limits, and observed usage",
				Details: detail,
			})
		}

		if container.LogExcerpt != "" || container.LogError != "" {
			details := []string{}
			if container.LogError != "" {
				details = append(details, "log error: "+container.LogError)
			}
			if container.LogExcerpt != "" {
				details = append(details, lastLines(container.LogExcerpt, 8)...)
			}
			evidence = append(evidence, Evidence{
				ID:      "logs-" + container.Name,
				Label:   "Logs " + container.Name,
				Status:  "warning",
				Summary: fmt.Sprintf("%s logs captured", titleCase(container.LogSource)),
				Details: details,
			})
		}
	}

	for _, event := range events {
		status := "warning"
		if event.Type == corev1.EventTypeWarning {
			status = "fail"
		}
		evidence = append(evidence, Evidence{
			ID:      "event-" + event.Reason + "-" + event.LastTimestamp,
			Label:   event.Reason,
			Status:  status,
			Summary: event.Message,
			Details: []string{fmt.Sprintf("%s · count=%d", event.LastTimestamp, event.Count)},
		})
	}
	return evidence
}

func resourceStatus(container Container, resultFinding finding) string {
	if resultFinding.issueType == "oom" && container.Name == resultFinding.container {
		return "fail"
	}
	if container.Limits == nil {
		return "warning"
	}
	return "pass"
}

func valueOrDash(value string) string {
	if value == "" {
		return "—"
	}
	return value
}

func compactDetails(value string) []string {
	if value == "" {
		return nil
	}
	return []string{value}
}

func lastLines(value string, count int) []string {
	lines := strings.Split(strings.TrimSpace(value), "\n")
	if len(lines) > count {
		lines = lines[len(lines)-count:]
	}
	return lines
}

func humanBytes(value int64) string {
	const (
		kib = 1024
		mib = kib * 1024
		gib = mib * 1024
	)
	switch {
	case value >= gib:
		return fmt.Sprintf("%.1f GiB", float64(value)/float64(gib))
	case value >= mib:
		return fmt.Sprintf("%.1f MiB", float64(value)/float64(mib))
	case value >= kib:
		return fmt.Sprintf("%.1f KiB", float64(value)/float64(kib))
	default:
		return fmt.Sprintf("%d B", value)
	}
}

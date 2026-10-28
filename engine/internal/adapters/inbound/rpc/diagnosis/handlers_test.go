package diagnosis

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	domaindiagnosis "github.com/kubeview/engine/internal/domain/diagnosis"
)

func TestResultResponsePreservesWireContract(t *testing.T) {
	timestamp := time.Date(2026, 10, 27, 12, 0, 0, 0, time.UTC)
	exitCode := int32(137)

	result := &domaindiagnosis.Result{
		ContextName: "mock-cluster",
		Namespace:   "production",
		PodName:     "web-1",
		GeneratedAt: timestamp,
		Severity:    domaindiagnosis.SeverityCritical,
		IssueType:   "crash",
		Healthy:     false,
		Title:       "CrashLoopBackOff",
		Summary:     "Container 'web' is crash-looping with 5 restart(s).",
		RootCause:   "The container is repeatedly exiting.",
		OwnerKind:   "Deployment",
		OwnerName:   "web",
		NodeName:    "worker-1",
		Conditions: []domaindiagnosis.Condition{{
			Type:               "Ready",
			Status:             "False",
			LastTransitionTime: "2026-10-27T12:00:00Z",
			Reason:             "ContainersNotReady",
			Message:            "containers with unready status: [web]",
		}},
		Containers: []domaindiagnosis.Container{{
			Name:                  "web",
			Image:                 "example/web:v1",
			Ready:                 false,
			RestartCount:          5,
			State:                 "Waiting",
			StateReason:           "CrashLoopBackOff",
			StateMessage:          "back-off restarting failed container",
			ExitCode:              &exitCode,
			LastTerminatedReason:  "Error",
			LastTerminatedMessage: "failed to connect to database",
			Requests:              &domaindiagnosis.ResourceList{CPU: "100m", Memory: "128Mi"},
			Limits:                &domaindiagnosis.ResourceList{CPU: "500m", Memory: "256Mi"},
			CPUUsageMillicores:    25,
			MemoryUsageBytes:      1048576,
			MetricsAvailable:      true,
			Probes: []domaindiagnosis.Probe{{
				Kind:                "readiness",
				Configured:          true,
				Handler:             "HTTP /healthz:8080",
				InitialDelaySeconds: 5,
				TimeoutSeconds:      1,
				PeriodSeconds:       10,
				FailureThreshold:    3,
				SuccessThreshold:    1,
				Status:              domaindiagnosis.StatusFail,
				Message:             "Readiness probe failed",
			}},
			LogExcerpt: "panic: failed to connect to database",
			LogSource:  "previous",
		}},
		Events: []domaindiagnosis.Event{{
			Type:                    "Warning",
			Reason:                  "BackOff",
			Message:                 "Back-off restarting failed container web",
			Count:                   5,
			LastTimestamp:           "2026-10-27T12:00:00Z",
			Source:                  "kubelet",
			InvolvedObjectKind:      "Pod",
			InvolvedObjectName:      "web-1",
			InvolvedObjectNamespace: "production",
		}},
		Evidence: []domaindiagnosis.Evidence{{
			ID:      "container-web",
			Label:   "Container web",
			Status:  domaindiagnosis.StatusFail,
			Summary: "Waiting · ready=false · restarts=5",
			Details: []string{"reason: CrashLoopBackOff"},
		}},
		SuggestedCommands: []domaindiagnosis.Command{{
			Label:       "Describe pod",
			Command:     "kubectl describe pod -n production web-1",
			Description: "Show scheduler, container, probe, and event details.",
		}},
		SuggestedFixes: []domaindiagnosis.Fix{{
			ID:          "inspect-crash-logs",
			Title:       "Inspect previous container logs",
			Description: "Use the previous log excerpt to identify the startup failure.",
			Severity:    domaindiagnosis.SeverityCritical,
		}},
	}

	payload, err := json.Marshal(resultToResponse(result))
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	jsonText := string(payload)

	for _, field := range []string{
		`"contextName":"mock-cluster"`, `"namespace":"production"`, `"podName":"web-1"`,
		`"generatedAt":"2026-10-27T12:00:00Z"`, `"severity":"critical"`, `"issueType":"crash"`,
		`"healthy":false`, `"title":"CrashLoopBackOff"`, `"summary":`, `"rootCause":`,
		`"ownerKind":"Deployment"`, `"ownerName":"web"`, `"nodeName":"worker-1"`,
		`"conditions":[{"type":"Ready","status":"False","lastTransitionTime":"2026-10-27T12:00:00Z"`,
		`"containers":[{"name":"web","image":"example/web:v1","ready":false,"restartCount":5`,
		`"stateReason":"CrashLoopBackOff"`, `"stateMessage":`, `"exitCode":137`,
		`"lastTerminatedReason":"Error"`, `"lastTerminatedMessage":`,
		`"requests":{"cpu":"100m","memory":"128Mi"}`, `"limits":{"cpu":"500m","memory":"256Mi"}`,
		`"cpuUsageMillicores":25`, `"memoryUsageBytes":1048576`, `"metricsAvailable":true`,
		`"probes":[{"kind":"readiness","configured":true,"handler":"HTTP /healthz:8080"`,
		`"initialDelaySeconds":5`, `"timeoutSeconds":1`, `"periodSeconds":10`,
		`"failureThreshold":3`, `"successThreshold":1`, `"status":"fail"`,
		`"logExcerpt":"panic: failed to connect to database"`, `"logSource":"previous"`,
		`"events":[{"type":"Warning","reason":"BackOff"`, `"count":5`,
		`"lastTimestamp":"2026-10-27T12:00:00Z"`, `"source":"kubelet"`,
		`"involvedObjectKind":"Pod"`, `"involvedObjectName":"web-1"`,
		`"involvedObjectNamespace":"production"`,
		`"evidence":[{"id":"container-web","label":"Container web","status":"fail"`,
		`"suggestedCommands":[{"label":"Describe pod"`,
		`"suggestedFixes":[{"id":"inspect-crash-logs"`,
	} {
		if !strings.Contains(jsonText, field) {
			t.Errorf("wire response missing %s: %s", field, jsonText)
		}
	}
}

func TestResultResponseUsesEmptyArrays(t *testing.T) {
	payload, err := json.Marshal(resultToResponse(&domaindiagnosis.Result{
		GeneratedAt: time.Date(2026, 10, 27, 12, 0, 0, 0, time.UTC),
		Severity:    domaindiagnosis.SeverityHealthy,
		IssueType:   domaindiagnosis.IssueHealthy,
		Healthy:     true,
	}))
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	jsonText := string(payload)

	for _, field := range []string{
		`"conditions":[]`, `"containers":[]`, `"events":[]`,
		`"evidence":[]`, `"suggestedCommands":[]`, `"suggestedFixes":[]`,
	} {
		if !strings.Contains(jsonText, field) {
			t.Errorf("wire response missing %s: %s", field, jsonText)
		}
	}
	if strings.Contains(jsonText, `"ownerKind"`) || strings.Contains(jsonText, `"nodeName"`) {
		t.Errorf("empty optional fields should be omitted: %s", jsonText)
	}
}

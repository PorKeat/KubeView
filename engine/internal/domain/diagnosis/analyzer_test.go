package diagnosis

import (
	"strings"
	"testing"
)

func int32Ptr(value int32) *int32 {
	return &value
}

func runningSnapshot(ready bool) *Snapshot {
	return &Snapshot{
		ContextName: "prod",
		Pod: PodSnapshot{
			Name:      "api-7f9c",
			Namespace: "production",
			Phase:     PhaseRunning,
			NodeName:  "worker-1",
			OwnerKind: "Deployment",
			OwnerName: "api",
			Conditions: []Condition{{
				Type:    "Ready",
				Status:  "False",
				Reason:  "ContainersNotReady",
				Message: "containers with unready status: [api]",
			}},
		},
	}
}

func TestAnalyzePodDiagnosisOOM(t *testing.T) {
	snapshot := runningSnapshot(false)
	snapshot.Containers = []Container{{
		Name:                  "api",
		Image:                 "example/api:v1",
		State:                 "Waiting",
		StateReason:           "CrashLoopBackOff",
		LastTerminatedReason:  "OOMKilled",
		LastTerminatedMessage: "Container exceeded memory limit",
		ExitCode:              int32Ptr(137),
		RestartCount:          4,
		Limits:                &ResourceList{Memory: "256Mi"},
		LogExcerpt:            "fatal error: out of memory",
		LogSource:             "previous",
	}}
	snapshot.Events = []Event{{
		Type:    EventTypeWarning,
		Reason:  "BackOff",
		Message: "Back-off restarting failed container",
	}}

	result := Analyze(snapshot)

	if result.IssueType != "oom" || result.Severity != SeverityCritical || result.Healthy {
		t.Fatalf("unexpected diagnosis: issue=%s severity=%s healthy=%v", result.IssueType, result.Severity, result.Healthy)
	}
	if !strings.Contains(result.RootCause, "256Mi") {
		t.Errorf("root cause should include the memory limit: %s", result.RootCause)
	}
	if len(result.SuggestedFixes) == 0 {
		t.Error("expected suggested fixes")
	}
	if !commandsContain(result.SuggestedCommands, "--previous") {
		t.Error("expected a previous-log command")
	}
	if len(result.Evidence) == 0 {
		t.Error("expected diagnosis evidence")
	}
}

func TestAnalyzePodDiagnosisProbeFailure(t *testing.T) {
	snapshot := runningSnapshot(false)
	snapshot.Containers = []Container{{
		Name:  "api",
		State: "Running",
		Ready: false,
		Probes: []Probe{{
			Kind:       "readiness",
			Configured: true,
			Handler:    "HTTP /healthz:8080",
			Status:     StatusFail,
			Message:    "Readiness probe failed: HTTP probe failed with statuscode: 500",
		}},
	}}

	result := Analyze(snapshot)
	if result.IssueType != "probe" || result.Healthy {
		t.Fatalf("unexpected diagnosis: issue=%s healthy=%v", result.IssueType, result.Healthy)
	}
	if !strings.Contains(result.RootCause, "statuscode: 500") {
		t.Errorf("root cause should include the probe event: %s", result.RootCause)
	}
	if len(result.SuggestedFixes) == 0 {
		t.Error("expected suggested probe fixes")
	}
}

func TestAnalyzePodDiagnosisScheduling(t *testing.T) {
	snapshot := &Snapshot{
		ContextName: "prod",
		Pod: PodSnapshot{
			Name:      "pending",
			Namespace: "production",
			Phase:     PhasePending,
			Conditions: []Condition{{
				Type:    ConditionPodScheduled,
				Status:  "False",
				Reason:  "Unschedulable",
				Message: "0/3 nodes are available: 3 Insufficient memory.",
			}},
		},
	}

	result := Analyze(snapshot)
	if result.IssueType != "scheduling" || result.Healthy {
		t.Fatalf("unexpected diagnosis: issue=%s healthy=%v", result.IssueType, result.Healthy)
	}
	if !strings.Contains(result.RootCause, "Insufficient memory") {
		t.Errorf("root cause should include scheduler message: %s", result.RootCause)
	}
	if len(result.SuggestedFixes) == 0 {
		t.Error("expected scheduling fixes")
	}
}

func TestAnalyzePodDiagnosisHealthy(t *testing.T) {
	snapshot := runningSnapshot(true)
	snapshot.Pod.Conditions[0].Status = ConditionTrue
	snapshot.Containers = []Container{{
		Name:  "api",
		State: "Running",
		Ready: true,
	}}

	result := Analyze(snapshot)
	if !result.Healthy || result.IssueType != IssueHealthy || result.Severity != SeverityHealthy {
		t.Fatalf("expected healthy diagnosis, got %+v", result)
	}
	if len(result.SuggestedFixes) != 0 {
		t.Errorf("healthy pod should not suggest fixes: %+v", result.SuggestedFixes)
	}
	if result.Events == nil {
		t.Error("expected an empty events array, not nil")
	}
}

func commandsContain(commands []Command, value string) bool {
	for _, command := range commands {
		if strings.Contains(command.Command, value) {
			return true
		}
	}
	return false
}

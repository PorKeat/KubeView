package poddiagnosis

import (
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/kubeview/engine/internal/cluster"
)

func int32Ptr(value int32) *int32 {
	return &value
}

func runningPod(ready bool) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "api-7f9c",
			Namespace: "production",
			OwnerReferences: []metav1.OwnerReference{{
				Kind: "Deployment",
				Name: "api",
			}},
		},
		Spec: corev1.PodSpec{NodeName: "worker-1"},
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			Conditions: []corev1.PodCondition{{
				Type:    corev1.PodReady,
				Status:  corev1.ConditionFalse,
				Reason:  "ContainersNotReady",
				Message: "containers with unready status: [api]",
			}},
		},
	}
}

func TestAnalyzePodDiagnosisOOM(t *testing.T) {
	containers := []Container{{
		Name:                  "api",
		Image:                 "example/api:v1",
		State:                 "Waiting",
		StateReason:           "CrashLoopBackOff",
		LastTerminatedReason:  "OOMKilled",
		LastTerminatedMessage: "Container exceeded memory limit",
		ExitCode:              int32Ptr(137),
		RestartCount:          4,
		Limits:                &cluster.ContainerResourceItem{Memory: "256Mi"},
		LogExcerpt:            "fatal error: out of memory",
		LogSource:             "previous",
	}}

	result := analyzePodDiagnosis("prod", runningPod(false), containers, []cluster.PodEventItem{{
		Type:    "Warning",
		Reason:  "BackOff",
		Message: "Back-off restarting failed container",
	}}, false)

	if result.IssueType != "oom" || result.Severity != "critical" || result.Healthy {
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
	pod := runningPod(false)
	containers := []Container{{
		Name:  "api",
		State: "Running",
		Ready: false,
		Probes: []Probe{{
			Kind:       "readiness",
			Configured: true,
			Handler:    "HTTP /healthz:8080",
			Status:     "fail",
			Message:    "Readiness probe failed: HTTP probe failed with statuscode: 500",
		}},
	}}

	result := analyzePodDiagnosis("prod", pod, containers, nil, false)
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
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "pending", Namespace: "production"},
		Status: corev1.PodStatus{
			Phase: corev1.PodPending,
			Conditions: []corev1.PodCondition{{
				Type:    corev1.PodScheduled,
				Status:  corev1.ConditionFalse,
				Reason:  "Unschedulable",
				Message: "0/3 nodes are available: 3 Insufficient memory.",
			}},
		},
	}

	result := analyzePodDiagnosis("prod", pod, nil, nil, false)
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
	pod := runningPod(true)
	pod.Status.Conditions[0].Status = corev1.ConditionTrue
	containers := []Container{{
		Name:  "api",
		State: "Running",
		Ready: true,
	}}

	result := analyzePodDiagnosis("prod", pod, containers, nil, false)
	if !result.Healthy || result.IssueType != "healthy" || result.Severity != "healthy" {
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

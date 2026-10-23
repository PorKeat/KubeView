package cluster

import (
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

func daemonSetInt32Ptr(value int32) *int32 {
	return &value
}

func TestConvertDaemonSetToSummary(t *testing.T) {
	maxUnavailable := intstr.FromInt(2)
	maxSurge := intstr.FromInt(0)
	daemonSet := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "node-agent",
			Namespace:         "kube-system",
			Generation:        3,
			CreationTimestamp: metav1.NewTime(time.Now().Add(-48 * time.Hour)),
			Labels:            map[string]string{"app": "node-agent"},
			Annotations:       map[string]string{"team": "platform"},
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "node-agent"}},
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					NodeSelector: map[string]string{"kubernetes.io/os": "linux"},
					Containers: []corev1.Container{
						{Name: "agent", Image: "agent:v1"},
						{Name: "sidecar", Image: "sidecar:v1"},
					},
				},
			},
			UpdateStrategy: appsv1.DaemonSetUpdateStrategy{
				Type: appsv1.RollingUpdateDaemonSetStrategyType,
				RollingUpdate: &appsv1.RollingUpdateDaemonSet{
					MaxUnavailable: &maxUnavailable,
					MaxSurge:       &maxSurge,
				},
			},
			MinReadySeconds:      5,
			RevisionHistoryLimit: daemonSetInt32Ptr(7),
		},
		Status: appsv1.DaemonSetStatus{
			CurrentNumberScheduled: 3,
			DesiredNumberScheduled: 3,
			NumberReady:            3,
			UpdatedNumberScheduled: 3,
			NumberAvailable:        3,
			NumberUnavailable:      0,
			NumberMisscheduled:     0,
			ObservedGeneration:     3,
			CollisionCount:         daemonSetInt32Ptr(0),
			Conditions: []appsv1.DaemonSetCondition{
				{Type: appsv1.DaemonSetConditionType("Ready"), Status: corev1.ConditionTrue},
			},
		},
	}

	summary := convertDaemonSetToSummary(daemonSet)

	if summary.Status != "Healthy" || summary.Ready != "3/3" {
		t.Errorf("expected Healthy 3/3, got %s %s", summary.Status, summary.Ready)
	}
	if summary.NodeSelector["kubernetes.io/os"] != "linux" {
		t.Errorf("unexpected node selector: %v", summary.NodeSelector)
	}
	if summary.UpdateStrategy != "RollingUpdate" || summary.MaxUnavailable != "2" || summary.MaxSurge != "0" {
		t.Errorf("unexpected strategy: %s %s %s", summary.UpdateStrategy, summary.MaxUnavailable, summary.MaxSurge)
	}
	if summary.MinReadySeconds != 5 || summary.RevisionHistoryLimit != 7 || summary.CollisionCount != 0 {
		t.Errorf("unexpected runtime fields: %d %d %d", summary.MinReadySeconds, summary.RevisionHistoryLimit, summary.CollisionCount)
	}
	if len(summary.Images) != 2 || summary.Images[0] != "agent:v1" {
		t.Errorf("unexpected images: %v", summary.Images)
	}
	if len(summary.Conditions) != 1 {
		t.Errorf("unexpected conditions: %v", summary.Conditions)
	}
}

func TestResolveDaemonSetStatus(t *testing.T) {
	healthy := &appsv1.DaemonSet{Status: appsv1.DaemonSetStatus{
		DesiredNumberScheduled: 3, NumberReady: 3, UpdatedNumberScheduled: 3, NumberAvailable: 3,
	}}
	if status := resolveDaemonSetStatus(healthy); status != "Healthy" {
		t.Errorf("expected Healthy, got %s", status)
	}
	progressing := &appsv1.DaemonSet{Status: appsv1.DaemonSetStatus{
		DesiredNumberScheduled: 3, NumberReady: 2, UpdatedNumberScheduled: 2, NumberAvailable: 2,
	}}
	if status := resolveDaemonSetStatus(progressing); status != "Progressing" {
		t.Errorf("expected Progressing, got %s", status)
	}
	degraded := &appsv1.DaemonSet{Status: appsv1.DaemonSetStatus{
		DesiredNumberScheduled: 3, NumberReady: 3, UpdatedNumberScheduled: 3, NumberAvailable: 3, NumberMisscheduled: 1,
	}}
	if status := resolveDaemonSetStatus(degraded); status != "Degraded" {
		t.Errorf("expected Degraded for misscheduled, got %s", status)
	}
	empty := &appsv1.DaemonSet{}
	if status := resolveDaemonSetStatus(empty); status != "Healthy" {
		t.Errorf("expected Healthy for zero desired nodes, got %s", status)
	}
}

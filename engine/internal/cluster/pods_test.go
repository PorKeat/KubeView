package cluster

import (
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestFormatAge(t *testing.T) {
	tests := []struct {
		duration time.Duration
		expected string
	}{
		{30 * time.Second, "30s"},
		{5 * time.Minute, "5m"},
		{4 * time.Hour, "4h"},
		{48 * time.Hour, "2d"},
	}

	for _, tc := range tests {
		got := formatAge(tc.duration)
		if got != tc.expected {
			t.Errorf("formatAge(%v) = %s; want %s", tc.duration, got, tc.expected)
		}
	}
}

func TestFormatBytes(t *testing.T) {
	tests := []struct {
		bytes    int64
		expected string
	}{
		{500, "500 B"},
		{1024 * 1024, "1.0Mi"},
		{1024 * 1024 * 1024 * 2, "2.0Gi"},
	}

	for _, tc := range tests {
		got := formatBytes(tc.bytes)
		if got != tc.expected {
			t.Errorf("formatBytes(%d) = %s; want %s", tc.bytes, got, tc.expected)
		}
	}
}

func TestConvertPodToSummary(t *testing.T) {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-pod",
			Namespace:         "default",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-10 * time.Minute)),
		},
		Spec: corev1.PodSpec{
			NodeName: "node-1",
			Containers: []corev1.Container{
				{
					Name:  "web",
					Image: "nginx:latest",
				},
			},
		},
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			PodIP: "10.244.0.5",
			ContainerStatuses: []corev1.ContainerStatus{
				{
					Name:         "web",
					Ready:        true,
					RestartCount: 2,
					State: corev1.ContainerState{
						Running: &corev1.ContainerStateRunning{
							StartedAt: metav1.Now(),
						},
					},
				},
			},
		},
	}

	summary := convertPodToSummary(pod)
	if summary.Name != "test-pod" {
		t.Errorf("expected name 'test-pod', got %s", summary.Name)
	}
	if summary.Namespace != "default" {
		t.Errorf("expected namespace 'default', got %s", summary.Namespace)
	}
	if summary.Status != "Running" {
		t.Errorf("expected status 'Running', got %s", summary.Status)
	}
	if summary.Ready != "1/1" {
		t.Errorf("expected ready '1/1', got %s", summary.Ready)
	}
	if summary.Restarts != 2 {
		t.Errorf("expected 2 restarts, got %d", summary.Restarts)
	}
	if summary.NodeName != "node-1" {
		t.Errorf("expected node 'node-1', got %s", summary.NodeName)
	}
	if summary.IP != "10.244.0.5" {
		t.Errorf("expected IP '10.244.0.5', got %s", summary.IP)
	}
}

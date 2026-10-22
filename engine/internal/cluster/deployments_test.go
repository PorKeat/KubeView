package cluster

import (
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestConvertDeploymentToSummary(t *testing.T) {
	replicas := int32(3)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "web",
			Namespace:         "production",
			Generation:        4,
			CreationTimestamp: metav1.NewTime(time.Now().Add(-2 * time.Hour)),
			Labels:            map[string]string{"app": "web"},
			Annotations:       map[string]string{"deployment.kubernetes.io/revision": "7"},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Strategy: appsv1.DeploymentStrategy{Type: appsv1.RollingUpdateDeploymentStrategyType},
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "web"}},
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{Name: "web", Image: "nginx:1.27"},
						{Name: "sidecar", Image: "busybox:1.36"},
					},
				},
			},
		},
		Status: appsv1.DeploymentStatus{
			ObservedGeneration:  4,
			Replicas:            3,
			UpdatedReplicas:     3,
			ReadyReplicas:       3,
			AvailableReplicas:   3,
			UnavailableReplicas: 0,
			Conditions: []appsv1.DeploymentCondition{
				{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue, Reason: "MinimumReplicasAvailable"},
				{Type: appsv1.DeploymentProgressing, Status: corev1.ConditionTrue, Reason: "NewReplicaSetAvailable"},
			},
		},
	}

	summary := convertDeploymentToSummary(deployment)

	if summary.Status != "Healthy" {
		t.Errorf("expected Healthy status, got %s", summary.Status)
	}
	if summary.Ready != "3/3" {
		t.Errorf("expected ready 3/3, got %s", summary.Ready)
	}
	if summary.Strategy != "RollingUpdate" {
		t.Errorf("expected RollingUpdate strategy, got %s", summary.Strategy)
	}
	if summary.Revision != "7" {
		t.Errorf("expected revision 7, got %s", summary.Revision)
	}
	if len(summary.Images) != 2 || summary.Images[0] != "nginx:1.27" {
		t.Errorf("unexpected images: %v", summary.Images)
	}
	if summary.Selector["app"] != "web" {
		t.Errorf("expected selector app=web, got %v", summary.Selector)
	}
}

func TestResolveDeploymentStatusDegraded(t *testing.T) {
	replicas := int32(2)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default", Generation: 3},
		Spec:       appsv1.DeploymentSpec{Replicas: &replicas},
		Status: appsv1.DeploymentStatus{
			ObservedGeneration: 3,
			UpdatedReplicas:    2,
			ReadyReplicas:      0,
			AvailableReplicas:  0,
			Conditions: []appsv1.DeploymentCondition{
				{Type: appsv1.DeploymentProgressing, Status: corev1.ConditionFalse, Reason: "ProgressDeadlineExceeded"},
			},
		},
	}

	if status := resolveDeploymentStatus(deployment, replicas); status != "Degraded" {
		t.Errorf("expected Degraded status, got %s", status)
	}
}

func TestResolveDeploymentStatusPausedAndScaledDown(t *testing.T) {
	zero := int32(0)
	paused := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "paused"},
		Spec:       appsv1.DeploymentSpec{Paused: true},
	}
	if status := resolveDeploymentStatus(paused, 1); status != "Paused" {
		t.Errorf("expected Paused status, got %s", status)
	}

	scaledDown := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "idle"},
		Spec:       appsv1.DeploymentSpec{Replicas: &zero},
	}
	if status := resolveDeploymentStatus(scaledDown, zero); status != "Scaled Down" {
		t.Errorf("expected Scaled Down status, got %s", status)
	}
}

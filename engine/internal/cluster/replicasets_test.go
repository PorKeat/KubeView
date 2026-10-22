package cluster

import (
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestConvertReplicaSetToSummary(t *testing.T) {
	replicas := int32(3)
	replicaSet := &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "web-7d9f",
			Namespace:         "production",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * time.Minute)),
			Labels:            map[string]string{"app": "web"},
			Annotations:       map[string]string{"deployment.kubernetes.io/revision": "5"},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "Deployment", Name: "web"},
			},
		},
		Spec: appsv1.ReplicaSetSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "web"}},
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{Name: "web", Image: "nginx:1.27"},
					},
				},
			},
		},
		Status: appsv1.ReplicaSetStatus{
			Replicas:          3,
			ReadyReplicas:     3,
			AvailableReplicas: 3,
		},
	}

	summary := convertReplicaSetToSummary(replicaSet)

	if summary.Status != "Healthy" {
		t.Errorf("expected Healthy status, got %s", summary.Status)
	}
	if summary.Ready != "3/3" {
		t.Errorf("expected ready 3/3, got %s", summary.Ready)
	}
	if summary.OwnerDeployment != "web" {
		t.Errorf("expected owner web, got %s", summary.OwnerDeployment)
	}
	if summary.Revision != "5" {
		t.Errorf("expected revision 5, got %s", summary.Revision)
	}
	if len(summary.Images) != 1 || summary.Images[0] != "nginx:1.27" {
		t.Errorf("unexpected images: %v", summary.Images)
	}
	if summary.Selector["app"] != "web" {
		t.Errorf("expected selector app=web, got %v", summary.Selector)
	}
}

func TestResolveReplicaSetStatus(t *testing.T) {
	zero := int32(0)
	scaledDown := &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{Name: "idle"},
		Spec:       appsv1.ReplicaSetSpec{Replicas: &zero},
	}
	if status := resolveReplicaSetStatus(scaledDown, zero); status != "Scaled Down" {
		t.Errorf("expected Scaled Down, got %s", status)
	}

	degraded := &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{Name: "broken"},
		Status: appsv1.ReplicaSetStatus{
			Conditions: []appsv1.ReplicaSetCondition{
				{Type: appsv1.ReplicaSetReplicaFailure, Status: corev1.ConditionTrue},
			},
		},
	}
	if status := resolveReplicaSetStatus(degraded, 2); status != "Degraded" {
		t.Errorf("expected Degraded, got %s", status)
	}

	progressing := &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{Name: "rolling"},
		Status:     appsv1.ReplicaSetStatus{Replicas: 3, ReadyReplicas: 1},
	}
	if status := resolveReplicaSetStatus(progressing, 3); status != "Progressing" {
		t.Errorf("expected Progressing, got %s", status)
	}
}

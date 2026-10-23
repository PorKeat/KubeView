package cluster

import (
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

func statefulSetInt32Ptr(value int32) *int32 {
	return &value
}

func TestConvertStatefulSetToSummary(t *testing.T) {
	replicas := int32(3)
	partition := int32(1)
	statefulSet := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "web",
			Namespace:         "production",
			Generation:        4,
			CreationTimestamp: metav1.NewTime(time.Now().Add(-2 * time.Hour)),
			Labels:            map[string]string{"app": "web"},
			Annotations:       map[string]string{"team": "platform"},
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas:            &replicas,
			ServiceName:         "web-headless",
			PodManagementPolicy: appsv1.ParallelPodManagement,
			UpdateStrategy: appsv1.StatefulSetUpdateStrategy{
				Type: appsv1.RollingUpdateStatefulSetStrategyType,
				RollingUpdate: &appsv1.RollingUpdateStatefulSetStrategy{
					Partition:      &partition,
					MaxUnavailable: &intstr.IntOrString{Type: intstr.Int, IntVal: 1},
				},
			},
			RevisionHistoryLimit: statefulSetInt32Ptr(5),
			MinReadySeconds:      10,
			PersistentVolumeClaimRetentionPolicy: &appsv1.StatefulSetPersistentVolumeClaimRetentionPolicy{
				WhenDeleted: appsv1.DeletePersistentVolumeClaimRetentionPolicyType,
				WhenScaled:  appsv1.RetainPersistentVolumeClaimRetentionPolicyType,
			},
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "web"}},
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{Name: "web", Image: "nginx:1.27"},
						{Name: "sidecar", Image: "busybox:1.36"},
					},
				},
			},
			VolumeClaimTemplates: []corev1.PersistentVolumeClaim{
				{ObjectMeta: metav1.ObjectMeta{Name: "data"}},
			},
		},
		Status: appsv1.StatefulSetStatus{
			ObservedGeneration: 4,
			Replicas:           3,
			CurrentReplicas:    3,
			UpdatedReplicas:    3,
			ReadyReplicas:      3,
			AvailableReplicas:  3,
			CurrentRevision:    "web-abc",
			UpdateRevision:     "web-abc",
			CollisionCount:     statefulSetInt32Ptr(0),
			Conditions: []appsv1.StatefulSetCondition{
				{Type: appsv1.StatefulSetConditionType("Ready"), Status: corev1.ConditionTrue},
			},
		},
	}

	summary := convertStatefulSetToSummary(statefulSet)

	if summary.Status != "Healthy" {
		t.Errorf("expected Healthy status, got %s", summary.Status)
	}
	if summary.Ready != "3/3" {
		t.Errorf("expected ready 3/3, got %s", summary.Ready)
	}
	if summary.ServiceName != "web-headless" {
		t.Errorf("expected service web-headless, got %s", summary.ServiceName)
	}
	if summary.PodManagementPolicy != "Parallel" {
		t.Errorf("expected Parallel policy, got %s", summary.PodManagementPolicy)
	}
	if summary.UpdateStrategy != "RollingUpdate" || summary.Partition != 1 {
		t.Errorf("expected RollingUpdate partition 1, got %s/%d", summary.UpdateStrategy, summary.Partition)
	}
	if summary.MaxUnavailable != "1" {
		t.Errorf("expected maxUnavailable 1, got %s", summary.MaxUnavailable)
	}
	if summary.CurrentRevision != "web-abc" || summary.UpdateRevision != "web-abc" {
		t.Errorf("unexpected revisions: %s/%s", summary.CurrentRevision, summary.UpdateRevision)
	}
	if summary.RevisionHistoryLimit != 5 || summary.MinReadySeconds != 10 {
		t.Errorf("unexpected history/minReady: %d/%d", summary.RevisionHistoryLimit, summary.MinReadySeconds)
	}
	if len(summary.VolumeClaimTemplates) != 1 || summary.VolumeClaimTemplates[0] != "data" {
		t.Errorf("unexpected volume claim templates: %v", summary.VolumeClaimTemplates)
	}
	if summary.PVCRetentionWhenDeleted != "Delete" || summary.PVCRetentionWhenScaled != "Retain" {
		t.Errorf("unexpected PVC retention: %s/%s", summary.PVCRetentionWhenDeleted, summary.PVCRetentionWhenScaled)
	}
	if len(summary.Images) != 2 || summary.Images[0] != "nginx:1.27" {
		t.Errorf("unexpected images: %v", summary.Images)
	}
	if summary.Selector["app"] != "web" {
		t.Errorf("expected selector app=web, got %v", summary.Selector)
	}
	if len(summary.Conditions) != 1 || summary.Conditions[0].Type != "Ready" {
		t.Errorf("unexpected conditions: %v", summary.Conditions)
	}
}

func TestResolveStatefulSetStatus(t *testing.T) {
	zero := int32(0)
	scaledDown := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: "idle"},
		Spec:       appsv1.StatefulSetSpec{Replicas: &zero},
	}
	if status := resolveStatefulSetStatus(scaledDown, zero); status != "Scaled Down" {
		t.Errorf("expected Scaled Down, got %s", status)
	}

	degraded := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: "broken"},
		Status:     appsv1.StatefulSetStatus{ReadyReplicas: 0},
	}
	if status := resolveStatefulSetStatus(degraded, 2); status != "Degraded" {
		t.Errorf("expected Degraded, got %s", status)
	}

	progressing := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: "rolling"},
		Status:     appsv1.StatefulSetStatus{ReadyReplicas: 1, UpdatedReplicas: 1},
	}
	if status := resolveStatefulSetStatus(progressing, 3); status != "Progressing" {
		t.Errorf("expected Progressing, got %s", status)
	}

	revisionMismatch := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: "revisioned"},
		Status: appsv1.StatefulSetStatus{
			ReadyReplicas:   2,
			UpdatedReplicas: 2,
			CurrentRevision: "web-old",
			UpdateRevision:  "web-new",
		},
	}
	if status := resolveStatefulSetStatus(revisionMismatch, 2); status != "Progressing" {
		t.Errorf("expected Progressing for revision mismatch, got %s", status)
	}

	healthy := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: "healthy"},
		Status: appsv1.StatefulSetStatus{
			ReadyReplicas:   2,
			UpdatedReplicas: 2,
			CurrentRevision: "web-new",
			UpdateRevision:  "web-new",
		},
	}
	if status := resolveStatefulSetStatus(healthy, 2); status != "Healthy" {
		t.Errorf("expected Healthy, got %s", status)
	}
}

package cluster

import (
	"testing"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func jobInt32Ptr(value int32) *int32 {
	return &value
}

func TestConvertJobToSummary(t *testing.T) {
	start := metav1.NewTime(time.Now().Add(-2 * time.Minute))
	completion := metav1.NewTime(time.Now().Add(-1 * time.Minute))
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "nightly-recycler-123",
			Namespace:         "unity-office",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-3 * time.Minute)),
			Labels:            map[string]string{"job": "nightly"},
			Annotations:       map[string]string{"team": "ops"},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "CronJob", Name: "nightly-recycler"},
			},
		},
		Spec: batchv1.JobSpec{
			Completions:    jobInt32Ptr(1),
			Parallelism:    jobInt32Ptr(1),
			BackoffLimit:   jobInt32Ptr(6),
			CompletionMode: func() *batchv1.CompletionMode { mode := batchv1.NonIndexedCompletion; return &mode }(),
			Selector:       &metav1.LabelSelector{MatchLabels: map[string]string{"job-name": "nightly-recycler-123"}},
			Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{
				Containers: []corev1.Container{{Name: "kubectl", Image: "bitnami/kubectl:latest"}},
			}},
		},
		Status: batchv1.JobStatus{
			StartTime:      &start,
			CompletionTime: &completion,
			Succeeded:      1,
			Conditions: []batchv1.JobCondition{
				{Type: batchv1.JobComplete, Status: corev1.ConditionTrue, Reason: "CompletionsReached"},
			},
		},
	}

	summary := convertJobToSummary(job)

	if summary.Status != "Complete" || summary.Completions != "1/1" {
		t.Errorf("expected Complete 1/1, got %s %s", summary.Status, summary.Completions)
	}
	if summary.OwnerCronJob != "nightly-recycler" {
		t.Errorf("expected owner nightly-recycler, got %s", summary.OwnerCronJob)
	}
	if summary.Duration == "" {
		t.Error("expected a duration")
	}
	if summary.CompletionMode != "NonIndexed" || summary.BackoffLimit != 6 {
		t.Errorf("unexpected job settings: %s/%d", summary.CompletionMode, summary.BackoffLimit)
	}
	if len(summary.Images) != 1 || summary.Images[0] != "bitnami/kubectl:latest" {
		t.Errorf("unexpected images: %v", summary.Images)
	}
	if summary.Selector["job-name"] != "nightly-recycler-123" {
		t.Errorf("unexpected selector: %v", summary.Selector)
	}
}

func TestResolveJobStatus(t *testing.T) {
	suspend := true
	suspended := &batchv1.Job{Spec: batchv1.JobSpec{Suspend: &suspend}}
	if status := resolveJobStatus(suspended); status != "Suspended" {
		t.Errorf("expected Suspended, got %s", status)
	}
	running := &batchv1.Job{
		Spec:   batchv1.JobSpec{},
		Status: batchv1.JobStatus{Active: 1, StartTime: &metav1.Time{Time: time.Now()}},
	}
	if status := resolveJobStatus(running); status != "Running" {
		t.Errorf("expected Running, got %s", status)
	}
	failed := &batchv1.Job{Status: batchv1.JobStatus{Conditions: []batchv1.JobCondition{{Type: batchv1.JobFailed, Status: corev1.ConditionTrue}}}}
	if status := resolveJobStatus(failed); status != "Failed" {
		t.Errorf("expected Failed, got %s", status)
	}
	pending := &batchv1.Job{}
	if status := resolveJobStatus(pending); status != "Pending" {
		t.Errorf("expected Pending, got %s", status)
	}
}

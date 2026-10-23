package cluster

import (
	"testing"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func cronJobInt32Ptr(value int32) *int32 {
	return &value
}

func TestConvertCronJobToSummary(t *testing.T) {
	timeZone := "UTC"
	lastSchedule := metav1.NewTime(time.Now().Add(-24 * time.Hour))
	lastSuccess := metav1.NewTime(time.Now().Add(-23 * time.Hour))
	parallelism := int32(2)
	backoffLimit := int32(6)
	cronJob := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "nightly-recycler",
			Namespace:         "unity-office",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-48 * time.Hour)),
			Labels:            map[string]string{"app": "recycler"},
			Annotations:       map[string]string{"team": "ops"},
		},
		Spec: batchv1.CronJobSpec{
			Schedule:                   "0 3 * * 0",
			TimeZone:                   &timeZone,
			ConcurrencyPolicy:          batchv1.ForbidConcurrent,
			SuccessfulJobsHistoryLimit: cronJobInt32Ptr(1),
			FailedJobsHistoryLimit:     cronJobInt32Ptr(1),
			JobTemplate: batchv1.JobTemplateSpec{
				Spec: batchv1.JobSpec{
					Parallelism:  &parallelism,
					BackoffLimit: &backoffLimit,
					Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{
						Containers: []corev1.Container{{Name: "kubectl", Image: "bitnami/kubectl:latest"}},
					}},
				},
			},
		},
		Status: batchv1.CronJobStatus{
			Active:             []corev1.ObjectReference{{Name: "nightly-recycler-123"}},
			LastScheduleTime:   &lastSchedule,
			LastSuccessfulTime: &lastSuccess,
		},
	}

	summary := convertCronJobToSummary(cronJob)

	if summary.Status != "Active" || summary.ActiveJobs != 1 {
		t.Errorf("expected Active with 1 job, got %s/%d", summary.Status, summary.ActiveJobs)
	}
	if summary.Schedule != "0 3 * * 0" || summary.TimeZone != "UTC" || summary.ConcurrencyPolicy != "Forbid" {
		t.Errorf("unexpected schedule settings: %+v", summary)
	}
	if summary.SuccessfulJobHistory != 1 || summary.FailedJobHistory != 1 {
		t.Errorf("unexpected history limits: %d/%d", summary.SuccessfulJobHistory, summary.FailedJobHistory)
	}
	if summary.LastScheduleTime == "" || summary.LastSuccessfulTime == "" {
		t.Errorf("expected last schedule/success times")
	}
	if summary.Parallelism == nil || *summary.Parallelism != 2 {
		t.Errorf("unexpected parallelism: %v", summary.Parallelism)
	}
	if len(summary.Images) != 1 || summary.Images[0] != "bitnami/kubectl:latest" {
		t.Errorf("unexpected images: %v", summary.Images)
	}
}

func TestResolveCronJobStatus(t *testing.T) {
	suspend := true
	suspended := &batchv1.CronJob{Spec: batchv1.CronJobSpec{Suspend: &suspend}}
	if status := resolveCronJobStatus(suspended); status != "Suspended" {
		t.Errorf("expected Suspended, got %s", status)
	}
	active := &batchv1.CronJob{Status: batchv1.CronJobStatus{Active: []corev1.ObjectReference{{Name: "job"}}}}
	if status := resolveCronJobStatus(active); status != "Active" {
		t.Errorf("expected Active, got %s", status)
	}
	idle := &batchv1.CronJob{}
	if status := resolveCronJobStatus(idle); status != "Idle" {
		t.Errorf("expected Idle, got %s", status)
	}
}

func TestBuildJobFromCronJob(t *testing.T) {
	cronJob := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "nightly-recycler",
			Namespace: "unity-office",
			UID:       types.UID("cronjob-uid"),
		},
		Spec: batchv1.CronJobSpec{
			JobTemplate: batchv1.JobTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels:      map[string]string{"app": "recycler"},
					Annotations: map[string]string{"note": "template"},
				},
				Spec: batchv1.JobSpec{
					Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{
						Containers: []corev1.Container{{Name: "kubectl", Image: "bitnami/kubectl:latest"}},
					}},
				},
			},
		},
	}

	job := buildJobFromCronJob(cronJob, "nightly-recycler-manual-12345")

	if job.Name != "nightly-recycler-manual-12345" || job.Namespace != "unity-office" {
		t.Errorf("unexpected identity: %s/%s", job.Namespace, job.Name)
	}
	if job.Annotations["cronjob.kubernetes.io/instantiate"] != "manual" {
		t.Errorf("missing manual annotation: %v", job.Annotations)
	}
	if job.Labels["app"] != "recycler" || job.Annotations["note"] != "template" {
		t.Errorf("template metadata not copied")
	}
	if len(job.OwnerReferences) != 1 || job.OwnerReferences[0].Kind != "CronJob" {
		t.Errorf("unexpected owner references: %v", job.OwnerReferences)
	}
	if len(job.Spec.Template.Spec.Containers) != 1 || job.Spec.Template.Spec.Containers[0].Image != "bitnami/kubectl:latest" {
		t.Errorf("job template not copied")
	}
}

func TestManualJobName(t *testing.T) {
	name := manualJobName("this-is-a-very-long-cronjob-name-that-would-overflow-the-limit", 1700000000)
	if len(name) > 63 {
		t.Errorf("expected name <= 63 chars, got %d: %s", len(name), name)
	}
	if name[:len(name)-len("-manual-1700000000")] == "" {
		t.Error("expected a non-empty base")
	}
}

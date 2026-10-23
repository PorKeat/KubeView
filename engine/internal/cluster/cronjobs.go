package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// CronJobSummary provides display-ready schedule and job-template metadata.
type CronJobSummary struct {
	Name                    string            `json:"name"`
	Namespace               string            `json:"namespace"`
	Status                  string            `json:"status"`
	Schedule                string            `json:"schedule"`
	TimeZone                string            `json:"timeZone,omitempty"`
	Suspend                 bool              `json:"suspend"`
	ConcurrencyPolicy       string            `json:"concurrencyPolicy"`
	StartingDeadlineSeconds int64             `json:"startingDeadlineSeconds"`
	SuccessfulJobHistory    int32             `json:"successfulJobHistoryLimit"`
	FailedJobHistory        int32             `json:"failedJobHistoryLimit"`
	ActiveJobs              int32             `json:"activeJobs"`
	LastScheduleTime        string            `json:"lastScheduleTime,omitempty"`
	LastSuccessfulTime      string            `json:"lastSuccessfulTime,omitempty"`
	Age                     string            `json:"age"`
	CreationTimestamp       string            `json:"creationTimestamp"`
	Images                  []string          `json:"images"`
	Selector                map[string]string `json:"selector,omitempty"`
	Parallelism             *int32            `json:"parallelism,omitempty"`
	Completions             *int32            `json:"completions,omitempty"`
	BackoffLimit            *int32            `json:"backoffLimit,omitempty"`
	ActiveDeadlineSeconds   *int64            `json:"activeDeadlineSeconds,omitempty"`
	TTLSecondsAfterFinished *int32            `json:"ttlSecondsAfterFinished,omitempty"`
	Labels                  map[string]string `json:"labels,omitempty"`
	Annotations             map[string]string `json:"annotations,omitempty"`
}

type ListCronJobsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

type ListCronJobsResult struct {
	Items      []CronJobSummary `json:"items"`
	TotalCount int              `json:"totalCount"`
}

func (m *Manager) ListCronJobs(ctx context.Context, contextName, namespace string) (*ListCronJobsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	list, err := client.BatchV1().CronJobs(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list cronjobs: %w", err)
	}
	items := make([]CronJobSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertCronJobToSummary(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListCronJobsResult{Items: items, TotalCount: len(items)}, nil
}

func convertCronJobToSummary(cj *batchv1.CronJob) CronJobSummary {
	suspend := cj.Spec.Suspend != nil && *cj.Spec.Suspend
	timeZone := ""
	if cj.Spec.TimeZone != nil {
		timeZone = *cj.Spec.TimeZone
	}
	concurrencyPolicy := string(cj.Spec.ConcurrencyPolicy)
	if concurrencyPolicy == "" {
		concurrencyPolicy = string(batchv1.AllowConcurrent)
	}
	startingDeadlineSeconds := int64(0)
	if cj.Spec.StartingDeadlineSeconds != nil {
		startingDeadlineSeconds = *cj.Spec.StartingDeadlineSeconds
	}
	successfulHistory := int32(3)
	if cj.Spec.SuccessfulJobsHistoryLimit != nil {
		successfulHistory = *cj.Spec.SuccessfulJobsHistoryLimit
	}
	failedHistory := int32(1)
	if cj.Spec.FailedJobsHistoryLimit != nil {
		failedHistory = *cj.Spec.FailedJobsHistoryLimit
	}

	images := make([]string, 0)
	seenImages := make(map[string]struct{})
	for _, container := range cj.Spec.JobTemplate.Spec.Template.Spec.Containers {
		if container.Image == "" {
			continue
		}
		if _, exists := seenImages[container.Image]; exists {
			continue
		}
		seenImages[container.Image] = struct{}{}
		images = append(images, container.Image)
	}

	selector := map[string]string{}
	if cj.Spec.JobTemplate.Spec.Selector != nil {
		for key, value := range cj.Spec.JobTemplate.Spec.Selector.MatchLabels {
			selector[key] = value
		}
	}

	lastScheduleTime := ""
	if cj.Status.LastScheduleTime != nil {
		lastScheduleTime = cj.Status.LastScheduleTime.Time.Format(time.RFC3339)
	}
	lastSuccessfulTime := ""
	if cj.Status.LastSuccessfulTime != nil {
		lastSuccessfulTime = cj.Status.LastSuccessfulTime.Time.Format(time.RFC3339)
	}

	return CronJobSummary{
		Name:                    cj.Name,
		Namespace:               cj.Namespace,
		Status:                  resolveCronJobStatus(cj),
		Schedule:                cj.Spec.Schedule,
		TimeZone:                timeZone,
		Suspend:                 suspend,
		ConcurrencyPolicy:       concurrencyPolicy,
		StartingDeadlineSeconds: startingDeadlineSeconds,
		SuccessfulJobHistory:    successfulHistory,
		FailedJobHistory:        failedHistory,
		ActiveJobs:              int32(len(cj.Status.Active)),
		LastScheduleTime:        lastScheduleTime,
		LastSuccessfulTime:      lastSuccessfulTime,
		Age:                     formatAge(time.Since(cj.CreationTimestamp.Time)),
		CreationTimestamp:       cj.CreationTimestamp.Time.Format(time.RFC3339),
		Images:                  images,
		Selector:                selector,
		Parallelism:             cj.Spec.JobTemplate.Spec.Parallelism,
		Completions:             cj.Spec.JobTemplate.Spec.Completions,
		BackoffLimit:            cj.Spec.JobTemplate.Spec.BackoffLimit,
		ActiveDeadlineSeconds:   cj.Spec.JobTemplate.Spec.ActiveDeadlineSeconds,
		TTLSecondsAfterFinished: cj.Spec.JobTemplate.Spec.TTLSecondsAfterFinished,
		Labels:                  cj.Labels,
		Annotations:             cj.Annotations,
	}
}

func resolveCronJobStatus(cj *batchv1.CronJob) string {
	if cj.Spec.Suspend != nil && *cj.Spec.Suspend {
		return "Suspended"
	}
	if len(cj.Status.Active) > 0 {
		return "Active"
	}
	return "Idle"
}

func (m *Manager) GetCronJobYaml(ctx context.Context, contextName, namespace, cronJobName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	cronJob, err := client.BatchV1().CronJobs(namespace).Get(ctx, cronJobName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get cronjob %s: %w", cronJobName, err)
	}
	cronJob.TypeMeta = metav1.TypeMeta{APIVersion: "batch/v1", Kind: "CronJob"}
	cronJob.ManagedFields = nil
	data, err := yaml.Marshal(cronJob)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal cronjob to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

type CronJobActionParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
}

func (m *Manager) SetCronJobSuspend(ctx context.Context, p CronJobActionParams, suspend bool) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	cronJob, err := client.BatchV1().CronJobs(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get cronjob %s: %w", p.Name, err)
	}
	cronJob.Spec.Suspend = &suspend
	if _, err := client.BatchV1().CronJobs(p.Namespace).Update(ctx, cronJob, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to update cronjob suspend state %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

func (m *Manager) DeleteCronJob(ctx context.Context, p CronJobActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	if err := client.BatchV1().CronJobs(p.Namespace).Delete(ctx, p.Name, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to delete cronjob %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

func manualJobName(cronJobName string, unix int64) string {
	suffix := fmt.Sprintf("-manual-%d", unix)
	maxBase := 63 - len(suffix)
	base := cronJobName
	if maxBase < 1 {
		base = "cronjob"
	} else if len(base) > maxBase {
		base = base[:maxBase]
	}
	base = strings.TrimRight(base, "-")
	if base == "" {
		base = "cronjob"
	}
	return base + suffix
}

func buildJobFromCronJob(cj *batchv1.CronJob, name string) *batchv1.Job {
	labels := map[string]string{}
	for key, value := range cj.Spec.JobTemplate.Labels {
		labels[key] = value
	}
	annotations := map[string]string{}
	for key, value := range cj.Spec.JobTemplate.Annotations {
		annotations[key] = value
	}
	annotations["cronjob.kubernetes.io/instantiate"] = "manual"
	controller := true
	blockOwnerDeletion := true
	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			Namespace:   cj.Namespace,
			Labels:      labels,
			Annotations: annotations,
			OwnerReferences: []metav1.OwnerReference{{
				APIVersion:         "batch/v1",
				Kind:               "CronJob",
				Name:               cj.Name,
				UID:                cj.UID,
				Controller:         &controller,
				BlockOwnerDeletion: &blockOwnerDeletion,
			}},
		},
		Spec: *cj.Spec.JobTemplate.Spec.DeepCopy(),
	}
}

func (m *Manager) TriggerCronJob(ctx context.Context, p CronJobActionParams) (string, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return "", err
	}
	cronJob, err := client.BatchV1().CronJobs(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get cronjob %s: %w", p.Name, err)
	}
	jobName := manualJobName(cronJob.Name, time.Now().Unix())
	job := buildJobFromCronJob(cronJob, jobName)
	created, err := client.BatchV1().Jobs(p.Namespace).Create(ctx, job, metav1.CreateOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to trigger cronjob %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return created.Name, nil
}

var _ = corev1.ObjectReference{}

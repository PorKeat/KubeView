package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

type JobConditionItem struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastProbeTime      string `json:"lastProbeTime,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

// JobSummary provides display-ready completion and retry metadata.
type JobSummary struct {
	Name                    string             `json:"name"`
	Namespace               string             `json:"namespace"`
	Status                  string             `json:"status"`
	Completions             string             `json:"completions"`
	DesiredCompletions      int32              `json:"desiredCompletions"`
	Active                  int32              `json:"active"`
	Succeeded               int32              `json:"succeeded"`
	Failed                  int32              `json:"failed"`
	Duration                string             `json:"duration"`
	Age                     string             `json:"age"`
	CreationTimestamp       string             `json:"creationTimestamp"`
	StartTime               string             `json:"startTime,omitempty"`
	CompletionTime          string             `json:"completionTime,omitempty"`
	Images                  []string           `json:"images"`
	Selector                map[string]string  `json:"selector,omitempty"`
	OwnerCronJob            string             `json:"ownerCronJob,omitempty"`
	Parallelism             int32              `json:"parallelism"`
	BackoffLimit            int32              `json:"backoffLimit"`
	ActiveDeadlineSeconds   int64              `json:"activeDeadlineSeconds"`
	TTLSecondsAfterFinished int32              `json:"ttlSecondsAfterFinished"`
	Suspend                 bool               `json:"suspend"`
	CompletionMode          string             `json:"completionMode"`
	Conditions              []JobConditionItem `json:"conditions,omitempty"`
	Labels                  map[string]string  `json:"labels,omitempty"`
	Annotations             map[string]string  `json:"annotations,omitempty"`
}

type ListJobsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

type ListJobsResult struct {
	Items      []JobSummary `json:"items"`
	TotalCount int          `json:"totalCount"`
}

func (m *Manager) ListJobs(ctx context.Context, contextName, namespace string) (*ListJobsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	list, err := client.BatchV1().Jobs(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs: %w", err)
	}
	items := make([]JobSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertJobToSummary(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListJobsResult{Items: items, TotalCount: len(items)}, nil
}

func convertJobToSummary(job *batchv1.Job) JobSummary {
	desiredCompletions := int32(1)
	if job.Spec.Completions != nil {
		desiredCompletions = *job.Spec.Completions
	}
	parallelism := int32(1)
	if job.Spec.Parallelism != nil {
		parallelism = *job.Spec.Parallelism
	}
	backoffLimit := int32(6)
	if job.Spec.BackoffLimit != nil {
		backoffLimit = *job.Spec.BackoffLimit
	}
	activeDeadlineSeconds := int64(0)
	if job.Spec.ActiveDeadlineSeconds != nil {
		activeDeadlineSeconds = *job.Spec.ActiveDeadlineSeconds
	}
	ttlSecondsAfterFinished := int32(0)
	if job.Spec.TTLSecondsAfterFinished != nil {
		ttlSecondsAfterFinished = *job.Spec.TTLSecondsAfterFinished
	}
	completionMode := string(batchv1.NonIndexedCompletion)
	if job.Spec.CompletionMode != nil {
		completionMode = string(*job.Spec.CompletionMode)
	}
	suspend := job.Spec.Suspend != nil && *job.Spec.Suspend

	images := make([]string, 0)
	seenImages := make(map[string]struct{})
	for _, container := range job.Spec.Template.Spec.Containers {
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
	if job.Spec.Selector != nil {
		for key, value := range job.Spec.Selector.MatchLabels {
			selector[key] = value
		}
	}
	if len(selector) == 0 {
		selector["job-name"] = job.Name
	}

	ownerCronJob := ""
	for _, owner := range job.OwnerReferences {
		if owner.Kind == "CronJob" {
			ownerCronJob = owner.Name
			break
		}
	}

	startTime := ""
	if job.Status.StartTime != nil {
		startTime = job.Status.StartTime.Time.Format(time.RFC3339)
	}
	completionTime := ""
	if job.Status.CompletionTime != nil {
		completionTime = job.Status.CompletionTime.Time.Format(time.RFC3339)
	}
	duration := ""
	if job.Status.StartTime != nil {
		end := time.Now()
		if job.Status.CompletionTime != nil {
			end = job.Status.CompletionTime.Time
		}
		if end.Before(job.Status.StartTime.Time) {
			end = job.Status.StartTime.Time
		}
		duration = formatAge(end.Sub(job.Status.StartTime.Time))
	}

	conditions := make([]JobConditionItem, 0, len(job.Status.Conditions))
	for _, condition := range job.Status.Conditions {
		lastProbe := ""
		if !condition.LastProbeTime.IsZero() {
			lastProbe = condition.LastProbeTime.Time.Format(time.RFC3339)
		}
		lastTransition := ""
		if !condition.LastTransitionTime.IsZero() {
			lastTransition = condition.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditions = append(conditions, JobConditionItem{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			Reason:             condition.Reason,
			Message:            condition.Message,
			LastProbeTime:      lastProbe,
			LastTransitionTime: lastTransition,
		})
	}

	return JobSummary{
		Name:                    job.Name,
		Namespace:               job.Namespace,
		Status:                  resolveJobStatus(job),
		Completions:             fmt.Sprintf("%d/%d", job.Status.Succeeded, desiredCompletions),
		DesiredCompletions:      desiredCompletions,
		Active:                  job.Status.Active,
		Succeeded:               job.Status.Succeeded,
		Failed:                  job.Status.Failed,
		Duration:                duration,
		Age:                     formatAge(time.Since(job.CreationTimestamp.Time)),
		CreationTimestamp:       job.CreationTimestamp.Time.Format(time.RFC3339),
		StartTime:               startTime,
		CompletionTime:          completionTime,
		Images:                  images,
		Selector:                selector,
		OwnerCronJob:            ownerCronJob,
		Parallelism:             parallelism,
		BackoffLimit:            backoffLimit,
		ActiveDeadlineSeconds:   activeDeadlineSeconds,
		TTLSecondsAfterFinished: ttlSecondsAfterFinished,
		Suspend:                 suspend,
		CompletionMode:          completionMode,
		Conditions:              conditions,
		Labels:                  job.Labels,
		Annotations:             job.Annotations,
	}
}

func resolveJobStatus(job *batchv1.Job) string {
	for _, condition := range job.Status.Conditions {
		if condition.Status != corev1.ConditionTrue {
			continue
		}
		switch condition.Type {
		case batchv1.JobComplete:
			return "Complete"
		case batchv1.JobFailed:
			return "Failed"
		}
	}
	if job.Spec.Suspend != nil && *job.Spec.Suspend {
		return "Suspended"
	}
	if job.Status.Active > 0 {
		return "Running"
	}
	if job.Status.StartTime != nil {
		return "Running"
	}
	return "Pending"
}

func (m *Manager) GetJobYaml(ctx context.Context, contextName, namespace, jobName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	job, err := client.BatchV1().Jobs(namespace).Get(ctx, jobName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get job %s: %w", jobName, err)
	}
	job.TypeMeta = metav1.TypeMeta{APIVersion: "batch/v1", Kind: "Job"}
	job.ManagedFields = nil
	data, err := yaml.Marshal(job)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal job to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

type JobActionParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
}

func (m *Manager) DeleteJob(ctx context.Context, p JobActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	if err := client.BatchV1().Jobs(p.Namespace).Delete(ctx, p.Name, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to delete job %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

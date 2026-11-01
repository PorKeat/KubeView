package cluster

import (
	"context"
	"fmt"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	shared "github.com/kubeview/engine/internal/domain/shared"
)

// SetStatefulSetPartitionParams selects the StatefulSet and rolling-update partition.
type SetStatefulSetPartitionParams struct {
	StatefulSetActionParams
	Partition int32 `json:"partition"`
}

// SetStatefulSetPartition pins the updated ReplicaSet in a partitioned
// StatefulSet rollout, matching `kubectl rollout pause` semantics.
func (m *Manager) SetStatefulSetPartition(ctx context.Context, p SetStatefulSetPartitionParams) error {
	if p.Partition < 0 {
		return shared.Validation("partition must be zero or greater")
	}
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	statefulSet, err := client.AppsV1().StatefulSets(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get statefulset %s: %w", p.Name, err)
	}
	if statefulSet.Spec.UpdateStrategy.RollingUpdate == nil {
		statefulSet.Spec.UpdateStrategy.RollingUpdate = &appsv1.RollingUpdateStatefulSetStrategy{}
	}
	statefulSet.Spec.UpdateStrategy.RollingUpdate.Partition = &p.Partition
	if _, err := client.AppsV1().StatefulSets(p.Namespace).Update(ctx, statefulSet, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to update statefulset partition: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// CloneJobParams selects a Job and the optional name of the new Job.
type CloneJobParams struct {
	JobActionParams
	NewName string `json:"newName,omitempty"`
}

func sanitizeJobCopy(job *batchv1.Job) *batchv1.Job {
	copied := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Namespace:   job.Namespace,
			Labels:      map[string]string{},
			Annotations: map[string]string{},
		},
		Spec: *job.Spec.DeepCopy(),
	}
	for key, value := range job.Labels {
		if strings.Contains(key, "controller-uid") || strings.Contains(key, "job-name") {
			continue
		}
		copied.Labels[key] = value
	}
	for key, value := range job.Annotations {
		if strings.Contains(key, "controller-uid") || strings.Contains(key, "job-name") {
			continue
		}
		copied.Annotations[key] = value
	}
	// The API server generates a fresh selector and controller UID. Copying the
	// old ones would make the new Job adopt the old controller's pods.
	copied.Spec.Selector = nil
	copied.Spec.ManualSelector = nil
	if copied.Spec.Template.Labels == nil {
		copied.Spec.Template.Labels = map[string]string{}
	}
	for key := range copied.Spec.Template.Labels {
		if strings.Contains(key, "controller-uid") || strings.Contains(key, "job-name") {
			delete(copied.Spec.Template.Labels, key)
		}
	}
	copied.Spec.Template.Labels["kubeview.io/cloned-from"] = job.Name
	return copied
}

// CloneJob creates a new Job from an existing Job spec. It is used both by
// explicit clone and by retry (which generates a name).
func (m *Manager) CloneJob(ctx context.Context, p CloneJobParams, generateName bool) (*JobSummary, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}
	job, err := client.BatchV1().Jobs(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get job %s: %w", p.Name, err)
	}
	copied := sanitizeJobCopy(job)
	if generateName {
		prefix := strings.TrimSpace(p.NewName)
		if prefix == "" {
			prefix = job.Name + "-retry-"
		}
		if !strings.HasSuffix(prefix, "-") {
			prefix += "-"
		}
		if len(prefix) > 58 {
			prefix = prefix[:58]
		}
		copied.GenerateName = prefix
	} else {
		name := strings.TrimSpace(p.NewName)
		if name == "" {
			return nil, shared.Validation("newName is required when cloning a job")
		}
		copied.Name = name
	}
	created, err := client.BatchV1().Jobs(p.Namespace).Create(ctx, copied, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create job from %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	summary := convertJobToSummary(created)
	return &summary, nil
}

// ExpandPersistentVolumeClaimParams requests a larger PVC storage size.
type ExpandPersistentVolumeClaimParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
	Storage     string `json:"storage"`
}

// ExpandPVCExtensionResult is returned by persistentvolumeclaims.expand.
type ExpandPVCExtensionResult struct {
	Name    string `json:"name"`
	Storage string `json:"storage"`
}

// ExpandPersistentVolumeClaim increases spec.resources.requests.storage after
// verifying the StorageClass allows expansion.
func (m *Manager) ExpandPersistentVolumeClaim(
	ctx context.Context,
	p ExpandPersistentVolumeClaimParams,
) (*ExpandPVCExtensionResult, error) {
	requested, err := resource.ParseQuantity(strings.TrimSpace(p.Storage))
	if err != nil || requested.Sign() <= 0 {
		return nil, shared.Validation("storage must be a positive quantity such as 5Gi")
	}
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}
	claim, err := client.CoreV1().PersistentVolumeClaims(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get persistentvolumeclaim %s: %w", p.Name, err)
	}
	current := claim.Spec.Resources.Requests[corev1.ResourceStorage]
	if requested.Cmp(current) <= 0 {
		return nil, shared.Validation(fmt.Sprintf("new size %s must be larger than the current size %s", requested.String(), current.String()))
	}
	if claim.Spec.StorageClassName != nil && *claim.Spec.StorageClassName != "" {
		storageClass, scErr := client.StorageV1().StorageClasses().Get(ctx, *claim.Spec.StorageClassName, metav1.GetOptions{})
		switch {
		case scErr == nil && (storageClass.AllowVolumeExpansion == nil || !*storageClass.AllowVolumeExpansion):
			return nil, shared.Validation(fmt.Sprintf("storage class %s does not allow volume expansion", storageClass.Name))
		case scErr != nil && !apierrors.IsNotFound(scErr) && !apierrors.IsForbidden(scErr):
			return nil, fmt.Errorf("failed to check storage class: %w", scErr)
		}
	}
	if claim.Spec.Resources.Requests == nil {
		claim.Spec.Resources.Requests = corev1.ResourceList{}
	}
	claim.Spec.Resources.Requests[corev1.ResourceStorage] = requested
	updated, err := client.CoreV1().PersistentVolumeClaims(p.Namespace).Update(ctx, claim, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to expand persistentvolumeclaim %s: %w", p.Name, err)
	}
	storage := updated.Spec.Resources.Requests[corev1.ResourceStorage]
	return &ExpandPVCExtensionResult{Name: updated.Name, Storage: storage.String()}, nil
}

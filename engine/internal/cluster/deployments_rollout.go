package cluster

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	shared "github.com/kubeview/engine/internal/domain/shared"
)

// DeploymentRolloutRevision is one ReplicaSet revision in a rollout history.
type DeploymentRolloutRevision struct {
	Revision       int64    `json:"revision"`
	ReplicaSetName string   `json:"replicaSetName"`
	Images         []string `json:"images"`
	Desired        int32    `json:"desired"`
	Ready          int32    `json:"ready"`
	CreatedAt      string   `json:"createdAt"`
	ChangeCause    string   `json:"changeCause,omitempty"`
	Current        bool     `json:"current"`
}

// RollbackDeploymentParams selects a Deployment and a target revision.
type RollbackDeploymentParams struct {
	DeploymentActionParams
	Revision int64 `json:"revision"`
}

func deploymentRevision(replicaSet *appsv1.ReplicaSet) (int64, bool) {
	value, ok := replicaSet.Annotations["deployment.kubernetes.io/revision"]
	if !ok {
		return 0, false
	}
	revision, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil || revision <= 0 {
		return 0, false
	}
	return revision, true
}

func replicaSetImages(replicaSet *appsv1.ReplicaSet) []string {
	images := make([]string, 0)
	seen := make(map[string]struct{})
	for _, container := range replicaSet.Spec.Template.Spec.Containers {
		if container.Image == "" {
			continue
		}
		if _, ok := seen[container.Image]; ok {
			continue
		}
		seen[container.Image] = struct{}{}
		images = append(images, container.Image)
	}
	return images
}

func ownedByDeployment(replicaSet *appsv1.ReplicaSet, deployment *appsv1.Deployment) bool {
	for _, owner := range replicaSet.OwnerReferences {
		if owner.UID == deployment.UID {
			return true
		}
	}
	return false
}

// ListDeploymentRevisions returns the ReplicaSet-backed rollout history for a
// Deployment, oldest revision first, mirroring kubectl rollout history.
func (m *Manager) ListDeploymentRevisions(
	ctx context.Context,
	contextName, namespace, name string,
) ([]DeploymentRolloutRevision, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	deployment, err := client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment %s: %w", name, err)
	}
	replicaSets, err := client.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list replicasets: %w", err)
	}

	currentRevision, _ := deploymentRevisionFromObject(deployment)
	items := make([]DeploymentRolloutRevision, 0)
	for i := range replicaSets.Items {
		replicaSet := &replicaSets.Items[i]
		if !ownedByDeployment(replicaSet, deployment) {
			continue
		}
		revision, ok := deploymentRevision(replicaSet)
		if !ok {
			continue
		}
		desired := int32(0)
		if replicaSet.Spec.Replicas != nil {
			desired = *replicaSet.Spec.Replicas
		}
		changeCause := ""
		if replicaSet.Annotations != nil {
			changeCause = replicaSet.Annotations["kubernetes.io/change-cause"]
		}
		items = append(items, DeploymentRolloutRevision{
			Revision:       revision,
			ReplicaSetName: replicaSet.Name,
			Images:         replicaSetImages(replicaSet),
			Desired:        desired,
			Ready:          replicaSet.Status.ReadyReplicas,
			CreatedAt:      replicaSet.CreationTimestamp.UTC().Format("2006-01-02T15:04:05Z07:00"),
			ChangeCause:    changeCause,
			Current:        revision == currentRevision,
		})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Revision < items[j].Revision })
	return items, nil
}

func deploymentRevisionFromObject(deployment *appsv1.Deployment) (int64, bool) {
	if deployment.Annotations == nil {
		return 0, false
	}
	value, ok := deployment.Annotations["deployment.kubernetes.io/revision"]
	if !ok {
		return 0, false
	}
	revision, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil || revision <= 0 {
		return 0, false
	}
	return revision, true
}

// RollbackDeployment copies the pod template of a historical ReplicaSet back
// into the Deployment, which is exactly what kubectl rollout undo does.
func (m *Manager) RollbackDeployment(ctx context.Context, p RollbackDeploymentParams) error {
	if p.Revision <= 0 {
		return shared.Validation("revision must be greater than zero")
	}
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	deployment, err := client.AppsV1().Deployments(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s: %w", p.Name, err)
	}
	replicaSets, err := client.AppsV1().ReplicaSets(p.Namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list replicasets: %w", err)
	}

	var target *appsv1.ReplicaSet
	for i := range replicaSets.Items {
		replicaSet := &replicaSets.Items[i]
		if !ownedByDeployment(replicaSet, deployment) {
			continue
		}
		revision, ok := deploymentRevision(replicaSet)
		if ok && revision == p.Revision {
			target = replicaSet
			break
		}
	}
	if target == nil {
		return shared.NewError(
			shared.KindNotFound,
			fmt.Sprintf("revision %d not found for deployment %s", p.Revision, p.Name),
			nil,
		)
	}

	deployment.Spec.Template = *target.Spec.Template.DeepCopy()
	// The controller adds pod-template-hash to ReplicaSet templates. Copying
	// it back into the Deployment would pin every future revision to it.
	if deployment.Spec.Template.Labels != nil {
		delete(deployment.Spec.Template.Labels, "pod-template-hash")
	}
	deployment.Spec.Paused = false
	if deployment.Annotations == nil {
		deployment.Annotations = map[string]string{}
	}
	deployment.Annotations["kubernetes.io/change-cause"] = fmt.Sprintf(
		"kubectl rollout undo deployment/%s to revision %d", p.Name, p.Revision,
	)
	if _, err := client.AppsV1().Deployments(p.Namespace).Update(ctx, deployment, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to roll back deployment %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// SetDeploymentPaused pauses or resumes a rollout.
func (m *Manager) SetDeploymentPaused(ctx context.Context, p DeploymentActionParams, paused bool) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	deployment, err := client.AppsV1().Deployments(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s: %w", p.Name, err)
	}
	if deployment.Spec.Paused == paused {
		return nil
	}
	deployment.Spec.Paused = paused
	if _, err := client.AppsV1().Deployments(p.Namespace).Update(ctx, deployment, metav1.UpdateOptions{}); err != nil {
		action := "pause"
		if !paused {
			action = "resume"
		}
		return fmt.Errorf("failed to %s deployment %s: %w", action, p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

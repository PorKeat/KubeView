package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// DeploymentConditionItem represents a live Kubernetes deployment condition.
type DeploymentConditionItem struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastUpdateTime     string `json:"lastUpdateTime,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

// DeploymentSummary provides display-ready rollout metadata for the deployment list.
type DeploymentSummary struct {
	Name                string                    `json:"name"`
	Namespace           string                    `json:"namespace"`
	Status              string                    `json:"status"`
	Ready               string                    `json:"ready"`
	DesiredReplicas     int32                     `json:"desiredReplicas"`
	ReadyReplicas       int32                     `json:"readyReplicas"`
	UpdatedReplicas     int32                     `json:"updatedReplicas"`
	AvailableReplicas   int32                     `json:"availableReplicas"`
	UnavailableReplicas int32                     `json:"unavailableReplicas"`
	Age                 string                    `json:"age"`
	CreationTimestamp   string                    `json:"creationTimestamp"`
	Images              []string                  `json:"images"`
	Selector            map[string]string         `json:"selector,omitempty"`
	Strategy            string                    `json:"strategy"`
	Revision            string                    `json:"revision,omitempty"`
	Paused              bool                      `json:"paused"`
	Generation          int64                     `json:"generation"`
	ObservedGeneration  int64                     `json:"observedGeneration"`
	Conditions          []DeploymentConditionItem `json:"conditions,omitempty"`
	Labels              map[string]string         `json:"labels,omitempty"`
	Annotations         map[string]string         `json:"annotations,omitempty"`
}

// ListDeploymentsParams scopes a deployment list to a context and namespace.
type ListDeploymentsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListDeploymentsResult is the JSON-RPC payload for deployments.list.
type ListDeploymentsResult struct {
	Items      []DeploymentSummary `json:"items"`
	TotalCount int                 `json:"totalCount"`
}

// ListDeployments queries deployments in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListDeployments(ctx context.Context, contextName, namespace string) (*ListDeploymentsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	deploymentList, err := client.AppsV1().Deployments(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments: %w", err)
	}

	items := make([]DeploymentSummary, 0, len(deploymentList.Items))
	for i := range deploymentList.Items {
		items = append(items, convertDeploymentToSummary(&deploymentList.Items[i]))
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListDeploymentsResult{
		Items:      items,
		TotalCount: len(items),
	}, nil
}

// convertDeploymentToSummary transforms a client-go Deployment into a UI-ready row.
func convertDeploymentToSummary(d *appsv1.Deployment) DeploymentSummary {
	desired := int32(1)
	if d.Spec.Replicas != nil {
		desired = *d.Spec.Replicas
	}

	strategy := string(d.Spec.Strategy.Type)
	if strategy == "" {
		strategy = string(appsv1.RollingUpdateDeploymentStrategyType)
	}

	var images []string
	seenImages := make(map[string]struct{})
	for _, container := range d.Spec.Template.Spec.Containers {
		if container.Image == "" {
			continue
		}
		if _, exists := seenImages[container.Image]; exists {
			continue
		}
		seenImages[container.Image] = struct{}{}
		images = append(images, container.Image)
	}
	if images == nil {
		images = []string{}
	}

	selector := map[string]string{}
	if d.Spec.Selector != nil {
		for key, value := range d.Spec.Selector.MatchLabels {
			selector[key] = value
		}
	}

	conditions := make([]DeploymentConditionItem, 0, len(d.Status.Conditions))
	for _, condition := range d.Status.Conditions {
		lastUpdate := ""
		if !condition.LastUpdateTime.IsZero() {
			lastUpdate = condition.LastUpdateTime.Time.Format(time.RFC3339)
		}
		lastTransition := ""
		if !condition.LastTransitionTime.IsZero() {
			lastTransition = condition.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditions = append(conditions, DeploymentConditionItem{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			Reason:             condition.Reason,
			Message:            condition.Message,
			LastUpdateTime:     lastUpdate,
			LastTransitionTime: lastTransition,
		})
	}

	revision := ""
	if d.Annotations != nil {
		revision = d.Annotations["deployment.kubernetes.io/revision"]
	}

	return DeploymentSummary{
		Name:                d.Name,
		Namespace:           d.Namespace,
		Status:              resolveDeploymentStatus(d, desired),
		Ready:               fmt.Sprintf("%d/%d", d.Status.ReadyReplicas, desired),
		DesiredReplicas:     desired,
		ReadyReplicas:       d.Status.ReadyReplicas,
		UpdatedReplicas:     d.Status.UpdatedReplicas,
		AvailableReplicas:   d.Status.AvailableReplicas,
		UnavailableReplicas: d.Status.UnavailableReplicas,
		Age:                 formatAge(time.Since(d.CreationTimestamp.Time)),
		CreationTimestamp:   d.CreationTimestamp.Time.Format(time.RFC3339),
		Images:              images,
		Selector:            selector,
		Strategy:            strategy,
		Revision:            revision,
		Paused:              d.Spec.Paused,
		Generation:          d.Generation,
		ObservedGeneration:  d.Status.ObservedGeneration,
		Conditions:          conditions,
		Labels:              d.Labels,
		Annotations:         d.Annotations,
	}
}

// resolveDeploymentStatus derives a concise rollout state for list filters.
func resolveDeploymentStatus(d *appsv1.Deployment, desired int32) string {
	if d.Spec.Paused {
		return "Paused"
	}
	if desired == 0 {
		return "Scaled Down"
	}

	var progressing *appsv1.DeploymentCondition
	var available *appsv1.DeploymentCondition
	for i := range d.Status.Conditions {
		condition := &d.Status.Conditions[i]
		switch condition.Type {
		case appsv1.DeploymentProgressing:
			progressing = condition
		case appsv1.DeploymentAvailable:
			available = condition
		}
	}

	// A failed rollout carries an explicit Progressing=False condition.
	if progressing != nil && progressing.Status == corev1.ConditionFalse {
		return "Degraded"
	}

	fullyUpdated := d.Status.UpdatedReplicas >= desired
	fullyAvailable := d.Status.AvailableReplicas >= desired
	fullyReady := d.Status.ReadyReplicas >= desired
	if fullyUpdated && fullyAvailable && fullyReady {
		return "Healthy"
	}

	// Availability can lag briefly during a rolling update, so only report
	// Degraded once the controller has observed the latest generation.
	if available != nil && available.Status == corev1.ConditionFalse &&
		d.Status.ObservedGeneration >= d.Generation {
		return "Degraded"
	}

	return "Progressing"
}

// GetDeploymentYaml exports the live Deployment manifest as YAML.
func (m *Manager) GetDeploymentYaml(ctx context.Context, contextName, namespace, deploymentName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	deployment, err := client.AppsV1().Deployments(namespace).Get(ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment %s: %w", deploymentName, err)
	}

	deployment.TypeMeta = metav1.TypeMeta{APIVersion: "apps/v1", Kind: "Deployment"}
	deployment.ManagedFields = nil

	data, err := yaml.Marshal(deployment)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal deployment to YAML: %w", err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

// DeploymentActionParams identifies a Deployment for an operational action.
type DeploymentActionParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
	Replicas    *int32 `json:"replicas,omitempty"`
}

// RestartDeployment triggers a rolling restart by updating the pod template annotation.
func (m *Manager) RestartDeployment(ctx context.Context, p DeploymentActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	deployment, err := client.AppsV1().Deployments(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s: %w", p.Name, err)
	}

	if deployment.Spec.Template.Annotations == nil {
		deployment.Spec.Template.Annotations = map[string]string{}
	}
	deployment.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().UTC().Format(time.RFC3339)

	if _, err := client.AppsV1().Deployments(p.Namespace).Update(ctx, deployment, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to restart deployment %s: %w", p.Name, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// ScaleDeployment updates the desired replica count for a Deployment.
func (m *Manager) ScaleDeployment(ctx context.Context, p DeploymentActionParams) error {
	if p.Replicas == nil {
		return fmt.Errorf("replicas is required")
	}

	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	deployment, err := client.AppsV1().Deployments(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s: %w", p.Name, err)
	}

	deployment.Spec.Replicas = p.Replicas
	if _, err := client.AppsV1().Deployments(p.Namespace).Update(ctx, deployment, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to scale deployment %s: %w", p.Name, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// DeleteDeployment removes a Deployment and its dependent resources.
func (m *Manager) DeleteDeployment(ctx context.Context, p DeploymentActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	if err := client.AppsV1().Deployments(p.Namespace).Delete(ctx, p.Name, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to delete deployment %s: %w", p.Name, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

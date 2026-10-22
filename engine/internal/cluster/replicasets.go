package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ReplicaSetConditionItem represents a live ReplicaSet condition.
type ReplicaSetConditionItem struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

// ReplicaSetSummary provides display-ready metadata for the ReplicaSet list.
type ReplicaSetSummary struct {
	Name              string                    `json:"name"`
	Namespace         string                    `json:"namespace"`
	Status            string                    `json:"status"`
	Ready             string                    `json:"ready"`
	DesiredReplicas   int32                     `json:"desiredReplicas"`
	CurrentReplicas   int32                     `json:"currentReplicas"`
	ReadyReplicas     int32                     `json:"readyReplicas"`
	AvailableReplicas int32                     `json:"availableReplicas"`
	Age               string                    `json:"age"`
	CreationTimestamp string                    `json:"creationTimestamp"`
	Images            []string                  `json:"images"`
	Selector          map[string]string         `json:"selector,omitempty"`
	OwnerDeployment   string                    `json:"ownerDeployment,omitempty"`
	Revision          string                    `json:"revision,omitempty"`
	Conditions        []ReplicaSetConditionItem `json:"conditions,omitempty"`
	Labels            map[string]string         `json:"labels,omitempty"`
	Annotations       map[string]string         `json:"annotations,omitempty"`
}

// ListReplicaSetsParams scopes a ReplicaSet list to a context and namespace.
type ListReplicaSetsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListReplicaSetsResult is the JSON-RPC payload for replicasets.list.
type ListReplicaSetsResult struct {
	Items      []ReplicaSetSummary `json:"items"`
	TotalCount int                 `json:"totalCount"`
}

// ListReplicaSets queries ReplicaSets in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListReplicaSets(ctx context.Context, contextName, namespace string) (*ListReplicaSetsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	replicaSetList, err := client.AppsV1().ReplicaSets(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list replicasets: %w", err)
	}

	items := make([]ReplicaSetSummary, 0, len(replicaSetList.Items))
	for i := range replicaSetList.Items {
		items = append(items, convertReplicaSetToSummary(&replicaSetList.Items[i]))
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListReplicaSetsResult{
		Items:      items,
		TotalCount: len(items),
	}, nil
}

// convertReplicaSetToSummary transforms a client-go ReplicaSet into a UI-ready row.
func convertReplicaSetToSummary(rs *appsv1.ReplicaSet) ReplicaSetSummary {
	desired := int32(1)
	if rs.Spec.Replicas != nil {
		desired = *rs.Spec.Replicas
	}

	var images []string
	seenImages := make(map[string]struct{})
	for _, container := range rs.Spec.Template.Spec.Containers {
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
	if rs.Spec.Selector != nil {
		for key, value := range rs.Spec.Selector.MatchLabels {
			selector[key] = value
		}
	}

	conditions := make([]ReplicaSetConditionItem, 0, len(rs.Status.Conditions))
	for _, condition := range rs.Status.Conditions {
		lastTransition := ""
		if !condition.LastTransitionTime.IsZero() {
			lastTransition = condition.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditions = append(conditions, ReplicaSetConditionItem{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			Reason:             condition.Reason,
			Message:            condition.Message,
			LastTransitionTime: lastTransition,
		})
	}

	ownerDeployment := ""
	for _, owner := range rs.OwnerReferences {
		if owner.Kind == "Deployment" {
			ownerDeployment = owner.Name
			break
		}
	}

	revision := ""
	if rs.Annotations != nil {
		revision = rs.Annotations["deployment.kubernetes.io/revision"]
	}

	return ReplicaSetSummary{
		Name:              rs.Name,
		Namespace:         rs.Namespace,
		Status:            resolveReplicaSetStatus(rs, desired),
		Ready:             fmt.Sprintf("%d/%d", rs.Status.ReadyReplicas, desired),
		DesiredReplicas:   desired,
		CurrentReplicas:   rs.Status.Replicas,
		ReadyReplicas:     rs.Status.ReadyReplicas,
		AvailableReplicas: rs.Status.AvailableReplicas,
		Age:               formatAge(time.Since(rs.CreationTimestamp.Time)),
		CreationTimestamp: rs.CreationTimestamp.Time.Format(time.RFC3339),
		Images:            images,
		Selector:          selector,
		OwnerDeployment:   ownerDeployment,
		Revision:          revision,
		Conditions:        conditions,
		Labels:            rs.Labels,
		Annotations:       rs.Annotations,
	}
}

// resolveReplicaSetStatus derives a concise replica state for list filters.
func resolveReplicaSetStatus(rs *appsv1.ReplicaSet, desired int32) string {
	if desired == 0 {
		return "Scaled Down"
	}
	for _, condition := range rs.Status.Conditions {
		if condition.Type == appsv1.ReplicaSetReplicaFailure && condition.Status == corev1.ConditionTrue {
			return "Degraded"
		}
	}
	if rs.Status.ReadyReplicas >= desired {
		return "Healthy"
	}
	if rs.Status.ReadyReplicas == 0 {
		return "Degraded"
	}
	return "Progressing"
}

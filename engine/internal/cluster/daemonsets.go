package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// DaemonSetConditionItem represents a live DaemonSet condition.
type DaemonSetConditionItem struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

// DaemonSetSummary provides display-ready node coverage and rollout metadata.
type DaemonSetSummary struct {
	Name                   string                   `json:"name"`
	Namespace              string                   `json:"namespace"`
	Status                 string                   `json:"status"`
	Ready                  string                   `json:"ready"`
	DesiredNumberScheduled int32                    `json:"desiredNumberScheduled"`
	CurrentNumberScheduled int32                    `json:"currentNumberScheduled"`
	NumberReady            int32                    `json:"numberReady"`
	UpdatedNumberScheduled int32                    `json:"updatedNumberScheduled"`
	NumberAvailable        int32                    `json:"numberAvailable"`
	NumberUnavailable      int32                    `json:"numberUnavailable"`
	NumberMisscheduled     int32                    `json:"numberMisscheduled"`
	Age                    string                   `json:"age"`
	CreationTimestamp      string                   `json:"creationTimestamp"`
	Images                 []string                 `json:"images"`
	Selector               map[string]string        `json:"selector,omitempty"`
	NodeSelector           map[string]string        `json:"nodeSelector,omitempty"`
	UpdateStrategy         string                   `json:"updateStrategy"`
	MaxUnavailable         string                   `json:"maxUnavailable"`
	MaxSurge               string                   `json:"maxSurge"`
	MinReadySeconds        int32                    `json:"minReadySeconds"`
	RevisionHistoryLimit   int32                    `json:"revisionHistoryLimit"`
	CollisionCount         int32                    `json:"collisionCount"`
	Generation             int64                    `json:"generation"`
	ObservedGeneration     int64                    `json:"observedGeneration"`
	Conditions             []DaemonSetConditionItem `json:"conditions,omitempty"`
	Labels                 map[string]string        `json:"labels,omitempty"`
	Annotations            map[string]string        `json:"annotations,omitempty"`
}

type ListDaemonSetsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

type ListDaemonSetsResult struct {
	Items      []DaemonSetSummary `json:"items"`
	TotalCount int                `json:"totalCount"`
}

func (m *Manager) ListDaemonSets(ctx context.Context, contextName, namespace string) (*ListDaemonSetsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	list, err := client.AppsV1().DaemonSets(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list daemonsets: %w", err)
	}
	items := make([]DaemonSetSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertDaemonSetToSummary(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListDaemonSetsResult{Items: items, TotalCount: len(items)}, nil
}

func convertDaemonSetToSummary(ds *appsv1.DaemonSet) DaemonSetSummary {
	images := make([]string, 0)
	seenImages := make(map[string]struct{})
	for _, container := range ds.Spec.Template.Spec.Containers {
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
	if ds.Spec.Selector != nil {
		for key, value := range ds.Spec.Selector.MatchLabels {
			selector[key] = value
		}
	}

	nodeSelector := map[string]string{}
	for key, value := range ds.Spec.Template.Spec.NodeSelector {
		nodeSelector[key] = value
	}

	updateStrategy := string(ds.Spec.UpdateStrategy.Type)
	if updateStrategy == "" {
		updateStrategy = string(appsv1.RollingUpdateDaemonSetStrategyType)
	}
	maxUnavailable := "-"
	maxSurge := "-"
	if updateStrategy == string(appsv1.RollingUpdateDaemonSetStrategyType) {
		maxUnavailable = "1"
		maxSurge = "0"
		if rolling := ds.Spec.UpdateStrategy.RollingUpdate; rolling != nil {
			if rolling.MaxUnavailable != nil {
				maxUnavailable = rolling.MaxUnavailable.String()
			}
			if rolling.MaxSurge != nil {
				maxSurge = rolling.MaxSurge.String()
			}
		}
	}

	revisionHistoryLimit := int32(10)
	if ds.Spec.RevisionHistoryLimit != nil {
		revisionHistoryLimit = *ds.Spec.RevisionHistoryLimit
	}
	collisionCount := int32(0)
	if ds.Status.CollisionCount != nil {
		collisionCount = *ds.Status.CollisionCount
	}

	conditions := make([]DaemonSetConditionItem, 0, len(ds.Status.Conditions))
	for _, condition := range ds.Status.Conditions {
		lastTransition := ""
		if !condition.LastTransitionTime.IsZero() {
			lastTransition = condition.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditions = append(conditions, DaemonSetConditionItem{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			Reason:             condition.Reason,
			Message:            condition.Message,
			LastTransitionTime: lastTransition,
		})
	}

	return DaemonSetSummary{
		Name:                   ds.Name,
		Namespace:              ds.Namespace,
		Status:                 resolveDaemonSetStatus(ds),
		Ready:                  fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled),
		DesiredNumberScheduled: ds.Status.DesiredNumberScheduled,
		CurrentNumberScheduled: ds.Status.CurrentNumberScheduled,
		NumberReady:            ds.Status.NumberReady,
		UpdatedNumberScheduled: ds.Status.UpdatedNumberScheduled,
		NumberAvailable:        ds.Status.NumberAvailable,
		NumberUnavailable:      ds.Status.NumberUnavailable,
		NumberMisscheduled:     ds.Status.NumberMisscheduled,
		Age:                    formatAge(time.Since(ds.CreationTimestamp.Time)),
		CreationTimestamp:      ds.CreationTimestamp.Time.Format(time.RFC3339),
		Images:                 images,
		Selector:               selector,
		NodeSelector:           nodeSelector,
		UpdateStrategy:         updateStrategy,
		MaxUnavailable:         maxUnavailable,
		MaxSurge:               maxSurge,
		MinReadySeconds:        ds.Spec.MinReadySeconds,
		RevisionHistoryLimit:   revisionHistoryLimit,
		CollisionCount:         collisionCount,
		Generation:             ds.Generation,
		ObservedGeneration:     ds.Status.ObservedGeneration,
		Conditions:             conditions,
		Labels:                 ds.Labels,
		Annotations:            ds.Annotations,
	}
}

func resolveDaemonSetStatus(ds *appsv1.DaemonSet) string {
	if ds.Status.NumberMisscheduled > 0 {
		return "Degraded"
	}
	if ds.Status.DesiredNumberScheduled > 0 && ds.Status.NumberReady == 0 {
		return "Degraded"
	}
	if ds.Status.NumberReady < ds.Status.DesiredNumberScheduled ||
		ds.Status.UpdatedNumberScheduled < ds.Status.DesiredNumberScheduled ||
		ds.Status.NumberAvailable < ds.Status.DesiredNumberScheduled {
		return "Progressing"
	}
	return "Healthy"
}

func (m *Manager) GetDaemonSetYaml(ctx context.Context, contextName, namespace, daemonSetName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	daemonSet, err := client.AppsV1().DaemonSets(namespace).Get(ctx, daemonSetName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get daemonset %s: %w", daemonSetName, err)
	}
	daemonSet.TypeMeta = metav1.TypeMeta{APIVersion: "apps/v1", Kind: "DaemonSet"}
	daemonSet.ManagedFields = nil
	data, err := yaml.Marshal(daemonSet)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal daemonset to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

type DaemonSetActionParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
}

func (m *Manager) RestartDaemonSet(ctx context.Context, p DaemonSetActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	daemonSet, err := client.AppsV1().DaemonSets(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get daemonset %s: %w", p.Name, err)
	}
	if daemonSet.Spec.Template.Annotations == nil {
		daemonSet.Spec.Template.Annotations = map[string]string{}
	}
	daemonSet.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().UTC().Format(time.RFC3339)
	if _, err := client.AppsV1().DaemonSets(p.Namespace).Update(ctx, daemonSet, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to restart daemonset %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

func (m *Manager) DeleteDaemonSet(ctx context.Context, p DaemonSetActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	if err := client.AppsV1().DaemonSets(p.Namespace).Delete(ctx, p.Name, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to delete daemonset %s: %w", p.Name, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

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

// StatefulSetConditionItem represents a live StatefulSet condition.
type StatefulSetConditionItem struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

// StatefulSetSummary provides display-ready metadata for the StatefulSet browser.
type StatefulSetSummary struct {
	Name                    string                     `json:"name"`
	Namespace               string                     `json:"namespace"`
	Status                  string                     `json:"status"`
	Ready                   string                     `json:"ready"`
	DesiredReplicas         int32                      `json:"desiredReplicas"`
	CurrentReplicas         int32                      `json:"currentReplicas"`
	ReadyReplicas           int32                      `json:"readyReplicas"`
	UpdatedReplicas         int32                      `json:"updatedReplicas"`
	AvailableReplicas       int32                      `json:"availableReplicas"`
	Age                     string                     `json:"age"`
	CreationTimestamp       string                     `json:"creationTimestamp"`
	Images                  []string                   `json:"images"`
	Selector                map[string]string          `json:"selector,omitempty"`
	ServiceName             string                     `json:"serviceName,omitempty"`
	PodManagementPolicy     string                     `json:"podManagementPolicy"`
	UpdateStrategy          string                     `json:"updateStrategy"`
	Partition               int32                      `json:"partition"`
	MaxUnavailable          string                     `json:"maxUnavailable,omitempty"`
	CurrentRevision         string                     `json:"currentRevision,omitempty"`
	UpdateRevision          string                     `json:"updateRevision,omitempty"`
	RevisionHistoryLimit    int32                      `json:"revisionHistoryLimit"`
	MinReadySeconds         int32                      `json:"minReadySeconds"`
	VolumeClaimTemplates    []string                   `json:"volumeClaimTemplates"`
	PVCRetentionWhenDeleted string                     `json:"persistentVolumeClaimRetentionWhenDeleted"`
	PVCRetentionWhenScaled  string                     `json:"persistentVolumeClaimRetentionWhenScaled"`
	OrdinalsStart           int32                      `json:"ordinalsStart"`
	CollisionCount          int32                      `json:"collisionCount"`
	Generation              int64                      `json:"generation"`
	ObservedGeneration      int64                      `json:"observedGeneration"`
	Conditions              []StatefulSetConditionItem `json:"conditions,omitempty"`
	Labels                  map[string]string          `json:"labels,omitempty"`
	Annotations             map[string]string          `json:"annotations,omitempty"`
}

// ListStatefulSetsParams scopes a StatefulSet list to a context and namespace.
type ListStatefulSetsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListStatefulSetsResult is the JSON-RPC payload for statefulsets.list.
type ListStatefulSetsResult struct {
	Items      []StatefulSetSummary `json:"items"`
	TotalCount int                  `json:"totalCount"`
}

// ListStatefulSets queries StatefulSets in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListStatefulSets(ctx context.Context, contextName, namespace string) (*ListStatefulSetsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	statefulSetList, err := client.AppsV1().StatefulSets(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list statefulsets: %w", err)
	}

	items := make([]StatefulSetSummary, 0, len(statefulSetList.Items))
	for i := range statefulSetList.Items {
		items = append(items, convertStatefulSetToSummary(&statefulSetList.Items[i]))
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListStatefulSetsResult{
		Items:      items,
		TotalCount: len(items),
	}, nil
}

// convertStatefulSetToSummary transforms a client-go StatefulSet into a UI-ready row.
func convertStatefulSetToSummary(sts *appsv1.StatefulSet) StatefulSetSummary {
	desired := int32(1)
	if sts.Spec.Replicas != nil {
		desired = *sts.Spec.Replicas
	}

	images := make([]string, 0)
	seenImages := make(map[string]struct{})
	for _, container := range sts.Spec.Template.Spec.Containers {
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
	if sts.Spec.Selector != nil {
		for key, value := range sts.Spec.Selector.MatchLabels {
			selector[key] = value
		}
	}

	conditions := make([]StatefulSetConditionItem, 0, len(sts.Status.Conditions))
	for _, condition := range sts.Status.Conditions {
		lastTransition := ""
		if !condition.LastTransitionTime.IsZero() {
			lastTransition = condition.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditions = append(conditions, StatefulSetConditionItem{
			Type:               string(condition.Type),
			Status:             string(condition.Status),
			Reason:             condition.Reason,
			Message:            condition.Message,
			LastTransitionTime: lastTransition,
		})
	}

	podManagementPolicy := string(sts.Spec.PodManagementPolicy)
	if podManagementPolicy == "" {
		podManagementPolicy = string(appsv1.OrderedReadyPodManagement)
	}

	updateStrategy := string(sts.Spec.UpdateStrategy.Type)
	if updateStrategy == "" {
		updateStrategy = string(appsv1.RollingUpdateStatefulSetStrategyType)
	}

	partition := int32(0)
	maxUnavailable := ""
	if rolling := sts.Spec.UpdateStrategy.RollingUpdate; rolling != nil {
		if rolling.Partition != nil {
			partition = *rolling.Partition
		}
		if rolling.MaxUnavailable != nil {
			maxUnavailable = rolling.MaxUnavailable.String()
		}
	}

	revisionHistoryLimit := int32(10)
	if sts.Spec.RevisionHistoryLimit != nil {
		revisionHistoryLimit = *sts.Spec.RevisionHistoryLimit
	}

	volumeClaimTemplates := make([]string, 0, len(sts.Spec.VolumeClaimTemplates))
	for _, claim := range sts.Spec.VolumeClaimTemplates {
		if claim.Name != "" {
			volumeClaimTemplates = append(volumeClaimTemplates, claim.Name)
		}
	}

	whenDeleted := string(appsv1.RetainPersistentVolumeClaimRetentionPolicyType)
	whenScaled := string(appsv1.RetainPersistentVolumeClaimRetentionPolicyType)
	if policy := sts.Spec.PersistentVolumeClaimRetentionPolicy; policy != nil {
		if policy.WhenDeleted != "" {
			whenDeleted = string(policy.WhenDeleted)
		}
		if policy.WhenScaled != "" {
			whenScaled = string(policy.WhenScaled)
		}
	}

	ordinalsStart := int32(0)
	if sts.Spec.Ordinals != nil {
		ordinalsStart = sts.Spec.Ordinals.Start
	}

	collisionCount := int32(0)
	if sts.Status.CollisionCount != nil {
		collisionCount = *sts.Status.CollisionCount
	}

	return StatefulSetSummary{
		Name:                    sts.Name,
		Namespace:               sts.Namespace,
		Status:                  resolveStatefulSetStatus(sts, desired),
		Ready:                   fmt.Sprintf("%d/%d", sts.Status.ReadyReplicas, desired),
		DesiredReplicas:         desired,
		CurrentReplicas:         sts.Status.CurrentReplicas,
		ReadyReplicas:           sts.Status.ReadyReplicas,
		UpdatedReplicas:         sts.Status.UpdatedReplicas,
		AvailableReplicas:       sts.Status.AvailableReplicas,
		Age:                     formatAge(time.Since(sts.CreationTimestamp.Time)),
		CreationTimestamp:       sts.CreationTimestamp.Time.Format(time.RFC3339),
		Images:                  images,
		Selector:                selector,
		ServiceName:             sts.Spec.ServiceName,
		PodManagementPolicy:     podManagementPolicy,
		UpdateStrategy:          updateStrategy,
		Partition:               partition,
		MaxUnavailable:          maxUnavailable,
		CurrentRevision:         sts.Status.CurrentRevision,
		UpdateRevision:          sts.Status.UpdateRevision,
		RevisionHistoryLimit:    revisionHistoryLimit,
		MinReadySeconds:         sts.Spec.MinReadySeconds,
		VolumeClaimTemplates:    volumeClaimTemplates,
		PVCRetentionWhenDeleted: whenDeleted,
		PVCRetentionWhenScaled:  whenScaled,
		OrdinalsStart:           ordinalsStart,
		CollisionCount:          collisionCount,
		Generation:              sts.Generation,
		ObservedGeneration:      sts.Status.ObservedGeneration,
		Conditions:              conditions,
		Labels:                  sts.Labels,
		Annotations:             sts.Annotations,
	}
}

// resolveStatefulSetStatus derives a concise rollout state for list filters.
func resolveStatefulSetStatus(sts *appsv1.StatefulSet, desired int32) string {
	if desired == 0 {
		return "Scaled Down"
	}
	if sts.Status.ReadyReplicas == 0 {
		return "Degraded"
	}
	if sts.Status.ReadyReplicas < desired {
		return "Progressing"
	}
	if sts.Status.UpdatedReplicas < desired {
		return "Progressing"
	}
	if sts.Status.CurrentRevision != "" && sts.Status.UpdateRevision != "" && sts.Status.CurrentRevision != sts.Status.UpdateRevision {
		return "Progressing"
	}
	return "Healthy"
}

// GetStatefulSetYaml exports the live StatefulSet manifest as YAML.
func (m *Manager) GetStatefulSetYaml(ctx context.Context, contextName, namespace, statefulSetName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	statefulSet, err := client.AppsV1().StatefulSets(namespace).Get(ctx, statefulSetName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get statefulset %s: %w", statefulSetName, err)
	}

	statefulSet.TypeMeta = metav1.TypeMeta{APIVersion: "apps/v1", Kind: "StatefulSet"}
	statefulSet.ManagedFields = nil

	data, err := yaml.Marshal(statefulSet)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal statefulset to YAML: %w", err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

// StatefulSetActionParams identifies a StatefulSet for an operational action.
type StatefulSetActionParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
	Replicas    *int32 `json:"replicas,omitempty"`
}

// RestartStatefulSet triggers a rollout by updating the pod template annotation.
func (m *Manager) RestartStatefulSet(ctx context.Context, p StatefulSetActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	statefulSet, err := client.AppsV1().StatefulSets(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get statefulset %s: %w", p.Name, err)
	}

	if statefulSet.Spec.Template.Annotations == nil {
		statefulSet.Spec.Template.Annotations = map[string]string{}
	}
	statefulSet.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().UTC().Format(time.RFC3339)

	if _, err := client.AppsV1().StatefulSets(p.Namespace).Update(ctx, statefulSet, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to restart statefulset %s: %w", p.Name, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// ScaleStatefulSet updates the desired replica count for a StatefulSet.
func (m *Manager) ScaleStatefulSet(ctx context.Context, p StatefulSetActionParams) error {
	if p.Replicas == nil {
		return fmt.Errorf("replicas is required")
	}
	if *p.Replicas < 0 {
		return fmt.Errorf("replicas must be zero or greater")
	}

	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	statefulSet, err := client.AppsV1().StatefulSets(p.Namespace).Get(ctx, p.Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get statefulset %s: %w", p.Name, err)
	}

	statefulSet.Spec.Replicas = p.Replicas
	if _, err := client.AppsV1().StatefulSets(p.Namespace).Update(ctx, statefulSet, metav1.UpdateOptions{}); err != nil {
		return fmt.Errorf("failed to scale statefulset %s: %w", p.Name, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// DeleteStatefulSet removes a StatefulSet and its pods.
func (m *Manager) DeleteStatefulSet(ctx context.Context, p StatefulSetActionParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	if err := client.AppsV1().StatefulSets(p.Namespace).Delete(ctx, p.Name, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to delete statefulset %s: %w", p.Name, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

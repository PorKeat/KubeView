package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

const verticalPodAutoscalerGroup = "autoscaling.k8s.io"

// verticalPodAutoscalerVersions is ordered newest first. VPA is an addon CRD,
// so the served version depends on which release the cluster installed.
var verticalPodAutoscalerVersions = []string{"v1", "v1beta2", "v1beta1"}

func resolveVerticalPodAutoscalerGVR(client kubernetes.Interface) (schema.GroupVersionResource, bool) {
	for _, version := range verticalPodAutoscalerVersions {
		apiResource := discoverAPIResource(
			client,
			verticalPodAutoscalerGroup+"/"+version,
			"VerticalPodAutoscaler",
			"verticalpodautoscalers",
		)
		if apiResource == nil {
			continue
		}
		return schema.GroupVersionResource{
			Group:    verticalPodAutoscalerGroup,
			Version:  version,
			Resource: apiResource.Name,
		}, true
	}
	return schema.GroupVersionResource{}, false
}

// verticalPodAutoscalerRecommendation summarizes the recommender's target for
// each container. The VPA API stores quantities as strings, so this works the
// same for v1 and the older beta versions.
func verticalPodAutoscalerRecommendation(object map[string]interface{}) (string, int) {
	recommendations, _, _ := unstructured.NestedSlice(
		object, "status", "recommendation", "containerRecommendations",
	)
	parts := make([]string, 0, len(recommendations))
	for _, raw := range recommendations {
		recommendation, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		containerName, _, _ := unstructured.NestedString(recommendation, "containerName")
		if containerName == "" {
			containerName = "container"
		}
		target, _, _ := unstructured.NestedStringMap(recommendation, "target")
		if len(target) == 0 {
			parts = append(parts, containerName)
			continue
		}
		resources := make([]string, 0, len(target))
		for resource := range target {
			resources = append(resources, resource)
		}
		sort.Strings(resources)
		values := make([]string, 0, len(resources))
		for _, resource := range resources {
			values = append(values, fmt.Sprintf("%s %s", resource, target[resource]))
		}
		parts = append(parts, fmt.Sprintf("%s: %s", containerName, strings.Join(values, ", ")))
	}
	if len(parts) == 0 {
		return "—", 0
	}
	return strings.Join(parts, "; "), len(recommendations)
}

func verticalPodAutoscalerStatus(object map[string]interface{}, updateMode string, recommendationCount int) (string, string) {
	if recommendationCount > 0 {
		if updateMode == "Off" {
			return "Recommendation only", "muted"
		}
		return "Recommended", "healthy"
	}
	if updateMode == "Off" {
		return "Off", "muted"
	}
	conditions, _, _ := unstructured.NestedSlice(object, "status", "conditions")
	for _, raw := range conditions {
		condition, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		conditionType, _, _ := unstructured.NestedString(condition, "type")
		conditionStatus, _, _ := unstructured.NestedString(condition, "status")
		reason, _, _ := unstructured.NestedString(condition, "reason")
		if conditionType == "RecommendationProvided" &&
			conditionStatus == "False" &&
			reason == "NoPodsMatched" {
			return "No pods matched", "warning"
		}
	}
	return "Awaiting recommendation", "warning"
}

func verticalPodAutoscalerResultItem(vpa *unstructured.Unstructured) SimpleResourceItem {
	object := vpa.Object
	targetKind, _, _ := unstructured.NestedString(object, "spec", "targetRef", "kind")
	targetName, _, _ := unstructured.NestedString(object, "spec", "targetRef", "name")
	target := "—"
	if targetKind != "" || targetName != "" {
		target = fmt.Sprintf("%s/%s", targetKind, targetName)
	}

	updateMode, _, _ := unstructured.NestedString(object, "spec", "updatePolicy", "updateMode")
	if updateMode == "" {
		updateMode = "Auto"
	}

	recommendation, recommendationCount := verticalPodAutoscalerRecommendation(object)
	status, tone := verticalPodAutoscalerStatus(object, updateMode, recommendationCount)
	containerPolicies, _, _ := unstructured.NestedSlice(object, "spec", "resourcePolicy", "containerPolicies")

	return simpleItemFromObject(
		vpa.GetName(), vpa.GetNamespace(), status, tone,
		vpa.GetCreationTimestamp().Time,
		map[string]string{
			"apiVersion":            vpa.GetAPIVersion(),
			"target":                target,
			"updateMode":            updateMode,
			"recommendation":        recommendation,
			"recommendedContainers": fmt.Sprintf("%d", recommendationCount),
			"containerPolicies":     fmt.Sprintf("%d", len(containerPolicies)),
		},
		vpa.GetLabels(), vpa.GetAnnotations(),
	)
}

func (m *Manager) listSimpleVerticalPodAutoscalers(
	ctx context.Context,
	contextName, namespace string,
) (*SimpleResourceListResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	gvr, available := resolveVerticalPodAutoscalerGVR(client)
	if !available {
		unavailable := false
		return &SimpleResourceListResult{
			Kind:      "verticalpodautoscalers",
			Items:     []SimpleResourceItem{},
			Available: &unavailable,
		}, nil
	}

	dynamicClient, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}

	var list *unstructured.UnstructuredList
	if namespace == "" {
		list, err = dynamicClient.Resource(gvr).List(ctx, metav1.ListOptions{})
	} else {
		list, err = dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("failed to list vertical pod autoscalers: %w", err)
	}

	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, verticalPodAutoscalerResultItem(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })

	isAvailable := true
	return &SimpleResourceListResult{
		Kind:       "verticalpodautoscalers",
		Items:      items,
		TotalCount: len(items),
		Available:  &isAvailable,
		APIVersion: gvr.Group + "/" + gvr.Version,
	}, nil
}

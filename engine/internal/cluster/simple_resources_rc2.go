package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

func resourceListSummary(list corev1.ResourceList) string {
	if len(list) == 0 {
		return "—"
	}
	keys := make([]string, 0, len(list))
	for key := range list {
		keys = append(keys, string(key))
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		quantity := list[corev1.ResourceName(key)]
		parts = append(parts, fmt.Sprintf("%s=%s", key, quantity.String()))
	}
	return strings.Join(parts, ", ")
}

func hpaTone(hpa *autoscalingv2.HorizontalPodAutoscaler) string {
	for _, condition := range hpa.Status.Conditions {
		if condition.Type == "AbleToScale" && condition.Status == corev1.ConditionFalse {
			return "warning"
		}
	}
	if hpa.Status.DesiredReplicas > 0 && hpa.Status.CurrentReplicas < hpa.Status.DesiredReplicas {
		return "warning"
	}
	return "healthy"
}

func listSimpleHorizontalPodAutoscalers(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.AutoscalingV2().HorizontalPodAutoscalers(namespace).List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list horizontal pod autoscalers: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		hpa := &list.Items[i]
		minReplicas := int32(1)
		if hpa.Spec.MinReplicas != nil {
			minReplicas = *hpa.Spec.MinReplicas
		}
		target := fmt.Sprintf("%s/%s", hpa.Spec.ScaleTargetRef.Kind, hpa.Spec.ScaleTargetRef.Name)
		items = append(items, simpleItemFromObject(
			hpa.Name, hpa.Namespace,
			fmt.Sprintf("%d/%d replicas", hpa.Status.CurrentReplicas, hpa.Status.DesiredReplicas),
			hpaTone(hpa), hpa.CreationTimestamp.Time,
			map[string]string{
				"target":  target,
				"min":     fmt.Sprintf("%d", minReplicas),
				"max":     fmt.Sprintf("%d", hpa.Spec.MaxReplicas),
				"current": fmt.Sprintf("%d", hpa.Status.CurrentReplicas),
				"desired": fmt.Sprintf("%d", hpa.Status.DesiredReplicas),
				"metrics": fmt.Sprintf("%d", len(hpa.Spec.Metrics)),
			},
			hpa.Labels, hpa.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "horizontalpodautoscalers", Items: items, TotalCount: len(items)}, nil
}

func listSimplePodDisruptionBudgets(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.PolicyV1().PodDisruptionBudgets(namespace).List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list pod disruption budgets: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		pdb := &list.Items[i]
		minAvailable := "—"
		if pdb.Spec.MinAvailable != nil {
			minAvailable = pdb.Spec.MinAvailable.String()
		}
		maxUnavailable := "—"
		if pdb.Spec.MaxUnavailable != nil {
			maxUnavailable = pdb.Spec.MaxUnavailable.String()
		}
		tone := "healthy"
		if pdb.Status.DisruptionsAllowed == 0 && pdb.Status.ExpectedPods > 0 {
			tone = "warning"
		}
		items = append(items, simpleItemFromObject(
			pdb.Name, pdb.Namespace,
			fmt.Sprintf("%d/%d healthy", pdb.Status.CurrentHealthy, pdb.Status.DesiredHealthy),
			tone, pdb.CreationTimestamp.Time,
			map[string]string{
				"minAvailable":       minAvailable,
				"maxUnavailable":     maxUnavailable,
				"allowedDisruptions": fmt.Sprintf("%d", pdb.Status.DisruptionsAllowed),
				"expectedPods":       fmt.Sprintf("%d", pdb.Status.ExpectedPods),
				"currentHealthy":     fmt.Sprintf("%d", pdb.Status.CurrentHealthy),
				"desiredHealthy":     fmt.Sprintf("%d", pdb.Status.DesiredHealthy),
			},
			pdb.Labels, pdb.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "poddisruptionbudgets", Items: items, TotalCount: len(items)}, nil
}

func listSimpleResourceQuotas(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.CoreV1().ResourceQuotas(namespace).List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list resource quotas: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		quota := &list.Items[i]
		tone := "healthy"
		for key, hard := range quota.Status.Hard {
			if used, ok := quota.Status.Used[key]; ok && used.Cmp(hard) > 0 {
				tone = "warning"
				break
			}
		}
		items = append(items, simpleItemFromObject(
			quota.Name, quota.Namespace,
			fmt.Sprintf("%d constraints", len(quota.Status.Hard)),
			tone, quota.CreationTimestamp.Time,
			map[string]string{
				"constraints": fmt.Sprintf("%d", len(quota.Status.Hard)),
				"usedCount":   fmt.Sprintf("%d", len(quota.Status.Used)),
				"hard":        resourceListSummary(quota.Status.Hard),
				"used":        resourceListSummary(quota.Status.Used),
			},
			quota.Labels, quota.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "resourcequotas", Items: items, TotalCount: len(items)}, nil
}

func listSimpleLimitRanges(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.CoreV1().LimitRanges(namespace).List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list limit ranges: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		limitRange := &list.Items[i]
		types := make([]string, 0, len(limitRange.Spec.Limits))
		for _, limit := range limitRange.Spec.Limits {
			types = append(types, string(limit.Type))
		}
		items = append(items, simpleItemFromObject(
			limitRange.Name, limitRange.Namespace,
			fmt.Sprintf("%d limits", len(limitRange.Spec.Limits)),
			"muted", limitRange.CreationTimestamp.Time,
			map[string]string{
				"limits": fmt.Sprintf("%d", len(limitRange.Spec.Limits)),
				"types":  strings.Join(types, ", "),
			},
			limitRange.Labels, limitRange.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "limitranges", Items: items, TotalCount: len(items)}, nil
}

func listSimplePriorityClasses(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.SchedulingV1().PriorityClasses().List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list priority classes: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		priority := &list.Items[i]
		status := "Configured"
		tone := "muted"
		if priority.GlobalDefault {
			status = "Default"
			tone = "healthy"
		}
		preemption := "—"
		if priority.PreemptionPolicy != nil {
			preemption = string(*priority.PreemptionPolicy)
		}
		items = append(items, simpleItemFromObject(
			priority.Name, "", status, tone, priority.CreationTimestamp.Time,
			map[string]string{
				"value":            fmt.Sprintf("%d", priority.Value),
				"globalDefault":    fmt.Sprintf("%t", priority.GlobalDefault),
				"preemptionPolicy": preemption,
				"description":      priority.Description,
			},
			priority.Labels, priority.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "priorityclasses", Items: items, TotalCount: len(items)}, nil
}

func listSimpleRuntimeClasses(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.NodeV1().RuntimeClasses().List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list runtime classes: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		runtimeClass := &list.Items[i]
		overhead := "—"
		if runtimeClass.Overhead != nil {
			overhead = resourceListSummary(runtimeClass.Overhead.PodFixed)
		}
		items = append(items, simpleItemFromObject(
			runtimeClass.Name, "", "Configured", "muted", runtimeClass.CreationTimestamp.Time,
			map[string]string{
				"handler":  runtimeClass.Handler,
				"overhead": overhead,
			},
			runtimeClass.Labels, runtimeClass.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "runtimeclasses", Items: items, TotalCount: len(items)}, nil
}

func listSimpleLeases(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
) (*SimpleResourceListResult, error) {
	list, listErr := client.CoordinationV1().Leases(namespace).List(ctx, metav1.ListOptions{})
	if listErr != nil {
		return nil, fmt.Errorf("failed to list leases: %w", listErr)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	now := time.Now()
	for i := range list.Items {
		lease := &list.Items[i]
		holder := "—"
		tone := "muted"
		status := "Vacant"
		renewTime := "—"
		acquireTime := "—"
		duration := int32(0)
		if lease.Spec.LeaseDurationSeconds != nil {
			duration = *lease.Spec.LeaseDurationSeconds
		}
		if lease.Spec.HolderIdentity != nil && *lease.Spec.HolderIdentity != "" {
			holder = *lease.Spec.HolderIdentity
			status = "Held"
			tone = "healthy"
		}
		if lease.Spec.RenewTime != nil {
			renewTime = lease.Spec.RenewTime.Time.UTC().Format(time.RFC3339)
			if duration > 0 && lease.Spec.RenewTime.Time.Add(time.Duration(duration)*time.Second).Before(now) {
				status = "Expired"
				tone = "warning"
			}
		}
		if lease.Spec.AcquireTime != nil {
			acquireTime = lease.Spec.AcquireTime.Time.UTC().Format(time.RFC3339)
		}
		items = append(items, simpleItemFromObject(
			lease.Name, lease.Namespace, status, tone, lease.CreationTimestamp.Time,
			map[string]string{
				"holder":      holder,
				"duration":    fmt.Sprintf("%ds", duration),
				"renewTime":   renewTime,
				"acquireTime": acquireTime,
			},
			lease.Labels, lease.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: "leases", Items: items, TotalCount: len(items)}, nil
}

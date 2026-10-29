package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SimpleResourceItem is the shared row shape for the simple-resource pages.
// Kind-specific fields live in Details so the desktop can use one table shell.
type SimpleResourceItem struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Status      string            `json:"status"`
	StatusTone  string            `json:"statusTone"`
	Age         string            `json:"age"`
	CreatedAt   string            `json:"createdAt"`
	Details     map[string]string `json:"details"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

type SimpleResourceListResult struct {
	Kind       string               `json:"kind"`
	Items      []SimpleResourceItem `json:"items"`
	TotalCount int                  `json:"totalCount"`
	Truncated  bool                 `json:"truncated,omitempty"`
}

func normalizeResourceNamespace(namespace string) string {
	trimmed := strings.TrimSpace(namespace)
	if trimmed == "all" {
		return ""
	}
	return trimmed
}

func eventTimestamp(event *corev1.Event) time.Time {
	switch {
	case !event.LastTimestamp.IsZero():
		return event.LastTimestamp.Time
	case !event.EventTime.IsZero():
		return event.EventTime.Time
	case !event.FirstTimestamp.IsZero():
		return event.FirstTimestamp.Time
	default:
		return event.CreationTimestamp.Time
	}
}

func selectorString(selector map[string]string) string {
	if len(selector) == 0 {
		return "—"
	}
	keys := make([]string, 0, len(selector))
	for key := range selector {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", key, selector[key]))
	}
	return strings.Join(parts, ",")
}

func simpleItemFromObject(
	name, namespace, status, tone string,
	created time.Time,
	details map[string]string,
	labels, annotations map[string]string,
) SimpleResourceItem {
	return SimpleResourceItem{
		Name:        name,
		Namespace:   namespace,
		Status:      status,
		StatusTone:  tone,
		Age:         formatAge(time.Since(created)),
		CreatedAt:   created.UTC().Format(time.RFC3339),
		Details:     details,
		Labels:      labels,
		Annotations: annotations,
	}
}

// ListSimpleResources returns normalized rows for the RC1 resource kinds.
// The shared result shape keeps the desktop table and RPC surface small while
// each kind still maps its real Kubernetes fields explicitly.
func (m *Manager) ListSimpleResources(
	ctx context.Context,
	contextName, kind, namespace string,
) (*SimpleResourceListResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	namespace = normalizeResourceNamespace(namespace)

	switch kind {
	case "namespaces":
		list, listErr := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list namespaces: %w", listErr)
		}
		items := make([]SimpleResourceItem, 0, len(list.Items))
		for i := range list.Items {
			ns := &list.Items[i]
			phase := string(ns.Status.Phase)
			if phase == "" {
				phase = "Unknown"
			}
			tone := "healthy"
			if phase == "Terminating" {
				tone = "warning"
			}
			items = append(items, simpleItemFromObject(
				ns.Name, "", phase, tone, ns.CreationTimestamp.Time,
				map[string]string{
					"phase": phase,
				},
				ns.Labels, ns.Annotations,
			))
		}
		sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
		return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil

	case "events":
		list, listErr := client.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{Limit: 1000})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list events: %w", listErr)
		}
		items := make([]SimpleResourceItem, 0, len(list.Items))
		for i := range list.Items {
			event := &list.Items[i]
			eventTime := eventTimestamp(event)
			typeName := event.Type
			if typeName == "" {
				typeName = "Normal"
			}
			tone := "healthy"
			if typeName == "Warning" {
				tone = "critical"
			}
			objectKind := event.InvolvedObject.Kind
			objectName := event.InvolvedObject.Name
			object := strings.Trim(strings.Join([]string{objectKind, objectName}, "/"), "/")
			if object == "" {
				object = "—"
			}
			items = append(items, simpleItemFromObject(
				event.Name, event.Namespace, typeName, tone, eventTime,
				map[string]string{
					"reason":  event.Reason,
					"message": event.Message,
					"type":    typeName,
					"object":  object,
					"count":   fmt.Sprintf("%d", event.Count),
				},
				event.Labels, event.Annotations,
			))
			// Keep age relative to the last occurrence, not creation.
			items[len(items)-1].Age = formatAge(time.Since(eventTime))
		}
		sort.Slice(items, func(i, j int) bool {
			return items[i].CreatedAt > items[j].CreatedAt
		})
		truncated := len(items) >= 1000
		if len(items) > 500 {
			items = items[:500]
			truncated = true
		}
		return &SimpleResourceListResult{
			Kind: kind, Items: items, TotalCount: len(items), Truncated: truncated,
		}, nil

	case "replicationcontrollers":
		list, listErr := client.CoreV1().ReplicationControllers(namespace).List(ctx, metav1.ListOptions{})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list replication controllers: %w", listErr)
		}
		items := make([]SimpleResourceItem, 0, len(list.Items))
		for i := range list.Items {
			rc := &list.Items[i]
			desired := 1
			if rc.Spec.Replicas != nil {
				desired = int(*rc.Spec.Replicas)
			}
			ready := int(rc.Status.ReadyReplicas)
			status := fmt.Sprintf("%d/%d ready", ready, desired)
			tone := "healthy"
			if ready < desired {
				tone = "warning"
			}
			items = append(items, simpleItemFromObject(
				rc.Name, rc.Namespace, status, tone, rc.CreationTimestamp.Time,
				map[string]string{
					"desired":   fmt.Sprintf("%d", desired),
					"ready":     fmt.Sprintf("%d", ready),
					"available": fmt.Sprintf("%d", rc.Status.AvailableReplicas),
					"selector":  selectorString(rc.Spec.Selector),
				},
				rc.Labels, rc.Annotations,
			))
		}
		sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
		return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil

	case "endpointslices":
		list, listErr := client.DiscoveryV1().EndpointSlices(namespace).List(ctx, metav1.ListOptions{})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list endpoint slices: %w", listErr)
		}
		items := make([]SimpleResourceItem, 0, len(list.Items))
		for i := range list.Items {
			slice := &list.Items[i]
			serviceName := slice.Labels["kubernetes.io/service-name"]
			ports := make([]string, 0, len(slice.Ports))
			for _, port := range slice.Ports {
				protocol := "TCP"
				if port.Protocol != nil {
					protocol = string(*port.Protocol)
				}
				if port.Port != nil {
					ports = append(ports, fmt.Sprintf("%d/%s", *port.Port, protocol))
				}
			}
			portText := strings.Join(ports, ", ")
			if portText == "" {
				portText = "—"
			}
			endpointCount := len(slice.Endpoints)
			status := fmt.Sprintf("%d endpoints", endpointCount)
			tone := "healthy"
			if endpointCount == 0 {
				tone = "warning"
			}
			items = append(items, simpleItemFromObject(
				slice.Name, slice.Namespace, status, tone, slice.CreationTimestamp.Time,
				map[string]string{
					"service":     serviceName,
					"addressType": string(slice.AddressType),
					"endpoints":   fmt.Sprintf("%d", endpointCount),
					"ports":       portText,
				},
				slice.Labels, slice.Annotations,
			))
		}
		sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
		return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil

	case "ingressclasses":
		list, listErr := client.NetworkingV1().IngressClasses().List(ctx, metav1.ListOptions{})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list ingress classes: %w", listErr)
		}
		items := make([]SimpleResourceItem, 0, len(list.Items))
		for i := range list.Items {
			class := &list.Items[i]
			isDefault := class.Annotations["ingressclass.kubernetes.io/is-default-class"] == "true"
			status := "Configured"
			tone := "muted"
			if isDefault {
				status = "Default"
				tone = "healthy"
			}
			items = append(items, simpleItemFromObject(
				class.Name, "", status, tone, class.CreationTimestamp.Time,
				map[string]string{
					"controller": class.Spec.Controller,
					"default":    fmt.Sprintf("%t", isDefault),
				},
				class.Labels, class.Annotations,
			))
		}
		sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
		return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil

	case "horizontalpodautoscalers":
		return listSimpleHorizontalPodAutoscalers(ctx, client, namespace)
	case "poddisruptionbudgets":
		return listSimplePodDisruptionBudgets(ctx, client, namespace)
	case "resourcequotas":
		return listSimpleResourceQuotas(ctx, client, namespace)
	case "limitranges":
		return listSimpleLimitRanges(ctx, client, namespace)
	case "priorityclasses":
		return listSimplePriorityClasses(ctx, client, namespace)
	case "runtimeclasses":
		return listSimpleRuntimeClasses(ctx, client, namespace)
	case "leases":
		return listSimpleLeases(ctx, client, namespace)
	case "mutatingwebhookconfigurations":
		return listSimpleMutatingWebhookConfigurations(ctx, client)
	case "validatingwebhookconfigurations":
		return listSimpleValidatingWebhookConfigurations(ctx, client)
	case "validatingadmissionpolicies":
		return listSimpleValidatingAdmissionPolicies(ctx, client)
	case "validatingadmissionpolicybindings":
		return listSimpleValidatingAdmissionPolicyBindings(ctx, client)
	case "persistentvolumeclaims":
		list, listErr := client.CoreV1().PersistentVolumeClaims(namespace).List(ctx, metav1.ListOptions{})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list persistent volume claims: %w", listErr)
		}
		items := make([]SimpleResourceItem, 0, len(list.Items))
		for i := range list.Items {
			claim := &list.Items[i]
			phase := string(claim.Status.Phase)
			if phase == "" {
				phase = "Unknown"
			}
			tone := "healthy"
			switch phase {
			case "Pending":
				tone = "warning"
			case "Lost":
				tone = "critical"
			}
			accessModes := make([]string, 0, len(claim.Spec.AccessModes))
			for _, mode := range claim.Spec.AccessModes {
				accessModes = append(accessModes, string(mode))
			}
			capacity := claim.Status.Capacity[corev1.ResourceStorage]
			requested := claim.Spec.Resources.Requests[corev1.ResourceStorage]
			storageClass := "—"
			if claim.Spec.StorageClassName != nil {
				storageClass = *claim.Spec.StorageClassName
			}
			volumeMode := "Filesystem"
			if claim.Spec.VolumeMode != nil {
				volumeMode = string(*claim.Spec.VolumeMode)
			}
			items = append(items, simpleItemFromObject(
				claim.Name, claim.Namespace, phase, tone, claim.CreationTimestamp.Time,
				map[string]string{
					"capacity":     capacity.String(),
					"requested":    requested.String(),
					"accessModes":  strings.Join(accessModes, ", "),
					"storageClass": storageClass,
					"volume":       claim.Spec.VolumeName,
					"volumeMode":   volumeMode,
				},
				claim.Labels, claim.Annotations,
			))
		}
		sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
		return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil
	}

	return nil, fmt.Errorf("unsupported simple resource kind %q", kind)
}

// SimpleResourceCountsResult is used for the sidebar badges.
type SimpleResourceCountsResult struct {
	Namespaces                        int `json:"namespaces"`
	Events                            int `json:"events"`
	ReplicationControllers            int `json:"replicationControllers"`
	EndpointSlices                    int `json:"endpointSlices"`
	IngressClasses                    int `json:"ingressClasses"`
	PersistentVolumeClaims            int `json:"persistentVolumeClaims"`
	HorizontalPodAutoscalers          int `json:"horizontalPodAutoscalers"`
	PodDisruptionBudgets              int `json:"podDisruptionBudgets"`
	ResourceQuotas                    int `json:"resourceQuotas"`
	LimitRanges                       int `json:"limitRanges"`
	PriorityClasses                   int `json:"priorityClasses"`
	RuntimeClasses                    int `json:"runtimeClasses"`
	Leases                            int `json:"leases"`
	MutatingWebhookConfigurations     int `json:"mutatingWebhookConfigurations"`
	ValidatingWebhookConfigurations   int `json:"validatingWebhookConfigurations"`
	ValidatingAdmissionPolicies       int `json:"validatingAdmissionPolicies"`
	ValidatingAdmissionPolicyBindings int `json:"validatingAdmissionPolicyBindings"`
}

// CountSimpleResources returns best-effort counts for the simple-resource
// navigation badges. A forbidden or unavailable kind contributes zero instead
// of failing the whole sidebar.
func (m *Manager) CountSimpleResources(ctx context.Context, contextName string) *SimpleResourceCountsResult {
	result := &SimpleResourceCountsResult{}
	count := func(kind string) int {
		res, err := m.ListSimpleResources(ctx, contextName, kind, "all")
		if err != nil {
			return 0
		}
		return res.TotalCount
	}
	result.Namespaces = count("namespaces")
	result.Events = count("events")
	result.ReplicationControllers = count("replicationcontrollers")
	result.EndpointSlices = count("endpointslices")
	result.IngressClasses = count("ingressclasses")
	result.PersistentVolumeClaims = count("persistentvolumeclaims")
	result.HorizontalPodAutoscalers = count("horizontalpodautoscalers")
	result.PodDisruptionBudgets = count("poddisruptionbudgets")
	result.ResourceQuotas = count("resourcequotas")
	result.LimitRanges = count("limitranges")
	result.PriorityClasses = count("priorityclasses")
	result.RuntimeClasses = count("runtimeclasses")
	result.Leases = count("leases")
	result.MutatingWebhookConfigurations = count("mutatingwebhookconfigurations")
	result.ValidatingWebhookConfigurations = count("validatingwebhookconfigurations")
	result.ValidatingAdmissionPolicies = count("validatingadmissionpolicies")
	result.ValidatingAdmissionPolicyBindings = count("validatingadmissionpolicybindings")
	return result
}

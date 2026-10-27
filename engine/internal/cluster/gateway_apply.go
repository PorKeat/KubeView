package cluster

import (
	"context"
	"fmt"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"sigs.k8s.io/yaml"
)

// ApplyGatewayResourceYaml creates or updates a Gateway API resource from YAML.
func (m *Manager) ApplyGatewayResourceYaml(ctx context.Context, contextName, namespace, yamlText string) (*GatewayResourceSummary, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}

	resource := &unstructured.Unstructured{Object: map[string]interface{}{}}
	if err := yaml.Unmarshal([]byte(yamlText), &resource.Object); err != nil {
		return nil, fmt.Errorf("invalid YAML: %w", err)
	}

	kind := resource.GetKind()
	kindInfo := gatewayAPIKindByName(kind)
	if kindInfo == nil {
		return nil, fmt.Errorf("unsupported Gateway API kind %q", kind)
	}
	if resource.GetName() == "" {
		return nil, fmt.Errorf("metadata.name is required")
	}
	if resource.GetAPIVersion() == "" {
		resource.SetAPIVersion(gatewayAPIGroup + "/v1")
	}
	if !strings.HasPrefix(resource.GetAPIVersion(), gatewayAPIGroup+"/") {
		return nil, fmt.Errorf("apiVersion must belong to %s", gatewayAPIGroup)
	}

	targetNs := strings.TrimSpace(namespace)
	if targetNs == "all" || targetNs == "Cluster Scope" {
		targetNs = ""
	}
	if !kindInfo.ClusterScoped {
		if targetNs == "" {
			targetNs = resource.GetNamespace()
		}
		if targetNs == "" {
			targetNs = "default"
		}
		resource.SetNamespace(targetNs)
	} else {
		resource.SetNamespace("")
	}

	var applied *unstructured.Unstructured
	var lastErr error
	for _, version := range kindInfo.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kindInfo.Resource}
		var interfaceForVersion dynamic.ResourceInterface = client.Resource(gvr)
		if !kindInfo.ClusterScoped {
			interfaceForVersion = client.Resource(gvr).Namespace(targetNs)
		}

		existing, getErr := interfaceForVersion.Get(ctx, resource.GetName(), metav1.GetOptions{})
		if getErr == nil {
			resource.SetResourceVersion(existing.GetResourceVersion())
			applied, lastErr = interfaceForVersion.Update(ctx, resource, metav1.UpdateOptions{FieldManager: "kubeview"})
			if lastErr == nil {
				break
			}
			continue
		}
		if apierrors.IsNotFound(getErr) {
			applied, lastErr = interfaceForVersion.Create(ctx, resource, metav1.CreateOptions{FieldManager: "kubeview"})
			if lastErr == nil {
				break
			}
			continue
		}
		lastErr = getErr
		if apierrors.IsForbidden(getErr) {
			break
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("failed to apply %s %s: %w", kind, resource.GetName(), lastErr)
	}

	summary := convertGatewayResource(kind, applied)
	return &summary, nil
}

// DeleteGatewayResource removes a Gateway API resource.
func (m *Manager) DeleteGatewayResource(ctx context.Context, contextName, namespace, kind, name string) error {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return err
	}

	kindInfo := gatewayAPIKindByName(kind)
	if kindInfo == nil {
		return fmt.Errorf("unsupported Gateway API kind %q", kind)
	}

	targetNs := strings.TrimSpace(namespace)
	if targetNs == "all" || targetNs == "Cluster Scope" {
		targetNs = ""
	}
	if !kindInfo.ClusterScoped && targetNs == "" {
		targetNs = "default"
	}

	var lastErr error
	for _, version := range kindInfo.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kindInfo.Resource}
		var interfaceForVersion dynamic.ResourceInterface = client.Resource(gvr)
		if !kindInfo.ClusterScoped {
			interfaceForVersion = client.Resource(gvr).Namespace(targetNs)
		}
		err := interfaceForVersion.Delete(ctx, name, metav1.DeleteOptions{})
		if err == nil || apierrors.IsNotFound(err) {
			return nil
		}
		lastErr = err
		if apierrors.IsForbidden(err) {
			return err
		}
	}
	return fmt.Errorf("failed to delete %s %s: %w", kind, name, lastErr)
}

// GetGatewayResourceYaml exports a live Gateway API resource manifest as YAML.
func (m *Manager) GetGatewayResourceYaml(ctx context.Context, contextName, namespace, kind, name string) (*PodYamlResult, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}

	kindInfo := gatewayAPIKindByName(kind)
	if kindInfo == nil {
		return nil, fmt.Errorf("unsupported Gateway API kind %q", kind)
	}

	var resource *unstructured.Unstructured
	var lastErr error
	for _, version := range kindInfo.Versions {
		gvr := schema.GroupVersionResource{Group: gatewayAPIGroup, Version: version, Resource: kindInfo.Resource}
		if kindInfo.ClusterScoped {
			resource, lastErr = client.Resource(gvr).Get(ctx, name, metav1.GetOptions{})
		} else {
			resource, lastErr = client.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
		}
		if lastErr == nil {
			break
		}
		if apierrors.IsForbidden(lastErr) {
			return nil, lastErr
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("failed to get %s %s: %w", kind, name, lastErr)
	}

	unstructured.RemoveNestedField(resource.Object, "metadata", "managedFields")
	resource.SetKind(kind)
	if resource.GetAPIVersion() == "" {
		resource.SetAPIVersion(gatewayAPIGroup + "/v1")
	}

	data, err := yaml.Marshal(resource.Object)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal %s to YAML: %w", kind, err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}

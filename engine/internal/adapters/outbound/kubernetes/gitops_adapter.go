package kubernetes

import (
	"context"
	"fmt"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"

	legacycluster "github.com/kubeview/engine/internal/cluster"
	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
)

const gitOpsDefaultNamespace = "default"

// GitOpsAdapter resolves desired manifests against the legacy cluster manager
// and reads sanitized live resources for drift comparison.
type GitOpsAdapter struct {
	manager *legacycluster.Manager
}

func NewGitOpsAdapter(manager *legacycluster.Manager) *GitOpsAdapter {
	return &GitOpsAdapter{manager: manager}
}

func (adapter *GitOpsAdapter) CurrentContext(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	if adapter == nil || adapter.manager == nil {
		return "", fmt.Errorf("kubernetes manager is not configured")
	}
	return strings.TrimSpace(adapter.manager.GetCurrentContext()), nil
}

// Read resolves the plural resource and scope, then fetches the live object.
// A missing object is returned with Found=false so the application can report
// drift without treating it as a failure.
func (adapter *GitOpsAdapter) Read(
	ctx context.Context,
	contextName string,
	ref domaingitops.Ref,
) (*domaingitops.LiveResource, error) {
	if adapter == nil || adapter.manager == nil {
		return nil, fmt.Errorf("kubernetes manager is not configured")
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	apiVersion := strings.TrimSpace(ref.APIVersion)
	kind := strings.TrimSpace(ref.Kind)
	name := strings.TrimSpace(ref.Name)
	namespace := strings.TrimSpace(ref.Namespace)

	target, err := adapter.manager.ResolveGenericResource(
		ctx, contextName, apiVersion, kind, "", namespace,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"failed to resolve %s %s %q: %w", apiVersion, kind, name, err,
		)
	}

	resolvedNamespace := ""
	if target.Namespaced {
		if namespace == "" {
			namespace = gitOpsDefaultNamespace
		}
		resolvedNamespace = namespace
	} else if namespace != "" {
		return &domaingitops.LiveResource{Resource: target.GVR.Resource}, fmt.Errorf(
			"resource %s %s is cluster-scoped and cannot use namespace %q",
			apiVersion, kind, namespace,
		)
	}

	object, err := adapter.manager.GetGenericResource(
		ctx,
		contextName,
		legacycluster.GenericResourceRef{
			APIVersion: apiVersion,
			Kind:       kind,
			Resource:   target.GVR.Resource,
			Name:       name,
			Namespace:  resolvedNamespace,
		},
	)
	if apierrors.IsNotFound(err) {
		return &domaingitops.LiveResource{
			Resource:  target.GVR.Resource,
			Namespace: resolvedNamespace,
			Found:     false,
		}, nil
	}
	if err != nil {
		return &domaingitops.LiveResource{
			Resource:  target.GVR.Resource,
			Namespace: resolvedNamespace,
		}, fmt.Errorf("failed to read %s %q: %w", kind, name, err)
	}
	if object == nil {
		return &domaingitops.LiveResource{
			Resource:  target.GVR.Resource,
			Namespace: resolvedNamespace,
		}, fmt.Errorf("live %s %q returned an empty object", kind, name)
	}

	sanitized := object.DeepCopy()
	unstructured.RemoveNestedField(sanitized.Object, "metadata", "managedFields")
	unstructured.RemoveNestedField(sanitized.Object, "status")
	yamlText, err := yaml.Marshal(sanitized.Object)
	if err != nil {
		return &domaingitops.LiveResource{
			Resource:  target.GVR.Resource,
			Namespace: resolvedNamespace,
		}, fmt.Errorf("failed to serialize live %s %q: %w", kind, name, err)
	}

	return &domaingitops.LiveResource{
		Resource:  target.GVR.Resource,
		Namespace: resolvedNamespace,
		Found:     true,
		Object:    sanitized.Object,
		YAML:      string(yamlText),
	}, nil
}

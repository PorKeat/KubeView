package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/yaml"

	legacycluster "github.com/kubeview/engine/internal/cluster"
	domainresources "github.com/kubeview/engine/internal/domain/resources"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

// ResourcesAdapter implements the resources application port on top of the
// legacy cluster manager.
type ResourcesAdapter struct {
	manager *legacycluster.Manager
}

func NewResourcesAdapter(manager *legacycluster.Manager) *ResourcesAdapter {
	return &ResourcesAdapter{manager: manager}
}

func (adapter *ResourcesAdapter) Get(
	ctx context.Context,
	contextName string,
	ref domainresources.Ref,
) (*domainresources.GetResult, error) {
	if err := validateAPIVersion(ref.APIVersion); err != nil {
		return nil, err
	}
	object, err := adapter.manager.GetGenericResource(ctx, contextName, toClusterRef(ref))
	if err != nil {
		return nil, mapResourceError("get", ref, err)
	}
	yamlText, err := marshalResource(object, false)
	if err != nil {
		return nil, mapResourceError("get", ref, err)
	}
	return &domainresources.GetResult{
		Ref:  refFromObject(object, ref.Resource),
		YAML: yamlText,
	}, nil
}

func (adapter *ResourcesAdapter) Apply(
	ctx context.Context,
	contextName string,
	request domainresources.ApplyRequest,
) (*domainresources.ApplyResult, error) {
	object, err := parseManifest(request.YAML)
	if err != nil {
		return nil, err
	}
	apiVersion, kind, name := manifestIdentity(object)
	if apiVersion == "" {
		return nil, shared.Validation("apiVersion is required in the manifest")
	}
	if kind == "" {
		return nil, shared.Validation("kind is required in the manifest")
	}
	if name == "" {
		return nil, shared.Validation("metadata.name is required in the manifest")
	}
	if err := validateAPIVersion(apiVersion); err != nil {
		return nil, err
	}
	if request.Name != "" && name != strings.TrimSpace(request.Name) {
		return nil, shared.Validation(fmt.Sprintf(
			"manifest name %q does not match ref name %q", name, request.Name))
	}
	object.SetAPIVersion(apiVersion)
	object.SetKind(kind)
	object.SetName(name)

	target, err := adapter.manager.ResolveGenericResource(
		ctx, contextName, apiVersion, kind, request.Resource, namespaceHint(object, request),
	)
	if err != nil {
		return nil, mapResourceError("apply", domainresources.Ref{
			APIVersion: apiVersion, Kind: kind, Resource: request.Resource, Name: name,
			Namespace: request.Namespace,
		}, err)
	}

	if err := normalizeNamespace(object, target, request); err != nil {
		return nil, err
	}

	unstructured.RemoveNestedField(object.Object, "metadata", "managedFields")
	unstructured.RemoveNestedField(object.Object, "status")
	applied, created, err := adapter.manager.ApplyGenericResource(
		ctx, contextName, object, *target, request.DryRun,
	)
	if err != nil {
		return nil, mapResourceError("apply", domainresources.Ref{
			APIVersion: apiVersion, Kind: kind, Resource: target.GVR.Resource, Name: name,
			Namespace: object.GetNamespace(),
		}, err)
	}

	yamlText, err := marshalResource(applied, true)
	if err != nil {
		return nil, mapResourceError("apply", domainresources.Ref{
			APIVersion: apiVersion, Kind: kind, Resource: target.GVR.Resource, Name: name,
		}, err)
	}
	result := &domainresources.ApplyResult{
		Ref:     refFromObject(applied, target.GVR.Resource),
		Created: created,
		DryRun:  request.DryRun,
		YAML:    yamlText,
	}
	if result.APIVersion == "" {
		result.APIVersion = apiVersion
	}
	if result.Kind == "" {
		result.Kind = kind
	}
	if result.Name == "" {
		result.Name = name
	}
	return result, nil
}

func (adapter *ResourcesAdapter) Delete(
	ctx context.Context,
	contextName string,
	ref domainresources.Ref,
) error {
	if err := validateAPIVersion(ref.APIVersion); err != nil {
		return err
	}
	if err := adapter.manager.DeleteGenericResource(ctx, contextName, toClusterRef(ref)); err != nil {
		return mapResourceError("delete", ref, err)
	}
	return nil
}

func (adapter *ResourcesAdapter) Capabilities(
	ctx context.Context,
	contextName string,
	ref domainresources.Ref,
) (*domainresources.Capabilities, error) {
	if err := validateAPIVersion(ref.APIVersion); err != nil {
		return nil, err
	}
	capabilities, err := adapter.manager.GenericResourceCapabilities(
		ctx, contextName, toClusterRef(ref),
	)
	if err != nil {
		return nil, mapResourceError("check capabilities for", ref, err)
	}
	return &domainresources.Capabilities{
		Get:     capabilities.Get,
		Create:  capabilities.Create,
		Update:  capabilities.Update,
		Delete:  capabilities.Delete,
		Reasons: capabilities.Reasons,
	}, nil
}

func validateAPIVersion(apiVersion string) error {
	if _, err := schema.ParseGroupVersion(strings.TrimSpace(apiVersion)); err != nil {
		return shared.Validation(fmt.Sprintf("invalid apiVersion %q: %v", apiVersion, err))
	}
	return nil
}

func parseManifest(yamlText string) (*unstructured.Unstructured, error) {
	object := &unstructured.Unstructured{Object: map[string]interface{}{}}
	if err := yaml.Unmarshal([]byte(yamlText), &object.Object); err != nil {
		return nil, shared.Validation(fmt.Sprintf("invalid YAML: %v", err))
	}
	if len(object.Object) == 0 {
		return nil, shared.Validation("manifest must be a non-empty YAML mapping")
	}
	return object, nil
}

func manifestIdentity(object *unstructured.Unstructured) (string, string, string) {
	return strings.TrimSpace(object.GetAPIVersion()),
		strings.TrimSpace(object.GetKind()),
		strings.TrimSpace(object.GetName())
}

func namespaceHint(object *unstructured.Unstructured, request domainresources.ApplyRequest) string {
	if namespace := strings.TrimSpace(object.GetNamespace()); namespace != "" {
		return namespace
	}
	return strings.TrimSpace(request.Namespace)
}

func normalizeNamespace(
	object *unstructured.Unstructured,
	target *legacycluster.GenericResourceTarget,
	request domainresources.ApplyRequest,
) error {
	hint := strings.TrimSpace(request.Namespace)
	namespace := strings.TrimSpace(object.GetNamespace())
	if target.Namespaced {
		if namespace == "" {
			namespace = hint
		}
		if namespace == "" {
			return shared.Validation(fmt.Sprintf(
				"metadata.namespace is required for namespaced resource %q", object.GetKind()))
		}
		if hint != "" && namespace != hint {
			return shared.Validation(fmt.Sprintf(
				"manifest namespace %q does not match ref namespace %q", namespace, hint))
		}
		object.SetNamespace(namespace)
		return nil
	}

	if hint != "" {
		return shared.Validation(fmt.Sprintf(
			"resource %q is cluster-scoped and cannot use namespace %q", object.GetKind(), hint))
	}
	object.SetNamespace("")
	return nil
}

func marshalResource(object *unstructured.Unstructured, stripStatus bool) (string, error) {
	if object == nil {
		return "", fmt.Errorf("resource object is empty")
	}
	copy := object.DeepCopy()
	unstructured.RemoveNestedField(copy.Object, "metadata", "managedFields")
	if stripStatus {
		unstructured.RemoveNestedField(copy.Object, "status")
	}
	data, err := yaml.Marshal(copy.Object)
	if err != nil {
		return "", fmt.Errorf("failed to marshal resource to YAML: %w", err)
	}
	return string(data), nil
}

func refFromObject(object *unstructured.Unstructured, resource string) domainresources.Ref {
	if object == nil {
		return domainresources.Ref{Resource: resource}
	}
	return domainresources.Ref{
		APIVersion: object.GetAPIVersion(),
		Kind:       object.GetKind(),
		Resource:   resource,
		Name:       object.GetName(),
		Namespace:  object.GetNamespace(),
	}
}

func toClusterRef(ref domainresources.Ref) legacycluster.GenericResourceRef {
	return legacycluster.GenericResourceRef{
		APIVersion: strings.TrimSpace(ref.APIVersion),
		Kind:       strings.TrimSpace(ref.Kind),
		Resource:   strings.TrimSpace(ref.Resource),
		Name:       strings.TrimSpace(ref.Name),
		Namespace:  strings.TrimSpace(ref.Namespace),
	}
}

func mapResourceError(action string, ref domainresources.Ref, err error) error {
	if err == nil {
		return nil
	}
	var sharedErr *shared.Error
	if errors.As(err, &sharedErr) {
		return err
	}

	target := ref.Kind
	if target == "" {
		target = ref.Resource
	}
	message := fmt.Sprintf("Failed to %s %s %q", action, target, ref.Name)
	switch {
	case apierrors.IsNotFound(err):
		return shared.NewError(shared.KindNotFound, message, err)
	case apierrors.IsUnauthorized(err):
		return shared.NewError(shared.KindUnauthorized, message, err)
	case apierrors.IsForbidden(err):
		return shared.NewError(shared.KindForbidden, message, err)
	case apierrors.IsConflict(err), apierrors.IsAlreadyExists(err):
		return shared.NewError(shared.KindConflict, message, err)
	case apierrors.IsTimeout(err), apierrors.IsServerTimeout(err), apierrors.IsTooManyRequests(err):
		return shared.NewError(shared.KindTimeout, message, err)
	case apierrors.IsServiceUnavailable(err), apierrors.IsInternalError(err):
		return shared.NewError(shared.KindUnavailable, message, err)
	}

	var statusErr *apierrors.StatusError
	if errors.As(err, &statusErr) && statusErr.ErrStatus.Code >= 400 && statusErr.ErrStatus.Code < 500 {
		return shared.NewError(shared.KindInvalid, message, err)
	}
	return shared.NewError(shared.KindUnavailable, message, err)
}

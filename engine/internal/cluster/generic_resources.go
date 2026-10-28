package cluster

import (
	"context"
	"fmt"
	"strings"

	authorizationv1 "k8s.io/api/authorization/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/restmapper"
)

const genericResourceFieldManager = "kubeview"

// GenericResourceRef identifies any Kubernetes resource for generic actions.
type GenericResourceRef struct {
	APIVersion string
	Kind       string
	Resource   string
	Name       string
	Namespace  string
}

// GenericResourceTarget is the resolved GVR and scope for a resource.
type GenericResourceTarget struct {
	GVR        schema.GroupVersionResource
	Namespaced bool
}

// GenericCapabilities reports whether the current identity may perform each
// verb on a resource. Per-verb failures are recorded in Reasons instead of
// failing the whole check.
type GenericCapabilities struct {
	Get     bool
	Create  bool
	Update  bool
	Delete  bool
	Reasons map[string]string
}

// ResolveGenericResource resolves a resource to its GVR and namespace scope.
// A supplied plural resource is preferred; discovery is used to determine
// scope and to resolve the plural from the kind when it is omitted.
func (m *Manager) ResolveGenericResource(
	ctx context.Context,
	contextName string,
	apiVersion string,
	kind string,
	resource string,
	namespace string,
) (*GenericResourceTarget, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	groupVersion, err := schema.ParseGroupVersion(apiVersion)
	if err != nil {
		return nil, fmt.Errorf("invalid apiVersion %q: %w", apiVersion, err)
	}

	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	kind = strings.TrimSpace(kind)
	resource = strings.TrimSpace(resource)
	discovered := discoverAPIResource(client, apiVersion, kind, resource)
	if resource != "" {
		namespaced := namespace != ""
		if discovered != nil {
			resource = discovered.Name
			namespaced = discovered.Namespaced
		}
		return &GenericResourceTarget{
			GVR:        groupVersion.WithResource(resource),
			Namespaced: namespaced,
		}, nil
	}

	if discovered != nil {
		return &GenericResourceTarget{
			GVR:        groupVersion.WithResource(discovered.Name),
			Namespaced: discovered.Namespaced,
		}, nil
	}

	mapping, err := genericRESTMapping(client, groupVersion, kind)
	if err != nil {
		return nil, fmt.Errorf("unable to resolve kind %s %s: %w", apiVersion, kind, err)
	}
	return &GenericResourceTarget{
		GVR:        mapping.Resource,
		Namespaced: mapping.Scope.Name() == meta.RESTScopeNameNamespace,
	}, nil
}

// GetGenericResource reads a resource with the dynamic client and removes
// server-managed metadata fields from the returned object.
func (m *Manager) GetGenericResource(
	ctx context.Context,
	contextName string,
	ref GenericResourceRef,
) (*unstructured.Unstructured, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}
	groupVersion, err := schema.ParseGroupVersion(ref.APIVersion)
	if err != nil {
		return nil, fmt.Errorf("invalid apiVersion %q: %w", ref.APIVersion, err)
	}

	resource := genericResourceInterface(
		client, groupVersion.WithResource(ref.Resource), ref.Namespace, ref.Namespace != "",
	)
	object, err := resource.Get(ctx, ref.Name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	unstructured.RemoveNestedField(object.Object, "metadata", "managedFields")
	return object, nil
}

// DeleteGenericResource deletes a resource with the dynamic client. A missing
// resource is treated as already deleted.
func (m *Manager) DeleteGenericResource(
	ctx context.Context,
	contextName string,
	ref GenericResourceRef,
) error {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return err
	}
	groupVersion, err := schema.ParseGroupVersion(ref.APIVersion)
	if err != nil {
		return fmt.Errorf("invalid apiVersion %q: %w", ref.APIVersion, err)
	}

	resource := genericResourceInterface(
		client, groupVersion.WithResource(ref.Resource), ref.Namespace, ref.Namespace != "",
	)
	err = resource.Delete(ctx, ref.Name, metav1.DeleteOptions{})
	if apierrors.IsNotFound(err) {
		return nil
	}
	return err
}

// ApplyGenericResource creates or updates an unstructured object using the
// resolved target. The live resourceVersion is preserved when the manifest
// omits it.
func (m *Manager) ApplyGenericResource(
	ctx context.Context,
	contextName string,
	object *unstructured.Unstructured,
	target GenericResourceTarget,
	dryRun bool,
) (*unstructured.Unstructured, bool, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, false, err
	}

	resource := genericResourceInterface(
		client, target.GVR, object.GetNamespace(), target.Namespaced,
	)

	updateOptions := metav1.UpdateOptions{FieldManager: genericResourceFieldManager}
	createOptions := metav1.CreateOptions{FieldManager: genericResourceFieldManager}
	if dryRun {
		updateOptions.DryRun = []string{metav1.DryRunAll}
		createOptions.DryRun = []string{metav1.DryRunAll}
	}

	existing, getErr := resource.Get(ctx, object.GetName(), metav1.GetOptions{})
	switch {
	case getErr == nil:
		if object.GetResourceVersion() == "" {
			object.SetResourceVersion(existing.GetResourceVersion())
		}
		applied, updateErr := resource.Update(ctx, object, updateOptions)
		return applied, false, updateErr
	case !apierrors.IsNotFound(getErr):
		return nil, false, getErr
	}

	applied, createErr := resource.Create(ctx, object, createOptions)
	if apierrors.IsAlreadyExists(createErr) {
		existing, getErr := resource.Get(ctx, object.GetName(), metav1.GetOptions{})
		if getErr != nil {
			return nil, false, getErr
		}
		if object.GetResourceVersion() == "" {
			object.SetResourceVersion(existing.GetResourceVersion())
		}
		applied, updateErr := resource.Update(ctx, object, updateOptions)
		return applied, false, updateErr
	}
	return applied, createErr == nil, createErr
}

// GenericResourceCapabilities runs SelfSubjectAccessReviews for get, create,
// update, and delete. Only client construction errors fail the check.
func (m *Manager) GenericResourceCapabilities(
	ctx context.Context,
	contextName string,
	ref GenericResourceRef,
) (*GenericCapabilities, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	target, resolveErr := m.ResolveGenericResource(
		ctx, contextName, ref.APIVersion, ref.Kind, ref.Resource, ref.Namespace,
	)
	if resolveErr != nil {
		groupVersion, parseErr := schema.ParseGroupVersion(ref.APIVersion)
		if parseErr != nil || strings.TrimSpace(ref.Resource) == "" {
			return nil, resolveErr
		}
		target = &GenericResourceTarget{
			GVR:        groupVersion.WithResource(ref.Resource),
			Namespaced: ref.Namespace != "",
		}
	}

	namespace := ""
	if target.Namespaced {
		namespace = ref.Namespace
	}
	result := &GenericCapabilities{Reasons: make(map[string]string)}
	checks := []struct {
		verb    string
		allowed *bool
	}{
		{verb: "get", allowed: &result.Get},
		{verb: "create", allowed: &result.Create},
		{verb: "update", allowed: &result.Update},
		{verb: "delete", allowed: &result.Delete},
	}
	for _, check := range checks {
		review := &authorizationv1.SelfSubjectAccessReview{
			Spec: authorizationv1.SelfSubjectAccessReviewSpec{
				ResourceAttributes: &authorizationv1.ResourceAttributes{
					Namespace: namespace,
					Verb:      check.verb,
					Group:     target.GVR.Group,
					Resource:  target.GVR.Resource,
					Name:      ref.Name,
				},
			},
		}
		response, reviewErr := client.AuthorizationV1().SelfSubjectAccessReviews().Create(
			ctx, review, metav1.CreateOptions{},
		)
		if reviewErr != nil {
			result.Reasons[check.verb] = reviewErr.Error()
			continue
		}
		*check.allowed = response.Status.Allowed
		if response.Status.EvaluationError != "" {
			result.Reasons[check.verb] = response.Status.EvaluationError
		} else if !response.Status.Allowed && response.Status.Reason != "" {
			result.Reasons[check.verb] = response.Status.Reason
		}
	}
	if len(result.Reasons) == 0 {
		result.Reasons = nil
	}
	return result, nil
}

func genericResourceInterface(
	client dynamic.Interface,
	gvr schema.GroupVersionResource,
	namespace string,
	namespaced bool,
) dynamic.ResourceInterface {
	resource := client.Resource(gvr)
	if namespaced {
		return resource.Namespace(namespace)
	}
	return resource
}

func discoverAPIResource(
	client kubernetes.Interface,
	apiVersion string,
	kind string,
	resource string,
) *metav1.APIResource {
	list, err := client.Discovery().ServerResourcesForGroupVersion(apiVersion)
	if err != nil || list == nil {
		return nil
	}
	for index := range list.APIResources {
		item := &list.APIResources[index]
		if strings.Contains(item.Name, "/") {
			continue
		}
		if resource != "" {
			if item.Name == resource {
				return item
			}
			continue
		}
		if item.Kind == kind {
			return item
		}
	}
	return nil
}

func genericRESTMapping(
	client kubernetes.Interface,
	groupVersion schema.GroupVersion,
	kind string,
) (*meta.RESTMapping, error) {
	groupResources, err := restmapper.GetAPIGroupResources(client.Discovery())
	if err != nil && len(groupResources) == 0 {
		return nil, err
	}
	mapper := restmapper.NewDiscoveryRESTMapper(groupResources)
	return mapper.RESTMapping(
		schema.GroupKind{Group: groupVersion.Group, Kind: kind},
		groupVersion.Version,
	)
}

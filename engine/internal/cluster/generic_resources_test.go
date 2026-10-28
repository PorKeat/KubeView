package cluster

import (
	"context"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	authorizationv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	fakeclientset "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

var deploymentGVR = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}

func newGenericResourceTestManager(t *testing.T) (*Manager, *fakeclientset.Clientset) {
	t.Helper()
	scheme := runtime.NewScheme()
	if err := appsv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add apps scheme: %v", err)
	}
	existing := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata": map[string]interface{}{
			"name":            "web",
			"namespace":       "apps",
			"resourceVersion": "7",
			"managedFields": []interface{}{
				map[string]interface{}{"manager": "kubectl"},
			},
		},
		"spec": map[string]interface{}{"replicas": int64(1)},
	}}
	dynamicClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{deploymentGVR: "DeploymentList"},
		existing,
	)

	client := fakeclientset.NewSimpleClientset()
	client.Resources = []*metav1.APIResourceList{
		{
			GroupVersion: "apps/v1",
			APIResources: []metav1.APIResource{
				{Name: "deployments", Kind: "Deployment", Namespaced: true},
			},
		},
		{
			GroupVersion: "v1",
			APIResources: []metav1.APIResource{
				{Name: "nodes", Kind: "Node", Namespaced: false},
			},
		},
	}

	manager := newFakeManager(client)
	attachDynamicClient(manager, "test", dynamicClient)
	return manager, client
}

func TestGetGenericResourceStripsManagedFields(t *testing.T) {
	manager, _ := newGenericResourceTestManager(t)
	object, err := manager.GetGenericResource(context.Background(), "test", GenericResourceRef{
		APIVersion: "apps/v1", Kind: "Deployment", Resource: "deployments",
		Name: "web", Namespace: "apps",
	})
	if err != nil {
		t.Fatalf("GetGenericResource: %v", err)
	}
	if object.GetName() != "web" || object.GetNamespace() != "apps" {
		t.Fatalf("unexpected object identity: %+v", object.Object)
	}
	fields, found, fieldErr := unstructured.NestedFieldNoCopy(object.Object, "metadata", "managedFields")
	if fieldErr != nil || found || fields != nil {
		t.Fatalf("managedFields should be stripped, got %v (found=%v, err=%v)", fields, found, fieldErr)
	}
}

func TestResolveGenericResourceUsesDiscovery(t *testing.T) {
	manager, _ := newGenericResourceTestManager(t)
	target, err := manager.ResolveGenericResource(
		context.Background(), "test", "apps/v1", "Deployment", "deployments", "apps",
	)
	if err != nil {
		t.Fatalf("ResolveGenericResource: %v", err)
	}
	if target.GVR != deploymentGVR || !target.Namespaced {
		t.Fatalf("unexpected target: %+v", target)
	}

	byKind, err := manager.ResolveGenericResource(
		context.Background(), "test", "apps/v1", "Deployment", "", "apps",
	)
	if err != nil {
		t.Fatalf("resolve by kind: %v", err)
	}
	if byKind.GVR != deploymentGVR || !byKind.Namespaced {
		t.Fatalf("unexpected kind-resolved target: %+v", byKind)
	}

	clusterTarget, err := manager.ResolveGenericResource(
		context.Background(), "test", "v1", "Node", "nodes", "",
	)
	if err != nil {
		t.Fatalf("resolve cluster-scoped: %v", err)
	}
	if clusterTarget.Namespaced {
		t.Fatalf("expected cluster-scoped target, got %+v", clusterTarget)
	}
}

func TestApplyGenericResourceCreatesAndUpdates(t *testing.T) {
	manager, _ := newGenericResourceTestManager(t)
	target, err := manager.ResolveGenericResource(
		context.Background(), "test", "apps/v1", "Deployment", "deployments", "apps",
	)
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}

	createdObject := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata":   map[string]interface{}{"name": "api", "namespace": "apps"},
		"spec":       map[string]interface{}{"replicas": int64(2)},
	}}
	applied, created, err := manager.ApplyGenericResource(
		context.Background(), "test", createdObject, *target, false,
	)
	if err != nil {
		t.Fatalf("create apply: %v", err)
	}
	if !created || applied.GetName() != "api" {
		t.Fatalf("expected created object, got created=%v object=%+v", created, applied.Object)
	}

	updatedObject := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata":   map[string]interface{}{"name": "web", "namespace": "apps"},
		"spec":       map[string]interface{}{"replicas": int64(5)},
	}}
	applied, created, err = manager.ApplyGenericResource(
		context.Background(), "test", updatedObject, *target, false,
	)
	if err != nil {
		t.Fatalf("update apply: %v", err)
	}
	if created {
		t.Fatal("expected update, got created=true")
	}
	if applied.GetResourceVersion() != "7" {
		t.Fatalf("expected live resourceVersion to be preserved, got %q", applied.GetResourceVersion())
	}
	if replicas, _, _ := unstructured.NestedInt64(applied.Object, "spec", "replicas"); replicas != 5 {
		t.Fatalf("expected updated replicas, got %d", replicas)
	}
}

func TestGenericResourceCapabilitiesReviewsVerbs(t *testing.T) {
	manager, client := newGenericResourceTestManager(t)
	var reviewed []authorizationv1.ResourceAttributes
	client.PrependReactor("create", "selfsubjectaccessreviews", func(
		action k8stesting.Action,
	) (bool, runtime.Object, error) {
		createAction, ok := action.(k8stesting.CreateAction)
		if !ok {
			return false, nil, nil
		}
		review, ok := createAction.GetObject().(*authorizationv1.SelfSubjectAccessReview)
		if !ok {
			return false, nil, nil
		}
		copied := review.DeepCopy()
		attributes := copied.Spec.ResourceAttributes
		reviewed = append(reviewed, *attributes)
		switch {
		case attributes.Resource == "nodes":
			copied.Status.Allowed = false
			copied.Status.Reason = "cluster resource denied by test"
		case attributes.Verb == "get" || attributes.Verb == "update":
			copied.Status.Allowed = true
		default:
			copied.Status.Allowed = false
			copied.Status.Reason = "denied by test"
		}
		return true, copied, nil
	})

	result, err := manager.GenericResourceCapabilities(context.Background(), "test", GenericResourceRef{
		APIVersion: "apps/v1", Kind: "Deployment", Resource: "deployments",
		Name: "web", Namespace: "apps",
	})
	if err != nil {
		t.Fatalf("GenericResourceCapabilities: %v", err)
	}
	if !result.Get || !result.Update || result.Create || result.Delete {
		t.Fatalf("unexpected capabilities: %+v", result)
	}
	if result.Reasons["create"] != "denied by test" || result.Reasons["delete"] != "denied by test" {
		t.Fatalf("expected denial reasons, got %+v", result.Reasons)
	}
	for _, attributes := range reviewed {
		if attributes.Namespace != "apps" || attributes.Group != "apps" ||
			attributes.Resource != "deployments" || attributes.Name != "web" {
			t.Fatalf("unexpected review attributes: %+v", attributes)
		}
	}

	clusterResult, err := manager.GenericResourceCapabilities(context.Background(), "test", GenericResourceRef{
		APIVersion: "v1", Kind: "Node", Resource: "nodes",
		Name: "node-1", Namespace: "ignored",
	})
	if err != nil {
		t.Fatalf("cluster-scoped capabilities: %v", err)
	}
	if clusterResult.Get {
		t.Fatal("expected cluster-scoped review to be denied")
	}
	if last := reviewed[len(reviewed)-1]; last.Namespace != "" {
		t.Fatalf("expected empty namespace for cluster-scoped review, got %+v", last)
	}
}

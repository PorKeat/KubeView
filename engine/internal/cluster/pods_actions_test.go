package cluster

import (
	"context"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	fakeclientset "k8s.io/client-go/kubernetes/fake"
)

func testMovePod() *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web-1",
			Namespace: "apps",
			Labels:    map[string]string{"app": "web"},
			Annotations: map[string]string{
				"example.com/owner": "team-a",
			},
		},
		Spec: corev1.PodSpec{
			NodeName:   "worker-1",
			Containers: []corev1.Container{{Name: "web", Image: "nginx:1.27"}},
		},
	}
}

func TestMovePodStandaloneToNamespace(t *testing.T) {
	pod := testMovePod()
	targetNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "target"}}
	client := fakeclientset.NewSimpleClientset(pod, targetNamespace)
	manager := newFakeManager(client)

	result, err := manager.MovePod(context.Background(), MovePodParams{
		ContextName:     "test",
		Namespace:       "apps",
		PodName:         "web-1",
		TargetNamespace: "target",
	})
	if err != nil {
		t.Fatalf("MovePod failed: %v", err)
	}
	if result.Mode != "namespace" || result.Namespace != "target" {
		t.Fatalf("unexpected result: %+v", result)
	}

	if _, err := client.CoreV1().Pods("apps").Get(context.Background(), "web-1", metav1.GetOptions{}); !apierrors.IsNotFound(err) {
		t.Fatalf("expected original pod to be deleted, got err=%v", err)
	}

	created, err := client.CoreV1().Pods("target").Get(context.Background(), "web-1", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("expected copied pod in target namespace: %v", err)
	}
	if created.Spec.NodeName != "" {
		t.Fatalf("expected nodeName to be cleared for rescheduling, got %q", created.Spec.NodeName)
	}
	if created.Labels["app"] != "web" {
		t.Fatalf("expected labels to be preserved, got %#v", created.Labels)
	}
	if len(created.OwnerReferences) != 0 {
		t.Fatalf("expected owner references to be stripped, got %#v", created.OwnerReferences)
	}
}

func TestMovePodManagedToNamespaceRejected(t *testing.T) {
	pod := testMovePod()
	pod.OwnerReferences = []metav1.OwnerReference{{
		APIVersion: "apps/v1",
		Kind:       "ReplicaSet",
		Name:       "web-abc123",
	}}
	client := fakeclientset.NewSimpleClientset(
		pod,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "target"}},
	)
	manager := newFakeManager(client)

	_, err := manager.MovePod(context.Background(), MovePodParams{
		ContextName:     "test",
		Namespace:       "apps",
		PodName:         "web-1",
		TargetNamespace: "target",
	})
	if err == nil || !strings.Contains(err.Error(), "managed by ReplicaSet/web-abc123") {
		t.Fatalf("expected managed-pod rejection, got %v", err)
	}
}

func TestMovePodStandaloneToNode(t *testing.T) {
	node := &corev1.Node{ObjectMeta: metav1.ObjectMeta{
		Name:   "worker-2",
		Labels: map[string]string{"kubernetes.io/hostname": "worker-2"},
	}}
	client := fakeclientset.NewSimpleClientset(testMovePod(), node)
	manager := newFakeManager(client)

	result, err := manager.MovePod(context.Background(), MovePodParams{
		ContextName: "test",
		Namespace:   "apps",
		PodName:     "web-1",
		TargetNode:  "worker-2",
	})
	if err != nil {
		t.Fatalf("MovePod failed: %v", err)
	}
	if result.Mode != "node" {
		t.Fatalf("expected node mode, got %q", result.Mode)
	}

	created, err := client.CoreV1().Pods("apps").Get(context.Background(), "web-1", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("expected recreated pod: %v", err)
	}
	if got := created.Spec.NodeSelector["kubernetes.io/hostname"]; got != "worker-2" {
		t.Fatalf("expected hostname node selector worker-2, got %q", got)
	}
	if created.Spec.NodeName != "" {
		t.Fatalf("expected nodeName to stay unset so the scheduler binds it, got %q", created.Spec.NodeName)
	}
}

func TestMovePodUnknownNodeRejected(t *testing.T) {
	client := fakeclientset.NewSimpleClientset(testMovePod())
	manager := newFakeManager(client)

	_, err := manager.MovePod(context.Background(), MovePodParams{
		ContextName: "test",
		Namespace:   "apps",
		PodName:     "web-1",
		TargetNode:  "missing-node",
	})
	if err == nil || !strings.Contains(err.Error(), "target node missing-node is not available") {
		t.Fatalf("expected missing node rejection, got %v", err)
	}
}

func TestMovePodManagedReschedule(t *testing.T) {
	pod := testMovePod()
	pod.Spec.NodeName = ""
	pod.OwnerReferences = []metav1.OwnerReference{{
		APIVersion: "apps/v1",
		Kind:       "ReplicaSet",
		Name:       "web-abc123",
	}}
	client := fakeclientset.NewSimpleClientset(pod)
	manager := newFakeManager(client)

	result, err := manager.MovePod(context.Background(), MovePodParams{
		ContextName: "test",
		Namespace:   "apps",
		PodName:     "web-1",
	})
	if err != nil {
		t.Fatalf("MovePod failed: %v", err)
	}
	if result.Mode != "reschedule" || result.OwnerKind != "ReplicaSet/web-abc123" {
		t.Fatalf("unexpected result: %+v", result)
	}
	if _, err := client.CoreV1().Pods("apps").Get(context.Background(), "web-1", metav1.GetOptions{}); !apierrors.IsNotFound(err) {
		t.Fatalf("expected pod to be deleted for controller rescheduling, got err=%v", err)
	}
}

func TestMovePodRejectsTwoDestinations(t *testing.T) {
	client := fakeclientset.NewSimpleClientset(testMovePod())
	manager := newFakeManager(client)

	_, err := manager.MovePod(context.Background(), MovePodParams{
		ContextName:     "test",
		Namespace:       "apps",
		PodName:         "web-1",
		TargetNamespace: "target",
		TargetNode:      "worker-2",
	})
	if err == nil || !strings.Contains(err.Error(), "not both") {
		t.Fatalf("expected destination validation, got %v", err)
	}
}

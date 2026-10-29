package cluster

import (
	"context"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func simpleTestMeta(name, namespace string, created time.Time) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:              name,
		Namespace:         namespace,
		CreationTimestamp: metav1.NewTime(created),
	}
}

func TestListSimpleResources(t *testing.T) {
	now := time.Now().Add(-5 * time.Minute)
	replicas := int32(2)
	httpPort := int32(8080)
	tcp := corev1.ProtocolTCP
	storageClass := "fast"
	volumeMode := corev1.PersistentVolumeFilesystem
	portName := "http"
	sliceMeta := simpleTestMeta("web-abc", "default", now)
	sliceMeta.Labels = map[string]string{"kubernetes.io/service-name": "web"}

	client := fake.NewSimpleClientset(
		&corev1.Namespace{
			ObjectMeta: simpleTestMeta("active-ns", "", now),
			Status:     corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
		},
		&corev1.Namespace{
			ObjectMeta: simpleTestMeta("ending-ns", "", now),
			Status:     corev1.NamespaceStatus{Phase: corev1.NamespaceTerminating},
		},
		&corev1.Event{
			ObjectMeta:     simpleTestMeta("event-warning", "default", now),
			InvolvedObject: corev1.ObjectReference{Kind: "Pod", Name: "web-1"},
			Reason:         "BackOff",
			Message:        "Back-off restarting failed container",
			Type:           "Warning",
			Count:          4,
			LastTimestamp:  metav1.NewTime(now.Add(2 * time.Minute)),
		},
		&corev1.Event{
			ObjectMeta:     simpleTestMeta("event-normal", "default", now),
			InvolvedObject: corev1.ObjectReference{Kind: "Pod", Name: "web-1"},
			Reason:         "Scheduled",
			Message:        "Successfully assigned default/web-1",
			Type:           "Normal",
			LastTimestamp:  metav1.NewTime(now),
		},
		&corev1.ReplicationController{
			ObjectMeta: simpleTestMeta("web-rc", "default", now),
			Spec: corev1.ReplicationControllerSpec{
				Replicas: &replicas,
				Selector: map[string]string{"app": "web"},
			},
			Status: corev1.ReplicationControllerStatus{ReadyReplicas: 1},
		},
		&discoveryv1.EndpointSlice{
			ObjectMeta:  sliceMeta,
			AddressType: discoveryv1.AddressTypeIPv4,
			Ports: []discoveryv1.EndpointPort{{
				Name:     &portName,
				Port:     &httpPort,
				Protocol: &tcp,
			}},
			Endpoints: []discoveryv1.Endpoint{{Addresses: []string{"10.0.0.1"}}},
		},
		&networkingv1.IngressClass{
			ObjectMeta: metav1.ObjectMeta{
				Name:              "nginx",
				CreationTimestamp: metav1.NewTime(now),
				Annotations: map[string]string{
					"ingressclass.kubernetes.io/is-default-class": "true",
				},
			},
			Spec: networkingv1.IngressClassSpec{Controller: "k8s.io/ingress-nginx"},
		},
		&corev1.PersistentVolumeClaim{
			ObjectMeta: simpleTestMeta("data", "default", now),
			Spec: corev1.PersistentVolumeClaimSpec{
				AccessModes:      []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
				StorageClassName: &storageClass,
				VolumeMode:       &volumeMode,
				VolumeName:       "pv-data",
				Resources: corev1.VolumeResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("2Gi"),
					},
				},
			},
			Status: corev1.PersistentVolumeClaimStatus{
				Phase: corev1.ClaimBound,
				Capacity: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse("2Gi"),
				},
			},
		},
	)
	manager := newFakeManager(client)
	ctx := context.Background()

	t.Run("namespaces", func(t *testing.T) {
		res, err := manager.ListSimpleResources(ctx, "test", "namespaces", "")
		if err != nil {
			t.Fatal(err)
		}
		if res.TotalCount != 2 || res.Items[0].Name != "active-ns" {
			t.Fatalf("unexpected namespaces: %+v", res.Items)
		}
		if res.Items[0].StatusTone != "healthy" || res.Items[1].StatusTone != "warning" {
			t.Fatalf("unexpected namespace tones: %+v", res.Items)
		}
	})

	t.Run("events", func(t *testing.T) {
		res, err := manager.ListSimpleResources(ctx, "test", "events", "all")
		if err != nil {
			t.Fatal(err)
		}
		if res.TotalCount != 2 {
			t.Fatalf("expected 2 events, got %d", res.TotalCount)
		}
		if res.Items[0].StatusTone != "critical" {
			t.Fatalf("newest event should be warning/critical: %+v", res.Items[0])
		}
		if res.Items[0].Details["object"] != "Pod/web-1" {
			t.Fatalf("unexpected involved object: %+v", res.Items[0].Details)
		}
	})

	t.Run("replication controllers", func(t *testing.T) {
		res, err := manager.ListSimpleResources(ctx, "test", "replicationcontrollers", "default")
		if err != nil {
			t.Fatal(err)
		}
		if res.Items[0].Status != "1/2 ready" || res.Items[0].StatusTone != "warning" {
			t.Fatalf("unexpected rc row: %+v", res.Items[0])
		}
	})

	t.Run("endpoint slices", func(t *testing.T) {
		res, err := manager.ListSimpleResources(ctx, "test", "endpointslices", "default")
		if err != nil {
			t.Fatal(err)
		}
		if res.Items[0].Details["service"] != "web" || res.Items[0].Details["ports"] != "8080/TCP" {
			t.Fatalf("unexpected endpoint slice: %+v", res.Items[0])
		}
	})

	t.Run("ingress classes", func(t *testing.T) {
		res, err := manager.ListSimpleResources(ctx, "test", "ingressclasses", "")
		if err != nil {
			t.Fatal(err)
		}
		if res.Items[0].Status != "Default" || res.Items[0].Details["default"] != "true" {
			t.Fatalf("unexpected ingress class: %+v", res.Items[0])
		}
	})

	t.Run("persistent volume claims", func(t *testing.T) {
		res, err := manager.ListSimpleResources(ctx, "test", "persistentvolumeclaims", "all")
		if err != nil {
			t.Fatal(err)
		}
		if res.Items[0].Status != "Bound" || res.Items[0].Details["capacity"] != "2Gi" {
			t.Fatalf("unexpected pvc: %+v", res.Items[0])
		}
	})

	t.Run("unknown kind", func(t *testing.T) {
		if _, err := manager.ListSimpleResources(ctx, "test", "widgets", ""); err == nil {
			t.Fatal("expected an error for an unsupported kind")
		}
	})
}

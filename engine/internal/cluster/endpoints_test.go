package cluster

import (
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestConvertEndpointsToSummary(t *testing.T) {
	nodeName := "worker-1"
	endpoints := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "web",
			Namespace:         "production",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * time.Minute)),
		},
		Subsets: []corev1.EndpointSubset{
			{
				Addresses: []corev1.EndpointAddress{
					{
						IP:       "10.244.1.10",
						NodeName: &nodeName,
						TargetRef: &corev1.ObjectReference{
							Kind: "Pod",
							Name: "web-0",
						},
					},
				},
				NotReadyAddresses: []corev1.EndpointAddress{{IP: "10.244.1.11"}},
				Ports: []corev1.EndpointPort{
					{Name: "http", Port: 80, Protocol: corev1.ProtocolTCP},
				},
			},
		},
	}

	summary := convertEndpointsToSummary(endpoints)

	if summary.Status != "Ready" {
		t.Errorf("expected Ready status, got %s", summary.Status)
	}
	if summary.ReadyCount != 1 || summary.NotReadyCount != 1 {
		t.Errorf("expected 1 ready and 1 not ready, got %d/%d", summary.ReadyCount, summary.NotReadyCount)
	}
	if len(summary.Addresses) != 2 {
		t.Fatalf("expected 2 addresses, got %d", len(summary.Addresses))
	}
	if summary.Addresses[0].TargetKind != "Pod" || summary.Addresses[0].TargetName != "web-0" {
		t.Errorf("unexpected target ref: %+v", summary.Addresses[0])
	}
	if summary.Addresses[0].NodeName != "worker-1" {
		t.Errorf("expected node worker-1, got %s", summary.Addresses[0].NodeName)
	}
	if len(summary.Ports) != 1 || summary.Ports[0].Port != 80 {
		t.Errorf("unexpected ports: %+v", summary.Ports)
	}
}

func TestConvertEndpointsNotReadyAndEmpty(t *testing.T) {
	notReady := &corev1.Endpoints{
		Subsets: []corev1.EndpointSubset{
			{NotReadyAddresses: []corev1.EndpointAddress{{IP: "10.244.1.12"}}},
		},
	}
	if summary := convertEndpointsToSummary(notReady); summary.Status != "Not Ready" {
		t.Errorf("expected Not Ready status, got %s", summary.Status)
	}

	if summary := convertEndpointsToSummary(&corev1.Endpoints{}); summary.Status != "Empty" {
		t.Errorf("expected Empty status, got %s", summary.Status)
	}
}

package cluster

import (
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

func TestConvertServiceToSummary(t *testing.T) {
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "web",
			Namespace:         "production",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * time.Minute)),
			Labels:            map[string]string{"app": "web"},
			Annotations:       map[string]string{"team": "platform"},
		},
		Spec: corev1.ServiceSpec{
			Type:      corev1.ServiceTypeNodePort,
			ClusterIP: "10.96.0.10",
			Selector:  map[string]string{"app": "web"},
			Ports: []corev1.ServicePort{
				{
					Name:       "http",
					Protocol:   corev1.ProtocolTCP,
					Port:       80,
					TargetPort: intstr.FromInt32(8080),
					NodePort:   30080,
				},
			},
		},
	}

	summary := convertServiceToSummary(service)

	if summary.Type != "NodePort" {
		t.Errorf("expected NodePort type, got %s", summary.Type)
	}
	if summary.Status != "Active" {
		t.Errorf("expected Active status, got %s", summary.Status)
	}
	if summary.ClusterIP != "10.96.0.10" {
		t.Errorf("expected cluster IP 10.96.0.10, got %s", summary.ClusterIP)
	}
	if len(summary.Ports) != 1 {
		t.Fatalf("expected 1 port, got %d", len(summary.Ports))
	}
	if summary.Ports[0].TargetPort != "8080" || summary.Ports[0].NodePort != 30080 {
		t.Errorf("unexpected port summary: %+v", summary.Ports[0])
	}
	if summary.Selector["app"] != "web" {
		t.Errorf("expected selector app=web, got %v", summary.Selector)
	}
	if summary.Age != "1h" {
		t.Errorf("expected age 1h, got %s", summary.Age)
	}
}

func TestConvertServiceLoadBalancerPending(t *testing.T) {
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default"},
		Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeLoadBalancer},
	}

	summary := convertServiceToSummary(service)
	if summary.Status != "Pending" {
		t.Errorf("expected Pending status for LoadBalancer without ingress, got %s", summary.Status)
	}

	service.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{{IP: "203.0.113.20"}}
	summary = convertServiceToSummary(service)
	if summary.Status != "Active" {
		t.Errorf("expected Active status after load balancer IP assignment, got %s", summary.Status)
	}
	if len(summary.LoadBalancerIPs) != 1 || summary.LoadBalancerIPs[0] != "203.0.113.20" {
		t.Errorf("unexpected load balancer IPs: %v", summary.LoadBalancerIPs)
	}
}

func TestApplyServiceEndpointStatus(t *testing.T) {
	summary := ServiceSummary{Type: string(corev1.ServiceTypeClusterIP), Status: "Active"}
	applyServiceEndpointStatus(&summary, 0, 0, true)
	if summary.Status != "No Endpoints" {
		t.Errorf("expected No Endpoints status, got %s", summary.Status)
	}
	if summary.ReadyEndpoints != 0 || summary.TotalEndpoints != 0 {
		t.Errorf("unexpected endpoint counts: %d/%d", summary.ReadyEndpoints, summary.TotalEndpoints)
	}

	summary = ServiceSummary{Type: string(corev1.ServiceTypeClusterIP), Status: "Active"}
	applyServiceEndpointStatus(&summary, 2, 3, true)
	if summary.Status != "Active" {
		t.Errorf("expected Active status with ready endpoints, got %s", summary.Status)
	}
	if summary.ReadyEndpoints != 2 || summary.TotalEndpoints != 3 {
		t.Errorf("expected endpoint counts 2/3, got %d/%d", summary.ReadyEndpoints, summary.TotalEndpoints)
	}

	// A failed endpoints listing must not downgrade the service status.
	summary = ServiceSummary{Type: string(corev1.ServiceTypeClusterIP), Status: "Active"}
	applyServiceEndpointStatus(&summary, 0, 0, false)
	if summary.Status != "Active" {
		t.Errorf("expected Active status when endpoints listing is unavailable, got %s", summary.Status)
	}

	// ExternalName services never own Endpoints objects.
	summary = ServiceSummary{Type: string(corev1.ServiceTypeExternalName), Status: "Active"}
	applyServiceEndpointStatus(&summary, 0, 0, true)
	if summary.Status != "Active" {
		t.Errorf("expected Active status for ExternalName service, got %s", summary.Status)
	}
}

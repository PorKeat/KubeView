package cluster

import (
	"testing"
	"time"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestConvertIngressToSummary(t *testing.T) {
	className := "nginx"
	pathType := networkingv1.PathTypePrefix
	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "web",
			Namespace:         "production",
			CreationTimestamp: metav1.NewTime(time.Now().Add(-2 * time.Hour)),
		},
		Spec: networkingv1.IngressSpec{
			IngressClassName: &className,
			TLS: []networkingv1.IngressTLS{
				{Hosts: []string{"app.example.com"}, SecretName: "app-tls"},
			},
			Rules: []networkingv1.IngressRule{
				{
					Host: "app.example.com",
					IngressRuleValue: networkingv1.IngressRuleValue{
						HTTP: &networkingv1.HTTPIngressRuleValue{
							Paths: []networkingv1.HTTPIngressPath{
								{
									Path:     "/",
									PathType: &pathType,
									Backend: networkingv1.IngressBackend{
										Service: &networkingv1.IngressServiceBackend{
											Name: "web",
											Port: networkingv1.ServiceBackendPort{Number: 80},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		Status: networkingv1.IngressStatus{
			LoadBalancer: networkingv1.IngressLoadBalancerStatus{
				Ingress: []networkingv1.IngressLoadBalancerIngress{{IP: "203.0.113.10"}},
			},
		},
	}

	summary := convertIngressToSummary(ingress)

	if summary.ClassName != "nginx" {
		t.Errorf("expected class nginx, got %s", summary.ClassName)
	}
	if summary.Status != "Ready" {
		t.Errorf("expected Ready status, got %s", summary.Status)
	}
	if len(summary.Hosts) != 1 || summary.Hosts[0] != "app.example.com" {
		t.Errorf("unexpected hosts: %v", summary.Hosts)
	}
	if len(summary.Addresses) != 1 || summary.Addresses[0] != "203.0.113.10" {
		t.Errorf("unexpected addresses: %v", summary.Addresses)
	}
	if len(summary.Paths) != 1 {
		t.Fatalf("expected 1 path, got %d", len(summary.Paths))
	}
	if summary.Paths[0].ServiceName != "web" || summary.Paths[0].ServicePort != "80" {
		t.Errorf("unexpected backend: %+v", summary.Paths[0])
	}
	if len(summary.TLS) != 1 || summary.TLS[0].SecretName != "app-tls" {
		t.Errorf("unexpected TLS: %+v", summary.TLS)
	}
}

func TestConvertIngressPendingWithoutAddress(t *testing.T) {
	ingress := &networkingv1.Ingress{ObjectMeta: metav1.ObjectMeta{Name: "pending"}}
	if summary := convertIngressToSummary(ingress); summary.Status != "Pending" {
		t.Errorf("expected Pending status, got %s", summary.Status)
	}
}

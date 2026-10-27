package cluster

import (
	"context"
	"errors"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"k8s.io/apimachinery/pkg/runtime/schema"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"
	k8sfake "k8s.io/client-go/kubernetes/fake"
)

func testConnectivityService() *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"},
		Spec: corev1.ServiceSpec{
			Selector:  map[string]string{"app": "web"},
			ClusterIP: "10.96.0.20",
			Ports: []corev1.ServicePort{
				{Name: "http", Port: 80, TargetPort: intstrFromInt(8080), Protocol: corev1.ProtocolTCP},
			},
		},
	}
}

func intstrFromInt(value int) (result intstr.IntOrString) {
	return intstr.FromInt32(int32(value))
}

func testConnectivityPod() *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "web-0", Namespace: "production", Labels: map[string]string{"app": "web"}},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{Name: "web", Ports: []corev1.ContainerPort{{Name: "http", ContainerPort: 8080}}},
			},
		},
		Status: corev1.PodStatus{
			Phase:      corev1.PodRunning,
			Conditions: []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionTrue}},
		},
	}
}

func testConnectivityEndpoints() *corev1.Endpoints {
	return &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"},
		Subsets: []corev1.EndpointSubset{
			{
				Addresses: []corev1.EndpointAddress{{IP: "10.244.0.12", TargetRef: &corev1.ObjectReference{Kind: "Pod", Name: "web-0"}}},
				Ports:     []corev1.EndpointPort{{Name: "http", Port: 8080, Protocol: corev1.ProtocolTCP}},
			},
		},
	}
}

func testCoreDNSService() *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "kube-dns", Namespace: "kube-system"},
		Spec:       corev1.ServiceSpec{ClusterIP: "10.96.0.10"},
	}
}

func withDiagnosticProbes(t *testing.T) {
	t.Helper()
	originalDNS := serviceDNSLookup
	originalProbe := serviceHTTPProbe
	serviceDNSLookup = func(ctx context.Context, dnsServer, fqdn string) ([]string, error) {
		return []string{"10.96.0.20"}, nil
	}
	serviceHTTPProbe = func(ctx context.Context, client kubernetes.Interface, namespace, serviceName, scheme, port, path string) (string, error) {
		return "HTTP proxy request succeeded with 2 response bytes", nil
	}
	t.Cleanup(func() {
		serviceDNSLookup = originalDNS
		serviceHTTPProbe = originalProbe
	})
}

func TestDiagnoseServiceHealthy(t *testing.T) {
	withDiagnosticProbes(t)
	manager := newFakeManager(k8sfake.NewSimpleClientset(
		testConnectivityService(),
		testConnectivityPod(),
		testConnectivityEndpoints(),
		testCoreDNSService(),
	))

	result, err := manager.DiagnoseService(context.Background(), DiagnoseServiceParams{
		ContextName: "test",
		Namespace:   "production",
		ServiceName: "web",
		ProbePort:   "http",
	})
	if err != nil {
		t.Fatalf("DiagnoseService failed: %v", err)
	}
	if result.Summary != "Healthy" {
		t.Errorf("expected Healthy summary, got %s: %+v", result.Summary, result.Checks)
	}
	if result.DNSName != "web.production.svc.cluster.local" {
		t.Errorf("unexpected DNS name: %s", result.DNSName)
	}
	for _, check := range result.Checks {
		if check.Status == "fail" {
			t.Errorf("unexpected failing check: %+v", check)
		}
	}
}

func TestDiagnoseServiceReportsMissingEndpoints(t *testing.T) {
	withDiagnosticProbes(t)
	manager := newFakeManager(k8sfake.NewSimpleClientset(
		testConnectivityService(),
		testConnectivityPod(),
		testCoreDNSService(),
	))

	result, err := manager.DiagnoseService(context.Background(), DiagnoseServiceParams{
		ContextName: "test",
		Namespace:   "production",
		ServiceName: "web",
	})
	if err != nil {
		t.Fatalf("DiagnoseService failed: %v", err)
	}
	if result.Summary != "Failing" {
		t.Errorf("expected Failing summary, got %s", result.Summary)
	}
	found := false
	for _, check := range result.Checks {
		if check.ID == "endpoints" && check.Status == "fail" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected failing endpoints check, got %+v", result.Checks)
	}
}

func TestDiagnoseServiceWarnsOnDenyAllPolicy(t *testing.T) {
	withDiagnosticProbes(t)
	policy := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{Name: "default-deny", Namespace: "production"},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{MatchLabels: map[string]string{"app": "web"}},
			PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
		},
	}
	manager := newFakeManager(k8sfake.NewSimpleClientset(
		testConnectivityService(),
		testConnectivityPod(),
		testConnectivityEndpoints(),
		testCoreDNSService(),
		policy,
	))

	result, err := manager.DiagnoseService(context.Background(), DiagnoseServiceParams{
		ContextName: "test",
		Namespace:   "production",
		ServiceName: "web",
	})
	if err != nil {
		t.Fatalf("DiagnoseService failed: %v", err)
	}
	if result.Summary != "Degraded" {
		t.Errorf("expected Degraded summary, got %s", result.Summary)
	}
	for _, check := range result.Checks {
		if check.ID == "networkpolicy" {
			if check.Status != "warning" {
				t.Errorf("expected networkpolicy warning, got %+v", check)
			}
			return
		}
	}
	t.Errorf("networkpolicy check not found: %+v", result.Checks)
}

func TestCheckServicePortMappingNamedTargetPort(t *testing.T) {
	service := &corev1.Service{
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{
				{Name: "http-webhook", Port: 7000, TargetPort: intstr.FromString("webhook")},
			},
		},
	}
	pod := corev1.Pod{
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{Ports: []corev1.ContainerPort{{Name: "webhook", ContainerPort: 7000}}},
			},
		},
	}
	endpoints := &corev1.Endpoints{
		Subsets: []corev1.EndpointSubset{
			{Ports: []corev1.EndpointPort{{Name: "http-webhook", Port: 7000}}},
		},
	}

	check := checkServicePortMapping(service, endpoints, []corev1.Pod{pod}, true)
	if check.Status != "pass" {
		t.Errorf("expected named targetPort mapping to pass, got %+v", check)
	}
}

func TestInterpretServiceProbe(t *testing.T) {
	message, err := interpretServiceProbe(200, []byte("ok"), nil)
	if err != nil || !strings.Contains(message, "status 200") {
		t.Errorf("unexpected 200 probe result: %q %v", message, err)
	}

	message, err = interpretServiceProbe(404, nil, errors.New("not found"))
	if err != nil || !strings.Contains(message, "status 404") {
		t.Errorf("expected 404 to count as reachable, got %q %v", message, err)
	}

	if _, err = interpretServiceProbe(403, nil, errors.New("forbidden")); err == nil {
		t.Error("expected 403 to remain a permission error")
	}

	if _, err = interpretServiceProbe(0, nil, errors.New("connection refused")); err == nil {
		t.Error("expected connection failure to remain an error")
	}
}

func TestClassifyServiceProbeFailure(t *testing.T) {
	status, _ := classifyServiceProbeFailure(
		apierrors.NewNotFound(schema.GroupResource{Resource: "services/proxy"}, "web"),
	)
	if status != "skipped" {
		t.Errorf("expected NotFound probe to be skipped, got %s", status)
	}

	status, _ = classifyServiceProbeFailure(
		apierrors.NewForbidden(schema.GroupResource{Resource: "services/proxy"}, "web", errors.New("denied")),
	)
	if status != "skipped" {
		t.Errorf("expected Forbidden probe to be skipped, got %s", status)
	}

	status, _ = classifyServiceProbeFailure(errors.New("connection refused"))
	if status != "fail" {
		t.Errorf("expected generic probe error to fail, got %s", status)
	}
}

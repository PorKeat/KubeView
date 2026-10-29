package cluster

import (
	"context"
	"testing"
	"time"

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	coordinationv1 "k8s.io/api/coordination/v1"
	corev1 "k8s.io/api/core/v1"
	nodev1 "k8s.io/api/node/v1"
	policyv1 "k8s.io/api/policy/v1"
	schedulingv1 "k8s.io/api/scheduling/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes/fake"
)

func TestListSimpleResourcesRC2(t *testing.T) {
	now := time.Now().Add(-5 * time.Minute)
	minReplicas := int32(1)
	holder := "leader-1"
	leaseDuration := int32(30)
	leaseRenew := metav1.NewMicroTime(now)
	minAvailable := intstr.FromInt(1)

	client := fake.NewSimpleClientset(
		&autoscalingv2.HorizontalPodAutoscaler{
			ObjectMeta: simpleTestMeta("web-hpa", "default", now),
			Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
				MinReplicas: &minReplicas,
				MaxReplicas: 4,
				ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
					Kind: "Deployment",
					Name: "web",
				},
			},
			Status: autoscalingv2.HorizontalPodAutoscalerStatus{
				CurrentReplicas: 1,
				DesiredReplicas: 2,
			},
		},
		&policyv1.PodDisruptionBudget{
			ObjectMeta: simpleTestMeta("web-pdb", "default", now),
			Spec: policyv1.PodDisruptionBudgetSpec{
				MinAvailable: &minAvailable,
			},
			Status: policyv1.PodDisruptionBudgetStatus{
				CurrentHealthy: 1,
				DesiredHealthy: 1,
				ExpectedPods:   1,
			},
		},
		&corev1.ResourceQuota{
			ObjectMeta: simpleTestMeta("team-quota", "default", now),
			Status: corev1.ResourceQuotaStatus{
				Hard: corev1.ResourceList{
					corev1.ResourcePods: resource.MustParse("5"),
				},
				Used: corev1.ResourceList{
					corev1.ResourcePods: resource.MustParse("2"),
				},
			},
		},
		&corev1.LimitRange{
			ObjectMeta: simpleTestMeta("limits", "default", now),
			Spec: corev1.LimitRangeSpec{
				Limits: []corev1.LimitRangeItem{{
					Type: corev1.LimitTypeContainer,
				}},
			},
		},
		&schedulingv1.PriorityClass{
			ObjectMeta:    simpleTestMeta("high-priority", "", now),
			Value:         1000,
			GlobalDefault: true,
		},
		&nodev1.RuntimeClass{
			ObjectMeta: simpleTestMeta("gvisor", "", now),
			Handler:    "runsc",
		},
		&coordinationv1.Lease{
			ObjectMeta: simpleTestMeta("leader-election", "kube-system", now),
			Spec: coordinationv1.LeaseSpec{
				HolderIdentity:       &holder,
				LeaseDurationSeconds: &leaseDuration,
				RenewTime:            &leaseRenew,
			},
		},
	)
	manager := newFakeManager(client)
	ctx := context.Background()

	tests := []struct {
		kind       string
		wantStatus string
		wantKey    string
		wantValue  string
	}{
		{"horizontalpodautoscalers", "1/2 replicas", "target", "Deployment/web"},
		{"poddisruptionbudgets", "1/1 healthy", "minAvailable", "1"},
		{"resourcequotas", "1 constraints", "hard", "pods=5"},
		{"limitranges", "1 limits", "types", "Container"},
		{"priorityclasses", "Default", "value", "1000"},
		{"runtimeclasses", "Configured", "handler", "runsc"},
		{"leases", "Expired", "holder", "leader-1"},
	}

	for _, test := range tests {
		t.Run(test.kind, func(t *testing.T) {
			res, err := manager.ListSimpleResources(ctx, "test", test.kind, "all")
			if err != nil {
				t.Fatal(err)
			}
			if res.TotalCount != 1 || len(res.Items) != 1 {
				t.Fatalf("expected one item, got %+v", res)
			}
			item := res.Items[0]
			if item.Status != test.wantStatus {
				t.Fatalf("status = %q, want %q", item.Status, test.wantStatus)
			}
			if item.Details[test.wantKey] != test.wantValue {
				t.Fatalf("%s = %q, want %q (details %+v)", test.wantKey, item.Details[test.wantKey], test.wantValue, item.Details)
			}
		})
	}

	counts := manager.CountSimpleResources(ctx, "test")
	if counts.HorizontalPodAutoscalers != 1 ||
		counts.PodDisruptionBudgets != 1 ||
		counts.ResourceQuotas != 1 ||
		counts.LimitRanges != 1 ||
		counts.PriorityClasses != 1 ||
		counts.RuntimeClasses != 1 ||
		counts.Leases != 1 {
		t.Fatalf("unexpected RC2 counts: %+v", counts)
	}
}

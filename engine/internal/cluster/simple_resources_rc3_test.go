package cluster

import (
	"context"
	"testing"
	"time"

	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestListSimpleResourcesRC3(t *testing.T) {
	now := time.Now().Add(-5 * time.Minute)
	failurePolicy := admissionregistrationv1.Fail
	sideEffect := admissionregistrationv1.SideEffectClassNone
	policyName := "require-labels"
	paramKind := admissionregistrationv1.ParamKind{APIVersion: "v1", Kind: "ConfigMap"}

	client := fake.NewSimpleClientset(
		&admissionregistrationv1.MutatingWebhookConfiguration{
			ObjectMeta: simpleTestMeta("mutating-webhook", "", now),
			Webhooks: []admissionregistrationv1.MutatingWebhook{{
				Name:          "mutate.example.com",
				FailurePolicy: &failurePolicy,
				SideEffects:   &sideEffect,
			}},
		},
		&admissionregistrationv1.ValidatingWebhookConfiguration{
			ObjectMeta: simpleTestMeta("validating-webhook", "", now),
			Webhooks: []admissionregistrationv1.ValidatingWebhook{{
				Name:          "validate.example.com",
				FailurePolicy: &failurePolicy,
				SideEffects:   &sideEffect,
			}},
		},
		&admissionregistrationv1.ValidatingAdmissionPolicy{
			ObjectMeta: simpleTestMeta("require-labels", "", now),
			Spec: admissionregistrationv1.ValidatingAdmissionPolicySpec{
				FailurePolicy: &failurePolicy,
				ParamKind:     &paramKind,
				Validations: []admissionregistrationv1.Validation{{
					Expression: "object.metadata.labels.exists('team')",
				}},
			},
		},
		&admissionregistrationv1.ValidatingAdmissionPolicyBinding{
			ObjectMeta: simpleTestMeta("require-labels-binding", "", now),
			Spec: admissionregistrationv1.ValidatingAdmissionPolicyBindingSpec{
				PolicyName:        policyName,
				ValidationActions: []admissionregistrationv1.ValidationAction{admissionregistrationv1.Deny},
			},
		},
	)
	manager := newFakeManager(client)
	ctx := context.Background()

	tests := []struct {
		kind       string
		wantStatus string
		detailKey  string
		wantValue  string
	}{
		{"mutatingwebhookconfigurations", "1 webhooks", "failurePolicy", "Fail"},
		{"validatingwebhookconfigurations", "1 webhooks", "sideEffects", "None"},
		{"validatingadmissionpolicies", "1 validations", "paramKind", "ConfigMap/v1"},
		{"validatingadmissionpolicybindings", "Bound", "actions", "Deny"},
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
			if item.Details[test.detailKey] != test.wantValue {
				t.Fatalf("%s = %q, want %q (details %+v)", test.detailKey, item.Details[test.detailKey], test.wantValue, item.Details)
			}
		})
	}

	counts := manager.CountSimpleResources(ctx, "test")
	if counts.MutatingWebhookConfigurations != 1 ||
		counts.ValidatingWebhookConfigurations != 1 ||
		counts.ValidatingAdmissionPolicies != 1 ||
		counts.ValidatingAdmissionPolicyBindings != 1 {
		t.Fatalf("unexpected RC3 counts: %+v", counts)
	}
}

var _ = metav1.Now

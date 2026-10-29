package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"

	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

func sortedStringSet(values map[string]struct{}) string {
	if len(values) == 0 {
		return "—"
	}
	items := make([]string, 0, len(values))
	for value := range values {
		items = append(items, value)
	}
	sort.Strings(items)
	return strings.Join(items, ", ")
}

func webhookPolicies(webhooks []admissionregistrationv1.MutatingWebhook) (string, string) {
	policies := make(map[string]struct{})
	sideEffects := make(map[string]struct{})
	for _, webhook := range webhooks {
		if webhook.FailurePolicy != nil {
			policies[string(*webhook.FailurePolicy)] = struct{}{}
		}
		if webhook.SideEffects != nil {
			sideEffects[string(*webhook.SideEffects)] = struct{}{}
		}
	}
	return sortedStringSet(policies), sortedStringSet(sideEffects)
}

func validatingWebhookPolicies(webhooks []admissionregistrationv1.ValidatingWebhook) (string, string) {
	policies := make(map[string]struct{})
	sideEffects := make(map[string]struct{})
	for _, webhook := range webhooks {
		if webhook.FailurePolicy != nil {
			policies[string(*webhook.FailurePolicy)] = struct{}{}
		}
		if webhook.SideEffects != nil {
			sideEffects[string(*webhook.SideEffects)] = struct{}{}
		}
	}
	return sortedStringSet(policies), sortedStringSet(sideEffects)
}

func listSimpleMutatingWebhookConfigurations(ctx context.Context, client kubernetes.Interface) (*SimpleResourceListResult, error) {
	kind := "mutatingwebhookconfigurations"
	list, err := client.AdmissionregistrationV1().MutatingWebhookConfigurations().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list mutating webhook configurations: %w", err)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		config := &list.Items[i]
		failurePolicies, sideEffects := webhookPolicies(config.Webhooks)
		tone := "healthy"
		if len(config.Webhooks) == 0 {
			tone = "muted"
		}
		items = append(items, simpleItemFromObject(
			config.Name, "", fmt.Sprintf("%d webhooks", len(config.Webhooks)),
			tone, config.CreationTimestamp.Time,
			map[string]string{
				"webhooks":      fmt.Sprintf("%d", len(config.Webhooks)),
				"failurePolicy": failurePolicies,
				"sideEffects":   sideEffects,
			},
			config.Labels, config.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil
}

func listSimpleValidatingWebhookConfigurations(ctx context.Context, client kubernetes.Interface) (*SimpleResourceListResult, error) {
	kind := "validatingwebhookconfigurations"
	list, err := client.AdmissionregistrationV1().ValidatingWebhookConfigurations().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list validating webhook configurations: %w", err)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		config := &list.Items[i]
		failurePolicies, sideEffects := validatingWebhookPolicies(config.Webhooks)
		tone := "healthy"
		if len(config.Webhooks) == 0 {
			tone = "muted"
		}
		items = append(items, simpleItemFromObject(
			config.Name, "", fmt.Sprintf("%d webhooks", len(config.Webhooks)),
			tone, config.CreationTimestamp.Time,
			map[string]string{
				"webhooks":      fmt.Sprintf("%d", len(config.Webhooks)),
				"failurePolicy": failurePolicies,
				"sideEffects":   sideEffects,
			},
			config.Labels, config.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil
}

func listSimpleValidatingAdmissionPolicies(ctx context.Context, client kubernetes.Interface) (*SimpleResourceListResult, error) {
	kind := "validatingadmissionpolicies"
	list, err := client.AdmissionregistrationV1().ValidatingAdmissionPolicies().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list validating admission policies: %w", err)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		policy := &list.Items[i]
		failurePolicy := "—"
		if policy.Spec.FailurePolicy != nil {
			failurePolicy = string(*policy.Spec.FailurePolicy)
		}
		paramKind := "—"
		if policy.Spec.ParamKind != nil {
			paramKind = fmt.Sprintf("%s/%s", policy.Spec.ParamKind.Kind, policy.Spec.ParamKind.APIVersion)
		}
		tone := "healthy"
		if len(policy.Spec.Validations) == 0 {
			tone = "muted"
		}
		items = append(items, simpleItemFromObject(
			policy.Name, "", fmt.Sprintf("%d validations", len(policy.Spec.Validations)),
			tone, policy.CreationTimestamp.Time,
			map[string]string{
				"validations":   fmt.Sprintf("%d", len(policy.Spec.Validations)),
				"failurePolicy": failurePolicy,
				"paramKind":     paramKind,
			},
			policy.Labels, policy.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil
}

func listSimpleValidatingAdmissionPolicyBindings(ctx context.Context, client kubernetes.Interface) (*SimpleResourceListResult, error) {
	kind := "validatingadmissionpolicybindings"
	list, err := client.AdmissionregistrationV1().ValidatingAdmissionPolicyBindings().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list validating admission policy bindings: %w", err)
	}
	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		binding := &list.Items[i]
		actions := make([]string, 0, len(binding.Spec.ValidationActions))
		for _, action := range binding.Spec.ValidationActions {
			actions = append(actions, string(action))
		}
		parameter := "—"
		if binding.Spec.ParamRef != nil {
			parameter = binding.Spec.ParamRef.Name
		}
		status := "Unbound"
		tone := "muted"
		if binding.Spec.PolicyName != "" {
			status = "Bound"
			tone = "healthy"
		}
		items = append(items, simpleItemFromObject(
			binding.Name, "", status, tone, binding.CreationTimestamp.Time,
			map[string]string{
				"policy":    binding.Spec.PolicyName,
				"actions":   strings.Join(actions, ", "),
				"parameter": parameter,
			},
			binding.Labels, binding.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil
}

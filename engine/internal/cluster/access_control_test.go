package cluster

import (
	"encoding/json"
	"strings"
	"testing"

	rbacv1 "k8s.io/api/rbac/v1"
)

func TestConvertRBACRulesNormalizesNilStringSlices(t *testing.T) {
	rules := convertRBACRules([]rbacv1.PolicyRule{{
		Verbs:           []string{"get"},
		NonResourceURLs: []string{"/healthz"},
	}})

	if len(rules) != 1 {
		t.Fatalf("expected one rule, got %d", len(rules))
	}

	rule := rules[0]
	fields := map[string][]string{
		"verbs":           rule.Verbs,
		"apiGroups":       rule.APIGroups,
		"resources":       rule.Resources,
		"resourceNames":   rule.ResourceNames,
		"nonResourceURLs": rule.NonResourceURLs,
	}
	for name, values := range fields {
		if values == nil {
			t.Errorf("%s must be an empty array, not null", name)
		}
	}

	payload, err := json.Marshal(rule)
	if err != nil {
		t.Fatalf("marshal rule: %v", err)
	}
	if strings.Contains(string(payload), ":null") {
		t.Errorf("serialized rule contains null: %s", payload)
	}
	if !strings.Contains(string(payload), `"resources":[]`) {
		t.Errorf("resources should serialize as []: %s", payload)
	}
}

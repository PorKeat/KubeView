package permissions

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

func BuildEffective(subject Subject, snapshot Snapshot) Effective {
	effective := Effective{
		Subject:     subject,
		Warnings:    append([]string{}, snapshot.Warnings...),
		GeneratedAt: time.Now().UTC(),
	}
	namespaceSet := make(map[string]bool, len(snapshot.Namespaces))
	for _, namespace := range snapshot.Namespaces {
		namespaceSet[namespace] = true
	}

	for _, binding := range snapshot.Bindings {
		if !bindingMatchesSubject(binding, subject) {
			continue
		}

		role, found := findRole(snapshot.Roles, binding.RoleKind, binding.Namespace, binding.RoleName)
		if !found {
			effective.Warnings = append(effective.Warnings,
				fmt.Sprintf("%s %s references missing %s/%s.", binding.Kind, binding.Name, binding.RoleKind, binding.RoleName))
			continue
		}

		scope := "namespace"
		namespace := binding.Namespace
		if binding.Kind == "ClusterRoleBinding" {
			scope = "cluster"
			namespace = ""
			namespaceSet["*"] = true
		} else if namespace != "" {
			namespaceSet[namespace] = true
		}

		for index, rule := range role.Rules {
			evidence := RuleEvidence{
				Rule:        rule,
				Scope:       scope,
				Namespace:   namespace,
				BindingKind: binding.Kind,
				BindingName: binding.Name,
				RoleKind:    binding.RoleKind,
				RoleName:    binding.RoleName,
				RuleIndex:   index,
			}
			if scope == "cluster" {
				effective.ClusterRules = append(effective.ClusterRules, evidence)
			} else {
				effective.NamespaceRules = append(effective.NamespaceRules, evidence)
			}
		}

		effective.Bindings = append(effective.Bindings, BindingEvidence{
			Kind:      binding.Kind,
			Name:      binding.Name,
			Namespace: binding.Namespace,
			RoleKind:  binding.RoleKind,
			RoleName:  binding.RoleName,
			Subjects:  binding.Subjects,
		})
	}

	effective.Namespaces = buildNamespaceAccess(namespaceSet, effective)
	return effective
}

func Explain(subject Subject, operation Operation, snapshot Snapshot) Decision {
	effective := BuildEffective(subject, snapshot)
	matched := matchingRules(effective, operation)
	warnings := append([]string{}, effective.Warnings...)

	decision := Decision{
		Allowed:      len(matched) > 0,
		MatchedRules: matched,
		Warnings:     warnings,
		SAR:          nil,
	}

	if decision.Allowed {
		decision.Reason = "allowed"
		decision.Summary = fmt.Sprintf(
			"%s can %s %s via %s.",
			subjectDescription(subject),
			operation.Verb,
			operationDescription(operation),
			firstRuleSource(matched),
		)
		decision.MatchedBindings = bindingEvidenceForRules(effective.Bindings, matched)
		return decision
	}

	decision.MatchedBindings = bindingEvidenceForRules(effective.Bindings, matchingRulesAnyNamespace(effective, operation))
	if len(effective.Bindings) == 0 {
		decision.Reason = "no_subject_binding"
		decision.Summary = fmt.Sprintf(
			"No RoleBinding or ClusterRoleBinding grants permissions to %s.",
			subjectDescription(subject),
		)
		return decision
	}

	if len(matchingRulesAnyNamespace(effective, operation)) > 0 {
		decision.Reason = "namespace_mismatch"
		decision.Summary = fmt.Sprintf(
			"A matching permission exists for %s, but not in namespace %q. Check the RoleBinding namespace.",
			subjectDescription(subject),
			displayNamespace(operation.Namespace),
		)
		return decision
	}

	if operation.ClusterScoped {
		decision.Reason = "cluster_scope_mismatch"
		decision.Summary = fmt.Sprintf(
			"%s has bindings, but none grant %s for cluster-scoped %s.",
			subjectDescription(subject),
			operation.Verb,
			operationDescription(operation),
		)
		return decision
	}

	decision.Reason = "no_matching_rule"
	decision.Summary = fmt.Sprintf(
		"%s has bindings, but no rule grants %s on %s in namespace %q.",
		subjectDescription(subject),
		operation.Verb,
		operationDescription(operation),
		displayNamespace(operation.Namespace),
	)
	return decision
}

func MatchesRule(rule Rule, operation Operation) bool {
	if !contains(rule.Verbs, operation.Verb) {
		return false
	}

	if operation.NonResourceURL != "" {
		return contains(rule.NonResourceURLs, operation.NonResourceURL)
	}

	if !groupMatches(rule.APIGroups, operation.APIGroup) {
		return false
	}
	target := operation.Resource
	if operation.Subresource != "" {
		target += "/" + operation.Subresource
	}
	if !resourceMatches(rule.Resources, target) {
		return false
	}
	if len(rule.ResourceNames) > 0 && !contains(rule.ResourceNames, operation.ResourceName) {
		return false
	}
	return true
}

func matchingRules(effective Effective, operation Operation) []RuleEvidence {
	var matched []RuleEvidence
	for _, rule := range effective.ClusterRules {
		if MatchesRule(rule.Rule, operation) {
			matched = append(matched, rule)
		}
	}
	if !operation.ClusterScoped {
		for _, rule := range effective.NamespaceRules {
			if rule.Namespace == operation.Namespace && MatchesRule(rule.Rule, operation) {
				matched = append(matched, rule)
			}
		}
	}
	return matched
}

func matchingRulesAnyNamespace(effective Effective, operation Operation) []RuleEvidence {
	all := append([]RuleEvidence{}, effective.ClusterRules...)
	all = append(all, effective.NamespaceRules...)
	var matched []RuleEvidence
	for _, rule := range all {
		if MatchesRule(rule.Rule, operation) {
			matched = append(matched, rule)
		}
	}
	return matched
}

func bindingMatchesSubject(binding Binding, subject Subject) bool {
	groups := subject.EffectiveGroups()
	for _, bindingSubject := range binding.Subjects {
		switch bindingSubject.Kind {
		case "ServiceAccount":
			if subject.Kind == SubjectServiceAccount &&
				bindingSubject.Name == subject.Name &&
				bindingSubject.Namespace == subject.Namespace {
				return true
			}
		case "User":
			if bindingSubject.Name == subject.UserName() {
				return true
			}
		case "Group":
			if contains(groups, bindingSubject.Name) {
				return true
			}
		}
	}
	return false
}

func findRole(roles []Role, kind, namespace, name string) (Role, bool) {
	for _, role := range roles {
		if role.Kind == kind && role.Name == name {
			if kind == "ClusterRole" || role.Namespace == namespace {
				return role, true
			}
		}
	}
	return Role{}, false
}

func buildNamespaceAccess(namespaceSet map[string]bool, effective Effective) []NamespaceAccess {
	namespaces := make([]string, 0, len(namespaceSet))
	for namespace := range namespaceSet {
		if namespace != "*" {
			namespaces = append(namespaces, namespace)
		}
	}
	sort.Strings(namespaces)

	result := make([]NamespaceAccess, 0, len(namespaces))
	for _, namespace := range namespaces {
		access := NamespaceAccess{Namespace: namespace}
		if len(effective.ClusterRules) > 0 {
			access.ClusterWide = true
			access.RuleCount += len(effective.ClusterRules)
			access.Verbs = append(access.Verbs, verbsFor(effective.ClusterRules)...)
		}
		for _, rule := range effective.NamespaceRules {
			if rule.Namespace == namespace {
				access.RuleCount++
				access.Verbs = append(access.Verbs, rule.Verbs...)
			}
		}
		if access.RuleCount == 0 {
			continue
		}
		access.Verbs = uniqueSorted(access.Verbs)
		result = append(result, access)
	}
	return result
}

func verbsFor(rules []RuleEvidence) []string {
	verbs := make([]string, 0)
	for _, rule := range rules {
		verbs = append(verbs, rule.Verbs...)
	}
	return verbs
}

func uniqueSorted(values []string) []string {
	seen := make(map[string]bool, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if !seen[value] {
			seen[value] = true
			result = append(result, value)
		}
	}
	sort.Strings(result)
	return result
}

func bindingEvidenceForRules(bindings []BindingEvidence, rules []RuleEvidence) []BindingEvidence {
	seen := make(map[string]bool)
	result := make([]BindingEvidence, 0)
	for _, rule := range rules {
		key := rule.BindingKind + "/" + rule.BindingName
		if seen[key] {
			continue
		}
		for _, binding := range bindings {
			if binding.Kind == rule.BindingKind && binding.Name == rule.BindingName {
				seen[key] = true
				result = append(result, binding)
				break
			}
		}
	}
	return result
}

func firstRuleSource(rules []RuleEvidence) string {
	if len(rules) == 0 {
		return "a matched role"
	}
	rule := rules[0]
	if rule.Scope == "cluster" {
		return fmt.Sprintf("%s %s", rule.BindingKind, rule.BindingName)
	}
	return fmt.Sprintf("%s %s in namespace %s", rule.BindingKind, rule.BindingName, rule.Namespace)
}

func operationDescription(operation Operation) string {
	if operation.NonResourceURL != "" {
		return operation.NonResourceURL
	}
	target := operation.Resource
	if operation.Subresource != "" {
		target += "/" + operation.Subresource
	}
	if operation.ResourceName != "" {
		target += "/" + operation.ResourceName
	}
	return target
}

func subjectDescription(subject Subject) string {
	if subject.Kind == SubjectServiceAccount {
		return fmt.Sprintf("ServiceAccount %s/%s", subject.Namespace, subject.Name)
	}
	return fmt.Sprintf("%s %s", subject.Kind, subject.Name)
}

func displayNamespace(namespace string) string {
	if namespace == "" {
		return "cluster scope"
	}
	return namespace
}

func groupMatches(groups []string, apiGroup string) bool {
	if len(groups) == 0 {
		return apiGroup == ""
	}
	for _, group := range groups {
		if group == "*" || group == apiGroup {
			return true
		}
	}
	return false
}

func resourceMatches(resources []string, target string) bool {
	for _, resource := range resources {
		if resource == "*" || resource == target {
			return true
		}
		if strings.HasSuffix(resource, "/*") &&
			strings.HasPrefix(target, strings.TrimSuffix(resource, "/*")+"/") {
			return true
		}
	}
	return false
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == "*" || value == target {
			return true
		}
	}
	return false
}

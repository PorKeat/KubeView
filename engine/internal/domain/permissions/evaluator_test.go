package permissions

import "testing"

func testSnapshotForEvaluator() Snapshot {
	return Snapshot{
		Namespaces: []string{"production", "staging"},
		Roles: []Role{
			{
				Kind: "Role", Name: "pod-reader", Namespace: "production",
				Rules: []Rule{{Verbs: []string{"get", "list"}, APIGroups: []string{""}, Resources: []string{"pods"}}},
			},
			{
				Kind: "ClusterRole", Name: "deployment-admin",
				Rules: []Rule{{Verbs: []string{"*"}, APIGroups: []string{"apps"}, Resources: []string{"deployments"}}},
			},
			{
				Kind: "ClusterRole", Name: "node-reader",
				Rules: []Rule{{Verbs: []string{"get"}, APIGroups: []string{""}, Resources: []string{"nodes"}}},
			},
		},
		Bindings: []Binding{
			{
				Kind: "RoleBinding", Name: "read-pods", Namespace: "production",
				RoleKind: "Role", RoleName: "pod-reader",
				Subjects: []BindingSubject{{Kind: "ServiceAccount", Name: "app", Namespace: "production"}},
			},
			{
				Kind: "ClusterRoleBinding", Name: "deployment-admin",
				RoleKind: "ClusterRole", RoleName: "deployment-admin",
				Subjects: []BindingSubject{{Kind: "ServiceAccount", Name: "app", Namespace: "production"}},
			},
			{
				Kind: "ClusterRoleBinding", Name: "node-readers",
				RoleKind: "ClusterRole", RoleName: "node-reader",
				Subjects: []BindingSubject{{Kind: "Group", Name: "system:serviceaccounts:production"}},
			},
		},
	}
}

func TestBuildEffectiveIncludesClusterAndNamespaceRules(t *testing.T) {
	subject := Subject{Kind: SubjectServiceAccount, Name: "app", Namespace: "production"}
	effective := BuildEffective(subject, testSnapshotForEvaluator())
	if len(effective.Bindings) != 3 {
		t.Fatalf("expected three matching bindings, got %d", len(effective.Bindings))
	}
	if len(effective.ClusterRules) != 2 {
		t.Fatalf("expected two cluster rules, got %d", len(effective.ClusterRules))
	}
	if len(effective.NamespaceRules) != 1 {
		t.Fatalf("expected one namespace rule, got %d", len(effective.NamespaceRules))
	}
	if len(effective.Namespaces) != 2 {
		t.Fatalf("expected access in both namespaces, got %+v", effective.Namespaces)
	}
}

func TestExplainAllowsWildcardClusterRule(t *testing.T) {
	subject := Subject{Kind: SubjectServiceAccount, Name: "app", Namespace: "production"}
	decision := Explain(subject, Operation{
		Namespace: "staging", Verb: "patch", APIGroup: "apps", Resource: "deployments",
	}, testSnapshotForEvaluator())
	if !decision.Allowed || decision.Reason != "allowed" {
		t.Fatalf("expected wildcard cluster rule to allow, got %+v", decision)
	}
	if len(decision.MatchedBindings) != 1 {
		t.Fatalf("expected one matched binding, got %+v", decision.MatchedBindings)
	}
}

func TestExplainReportsNamespaceMismatch(t *testing.T) {
	subject := Subject{Kind: SubjectServiceAccount, Name: "app", Namespace: "production"}
	decision := Explain(subject, Operation{
		Namespace: "staging", Verb: "get", Resource: "pods",
	}, testSnapshotForEvaluator())
	if decision.Allowed || decision.Reason != "namespace_mismatch" {
		t.Fatalf("expected namespace mismatch, got %+v", decision)
	}
}

func TestExplainReportsNoBinding(t *testing.T) {
	subject := Subject{Kind: SubjectUser, Name: "alice"}
	decision := Explain(subject, Operation{Namespace: "production", Verb: "get", Resource: "pods"}, testSnapshotForEvaluator())
	if decision.Allowed || decision.Reason != "no_subject_binding" {
		t.Fatalf("expected no binding, got %+v", decision)
	}
}

func TestExplainRequiresClusterBindingForClusterScopedResource(t *testing.T) {
	snapshot := Snapshot{
		Namespaces: []string{"production"},
		Roles: []Role{{
			Kind: "Role", Name: "pod-reader", Namespace: "production",
			Rules: []Rule{{Verbs: []string{"get"}, APIGroups: []string{""}, Resources: []string{"pods"}}},
		}},
		Bindings: []Binding{{
			Kind: "RoleBinding", Name: "read-pods", Namespace: "production",
			RoleKind: "Role", RoleName: "pod-reader",
			Subjects: []BindingSubject{{Kind: "User", Name: "alice"}},
		}},
	}
	decision := Explain(Subject{Kind: SubjectUser, Name: "alice"}, Operation{
		Verb: "get", Resource: "nodes", ClusterScoped: true,
	}, snapshot)
	if decision.Allowed || decision.Reason != "cluster_scope_mismatch" {
		t.Fatalf("expected cluster scope mismatch, got %+v", decision)
	}
}

func TestExplainAllowsResourceNameRule(t *testing.T) {
	snapshot := Snapshot{
		Roles: []Role{{Kind: "ClusterRole", Name: "secret-reader", Rules: []Rule{{
			Verbs: []string{"get"}, APIGroups: []string{""}, Resources: []string{"secrets"},
			ResourceNames: []string{"app-secret"},
		}}}},
		Bindings: []Binding{{
			Kind: "ClusterRoleBinding", Name: "read-secret", RoleKind: "ClusterRole", RoleName: "secret-reader",
			Subjects: []BindingSubject{{Kind: "User", Name: "alice"}},
		}},
	}
	allowed := Explain(Subject{Kind: SubjectUser, Name: "alice"}, Operation{
		Namespace: "production", Verb: "get", Resource: "secrets", ResourceName: "app-secret",
	}, snapshot)
	denied := Explain(Subject{Kind: SubjectUser, Name: "alice"}, Operation{
		Namespace: "production", Verb: "get", Resource: "secrets", ResourceName: "other",
	}, snapshot)
	if !allowed.Allowed {
		t.Fatalf("expected named secret access, got %+v", allowed)
	}
	if denied.Allowed {
		t.Fatalf("expected other secret denial, got %+v", denied)
	}
}

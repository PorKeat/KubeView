package permissions

import (
	"fmt"
	"strings"
	"time"
)

type SubjectKind string

const (
	SubjectUser           SubjectKind = "User"
	SubjectGroup          SubjectKind = "Group"
	SubjectServiceAccount SubjectKind = "ServiceAccount"
)

type Subject struct {
	Kind      SubjectKind
	Name      string
	Namespace string
	Groups    []string
}

func (subject Subject) EffectiveGroups() []string {
	groups := append([]string{}, subject.Groups...)
	switch subject.Kind {
	case SubjectServiceAccount:
		groups = append(groups,
			"system:serviceaccounts",
			"system:serviceaccounts:"+subject.Namespace,
			"system:authenticated",
		)
	case SubjectUser:
		groups = append(groups, "system:authenticated")
	}
	return uniqueStrings(groups)
}

func (subject Subject) UserName() string {
	if subject.Kind == SubjectServiceAccount {
		return fmt.Sprintf("system:serviceaccount:%s:%s", subject.Namespace, subject.Name)
	}
	return subject.Name
}

type Rule struct {
	Verbs           []string
	APIGroups       []string
	Resources       []string
	ResourceNames   []string
	NonResourceURLs []string
}

type Role struct {
	Kind      string
	Name      string
	Namespace string
	Rules     []Rule
}

type BindingSubject struct {
	Kind      string
	Name      string
	Namespace string
}

type Binding struct {
	Kind           string
	Name           string
	Namespace      string
	RoleKind       string
	RoleName       string
	Subjects       []BindingSubject
	SourceRoleKind string
}

type Snapshot struct {
	Roles      []Role
	Bindings   []Binding
	Namespaces []string
	Warnings   []string
}

type RuleEvidence struct {
	Rule
	Scope       string
	Namespace   string
	BindingKind string
	BindingName string
	RoleKind    string
	RoleName    string
	RuleIndex   int
}

type BindingEvidence struct {
	Kind      string
	Name      string
	Namespace string
	RoleKind  string
	RoleName  string
	Subjects  []BindingSubject
}

type NamespaceAccess struct {
	Namespace   string
	ClusterWide bool
	RuleCount   int
	Verbs       []string
}

type Effective struct {
	Subject        Subject
	ClusterRules   []RuleEvidence
	NamespaceRules []RuleEvidence
	Namespaces     []NamespaceAccess
	Bindings       []BindingEvidence
	Warnings       []string
	GeneratedAt    time.Time
}

type Operation struct {
	Namespace      string
	Verb           string
	APIGroup       string
	Resource       string
	Subresource    string
	ResourceName   string
	NonResourceURL string
	ClusterScoped  bool
}

type AccessReview struct {
	Allowed         bool
	Authoritative   bool
	Reason          string
	EvaluationError string
}

type Decision struct {
	Allowed         bool
	Reason          string
	Summary         string
	MatchedRules    []RuleEvidence
	MatchedBindings []BindingEvidence
	SAR             *AccessReview
	Warnings        []string
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]bool, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	return result
}

package kubernetes

import (
	"context"
	"fmt"
	"strings"

	authenticationv1 "k8s.io/api/authentication/v1"
	authorizationv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	legacycluster "github.com/kubeview/engine/internal/cluster"
	domainpermissions "github.com/kubeview/engine/internal/domain/permissions"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

type PermissionsAdapter struct {
	manager *legacycluster.Manager
}

func NewPermissionsAdapter(manager *legacycluster.Manager) *PermissionsAdapter {
	return &PermissionsAdapter{manager: manager}
}

func (adapter *PermissionsAdapter) ReadSnapshot(
	ctx context.Context,
	contextName string,
) (*domainpermissions.Snapshot, error) {
	result, err := adapter.manager.ListRBACResources(ctx, contextName, "all")
	if err != nil {
		return nil, err
	}

	snapshot := &domainpermissions.Snapshot{
		Roles:    make([]domainpermissions.Role, 0),
		Bindings: make([]domainpermissions.Binding, 0),
	}
	for _, item := range result.Items {
		switch item.Kind {
		case "Role", "ClusterRole":
			snapshot.Roles = append(snapshot.Roles, roleFromSummary(item))
		case "RoleBinding", "ClusterRoleBinding":
			binding, warning := bindingFromSummary(item)
			if warning != "" {
				snapshot.Warnings = append(snapshot.Warnings, warning)
			}
			snapshot.Bindings = append(snapshot.Bindings, binding)
		}
	}

	namespaces, namespaceErr := adapter.manager.ListNamespaces(ctx, contextName)
	if namespaceErr != nil {
		snapshot.Warnings = append(snapshot.Warnings,
			fmt.Sprintf("Could not list namespaces: %v", namespaceErr))
	} else {
		snapshot.Namespaces = namespaces
	}
	return snapshot, nil
}

func (adapter *PermissionsAdapter) Review(
	ctx context.Context,
	contextName string,
	subject domainpermissions.Subject,
	operation domainpermissions.Operation,
) (*domainpermissions.AccessReview, error) {
	client, _, err := adapter.manager.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	groups := subject.EffectiveGroups()
	user := ""
	switch subject.Kind {
	case domainpermissions.SubjectGroup:
		groups = append(groups, subject.Name)
	default:
		user = subject.UserName()
	}

	review := &authorizationv1.SubjectAccessReview{
		Spec: authorizationv1.SubjectAccessReviewSpec{
			User:   user,
			Groups: groups,
		},
	}
	if operation.NonResourceURL != "" {
		review.Spec.NonResourceAttributes = &authorizationv1.NonResourceAttributes{
			Path: operation.NonResourceURL,
			Verb: operation.Verb,
		}
	} else {
		namespace := operation.Namespace
		if operation.ClusterScoped {
			namespace = ""
		}
		review.Spec.ResourceAttributes = &authorizationv1.ResourceAttributes{
			Namespace:   namespace,
			Verb:        operation.Verb,
			Group:       operation.APIGroup,
			Resource:    operation.Resource,
			Subresource: operation.Subresource,
			Name:        operation.ResourceName,
		}
	}

	response, err := client.AuthorizationV1().SubjectAccessReviews().Create(ctx, review, metav1.CreateOptions{})
	if err != nil {
		return nil, err
	}
	return &domainpermissions.AccessReview{
		Allowed:         response.Status.Allowed,
		Authoritative:   true,
		Reason:          response.Status.Reason,
		EvaluationError: response.Status.EvaluationError,
	}, nil
}

func (adapter *PermissionsAdapter) CurrentIdentity(
	ctx context.Context,
	contextName string,
) (domainpermissions.Subject, error) {
	client, _, err := adapter.manager.GetClientForContext(contextName)
	if err != nil {
		return domainpermissions.Subject{}, err
	}

	review, err := client.AuthenticationV1().SelfSubjectReviews().Create(
		ctx,
		&authenticationv1.SelfSubjectReview{},
		metav1.CreateOptions{},
	)
	if err != nil {
		return domainpermissions.Subject{}, err
	}
	if review == nil {
		return domainpermissions.Subject{}, shared.NewError(
			shared.KindInternal,
			"cluster returned no identity: SelfSubjectReview response is empty",
			nil,
		)
	}

	username := strings.TrimSpace(review.Status.UserInfo.Username)
	if username == "" {
		return domainpermissions.Subject{}, shared.NewError(
			shared.KindInternal,
			"cluster returned no identity: authenticated username is empty",
			nil,
		)
	}
	return domainpermissions.Subject{
		Kind:   domainpermissions.SubjectUser,
		Name:   username,
		Groups: append([]string(nil), review.Status.UserInfo.Groups...),
	}, nil
}

func roleFromSummary(item legacycluster.RBACResourceSummary) domainpermissions.Role {
	rules := make([]domainpermissions.Rule, 0, len(item.Rules))
	for _, rule := range item.Rules {
		rules = append(rules, domainpermissions.Rule{
			Verbs:           rule.Verbs,
			APIGroups:       rule.APIGroups,
			Resources:       rule.Resources,
			ResourceNames:   rule.ResourceNames,
			NonResourceURLs: rule.NonResourceURLs,
		})
	}
	return domainpermissions.Role{
		Kind:      item.Kind,
		Name:      item.Name,
		Namespace: item.Namespace,
		Rules:     rules,
	}
}

func bindingFromSummary(item legacycluster.RBACResourceSummary) (domainpermissions.Binding, string) {
	fallbackKind := "Role"
	if item.Kind == "ClusterRoleBinding" {
		fallbackKind = "ClusterRole"
	}
	roleKind, roleName := splitRoleRef(item.RoleRef, fallbackKind)
	warning := ""
	if roleName == "" {
		warning = fmt.Sprintf("%s %s has an empty roleRef.", item.Kind, item.Name)
	}

	subjects := make([]domainpermissions.BindingSubject, 0, len(item.Subjects))
	for _, subject := range item.Subjects {
		subjects = append(subjects, domainpermissions.BindingSubject{
			Kind:      subject.Kind,
			Name:      subject.Name,
			Namespace: subject.Namespace,
		})
	}
	return domainpermissions.Binding{
		Kind:      item.Kind,
		Name:      item.Name,
		Namespace: item.Namespace,
		RoleKind:  roleKind,
		RoleName:  roleName,
		Subjects:  subjects,
	}, warning
}

func splitRoleRef(ref, fallbackKind string) (string, string) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return fallbackKind, ""
	}
	parts := strings.SplitN(ref, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return fallbackKind, ref
}

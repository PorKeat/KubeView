package permissions

import (
	"context"
	"errors"
	"slices"
	"testing"

	domainpermissions "github.com/kubeview/engine/internal/domain/permissions"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

type fakeSnapshots struct {
	snapshot *domainpermissions.Snapshot
}

func (fake fakeSnapshots) ReadSnapshot(context.Context, string) (*domainpermissions.Snapshot, error) {
	return fake.snapshot, nil
}

type fakeReviewer struct {
	review *domainpermissions.AccessReview
}

func (fake fakeReviewer) Review(context.Context, string, domainpermissions.Subject, domainpermissions.Operation) (*domainpermissions.AccessReview, error) {
	return fake.review, nil
}

type fakeIdentity struct {
	subject     domainpermissions.Subject
	err         error
	contextName string
}

func (fake *fakeIdentity) CurrentIdentity(
	_ context.Context,
	contextName string,
) (domainpermissions.Subject, error) {
	fake.contextName = contextName
	return fake.subject, fake.err
}

func testSnapshot() *domainpermissions.Snapshot {
	return &domainpermissions.Snapshot{
		Namespaces: []string{"production", "staging"},
		Roles: []domainpermissions.Role{{
			Kind: "ClusterRole", Name: "pod-reader",
			Rules: []domainpermissions.Rule{{
				Verbs: []string{"get", "list"}, APIGroups: []string{""}, Resources: []string{"pods"},
			}},
		}},
		Bindings: []domainpermissions.Binding{{
			Kind: "ClusterRoleBinding", Name: "read-pods",
			RoleKind: "ClusterRole", RoleName: "pod-reader",
			Subjects: []domainpermissions.BindingSubject{{
				Kind: "ServiceAccount", Name: "default", Namespace: "default",
			}},
		}},
	}
}

func TestEffectiveBuildsNamespaceAccess(t *testing.T) {
	service := New(fakeSnapshots{snapshot: testSnapshot()}, fakeReviewer{}, nil)
	subject := domainpermissions.Subject{
		Kind: domainpermissions.SubjectServiceAccount, Name: "default", Namespace: "default",
	}
	result, err := service.Effective(context.Background(), "prod", subject)
	if err != nil {
		t.Fatalf("Effective: %v", err)
	}
	if len(result.ClusterRules) != 1 {
		t.Fatalf("expected one cluster rule, got %d", len(result.ClusterRules))
	}
	if len(result.Namespaces) != 2 {
		t.Fatalf("expected namespace access for two namespaces, got %+v", result.Namespaces)
	}
}

func TestExplainUsesAuthoritativeSAR(t *testing.T) {
	service := New(
		fakeSnapshots{snapshot: testSnapshot()},
		fakeReviewer{review: &domainpermissions.AccessReview{
			Allowed: true, Authoritative: true, Reason: "RBAC: allowed",
		}},
		nil,
	)
	subject := domainpermissions.Subject{
		Kind: domainpermissions.SubjectServiceAccount, Name: "default", Namespace: "default",
	}
	decision, err := service.Explain(context.Background(), "prod", subject, domainpermissions.Operation{
		Namespace: "production", Verb: "delete", APIGroup: "", Resource: "pods",
	})
	if err != nil {
		t.Fatalf("Explain: %v", err)
	}
	if !decision.Allowed || decision.Reason != "sar_allowed" {
		t.Fatalf("expected SAR to override local denial, got %+v", decision)
	}
}

func TestExplainRejectsInvalidSubject(t *testing.T) {
	service := New(fakeSnapshots{snapshot: testSnapshot()}, nil, nil)
	_, err := service.Effective(context.Background(), "prod", domainpermissions.Subject{
		Kind: domainpermissions.SubjectServiceAccount, Name: "default",
	})
	if err == nil {
		t.Fatal("expected validation error for missing service account namespace")
	}
}

func TestCurrentIdentityReturnsClusterUserAndGroups(t *testing.T) {
	reader := &fakeIdentity{subject: domainpermissions.Subject{
		Kind:   domainpermissions.SubjectUser,
		Name:   "alice@example.com",
		Groups: []string{"system:authenticated", "developers"},
	}}
	service := New(fakeSnapshots{snapshot: testSnapshot()}, nil, reader)

	subject, err := service.CurrentIdentity(context.Background(), "prod")
	if err != nil {
		t.Fatalf("CurrentIdentity: %v", err)
	}
	if subject.Kind != domainpermissions.SubjectUser {
		t.Fatalf("expected User kind, got %q", subject.Kind)
	}
	if subject.Name != "alice@example.com" {
		t.Fatalf("unexpected name %q", subject.Name)
	}
	if !slices.Equal(subject.Groups, []string{"system:authenticated", "developers"}) {
		t.Fatalf("unexpected groups %v", subject.Groups)
	}
	if reader.contextName != "prod" {
		t.Fatalf("expected context prod, got %q", reader.contextName)
	}
}

func TestCurrentIdentityRejectsEmptyUsername(t *testing.T) {
	service := New(fakeSnapshots{snapshot: testSnapshot()}, nil, &fakeIdentity{
		subject: domainpermissions.Subject{Kind: domainpermissions.SubjectUser, Name: "  "},
	})

	_, err := service.CurrentIdentity(context.Background(), "prod")
	if err == nil {
		t.Fatal("expected error for empty username")
	}
	var domainErr *shared.Error
	if !errors.As(err, &domainErr) || domainErr.Kind != shared.KindInternal {
		t.Fatalf("expected internal domain error, got %v", err)
	}
}

func TestCurrentIdentityPropagatesReaderError(t *testing.T) {
	wantErr := errors.New("cluster unavailable")
	service := New(fakeSnapshots{snapshot: testSnapshot()}, nil, &fakeIdentity{err: wantErr})

	_, err := service.CurrentIdentity(context.Background(), "prod")
	if !errors.Is(err, wantErr) {
		t.Fatalf("expected reader error, got %v", err)
	}
}

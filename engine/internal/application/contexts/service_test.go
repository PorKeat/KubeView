package contexts

import (
	"context"
	"testing"

	domaincontexts "github.com/kubeview/engine/internal/domain/contexts"
)

type fakeRepository struct {
	listResult   *domaincontexts.ListResult
	switchResult *domaincontexts.SwitchResult
	namespaces   []string
}

func (fake fakeRepository) List(context.Context) (*domaincontexts.ListResult, error) {
	return fake.listResult, nil
}

func (fake fakeRepository) Switch(context.Context, string) (*domaincontexts.SwitchResult, error) {
	return fake.switchResult, nil
}

func (fake fakeRepository) ListNamespaces(context.Context, string) ([]string, error) {
	return fake.namespaces, nil
}

func TestSwitchNotifiesObserverAfterSuccess(t *testing.T) {
	var observed string
	service := New(
		fakeRepository{switchResult: &domaincontexts.SwitchResult{ActiveContext: "prod", Status: "ready"}},
		ObserverFunc(func(_ context.Context, contextName string) {
			observed = contextName
		}),
	)

	result, err := service.Switch(context.Background(), "prod")
	if err != nil {
		t.Fatalf("Switch: %v", err)
	}
	if result.ActiveContext != "prod" {
		t.Errorf("active context = %q", result.ActiveContext)
	}
	if observed != "prod" {
		t.Errorf("observer got %q, want prod", observed)
	}
}

func TestSwitchRejectsBlankContext(t *testing.T) {
	service := New(fakeRepository{}, nil)
	if _, err := service.Switch(context.Background(), " "); err == nil {
		t.Fatal("expected validation error for blank context")
	}
}

func TestListNamespacesDelegates(t *testing.T) {
	service := New(fakeRepository{namespaces: []string{"default", "kube-system"}}, nil)
	namespaces, err := service.ListNamespaces(context.Background(), "")
	if err != nil {
		t.Fatalf("ListNamespaces: %v", err)
	}
	if len(namespaces) != 2 || namespaces[1] != "kube-system" {
		t.Errorf("unexpected namespaces: %v", namespaces)
	}
}

package resources

import (
	"context"
	"testing"

	domainresources "github.com/kubeview/engine/internal/domain/resources"
)

type fakeRepository struct {
	getCalls        int
	applyCalls      int
	deleteCalls     int
	capabilityCalls int
	lastRef         domainresources.Ref
	lastApply       domainresources.ApplyRequest
	getResult       *domainresources.GetResult
	applyResult     *domainresources.ApplyResult
	capabilities    *domainresources.Capabilities
}

func (fake *fakeRepository) Get(_ context.Context, _ string, ref domainresources.Ref) (*domainresources.GetResult, error) {
	fake.getCalls++
	fake.lastRef = ref
	return fake.getResult, nil
}

func (fake *fakeRepository) Apply(_ context.Context, _ string, request domainresources.ApplyRequest) (*domainresources.ApplyResult, error) {
	fake.applyCalls++
	fake.lastApply = request
	return fake.applyResult, nil
}

func (fake *fakeRepository) Delete(_ context.Context, _ string, ref domainresources.Ref) error {
	fake.deleteCalls++
	fake.lastRef = ref
	return nil
}

func (fake *fakeRepository) Capabilities(_ context.Context, _ string, ref domainresources.Ref) (*domainresources.Capabilities, error) {
	fake.capabilityCalls++
	fake.lastRef = ref
	return fake.capabilities, nil
}

var validRef = domainresources.Ref{
	APIVersion: "apps/v1",
	Kind:       "Deployment",
	Resource:   "deployments",
	Name:       "web",
	Namespace:  "apps",
}

func TestGetValidatesRequiredFields(t *testing.T) {
	tests := []struct {
		name string
		ref  domainresources.Ref
	}{
		{name: "apiVersion", ref: withRef(validRef, func(ref *domainresources.Ref) { ref.APIVersion = " " })},
		{name: "kind", ref: withRef(validRef, func(ref *domainresources.Ref) { ref.Kind = "" })},
		{name: "resource", ref: withRef(validRef, func(ref *domainresources.Ref) { ref.Resource = "" })},
		{name: "name", ref: withRef(validRef, func(ref *domainresources.Ref) { ref.Name = "" })},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			repository := &fakeRepository{getResult: &domainresources.GetResult{}}
			service := New(repository)
			if _, err := service.Get(context.Background(), "prod", testCase.ref); err == nil {
				t.Fatalf("expected validation error for %s", testCase.name)
			}
			if repository.getCalls != 0 {
				t.Fatalf("repository should not be called for invalid ref")
			}
		})
	}
}

func TestGetDelegatesValidRef(t *testing.T) {
	repository := &fakeRepository{
		getResult: &domainresources.GetResult{Ref: validRef, YAML: "kind: Deployment"},
	}
	service := New(repository)
	result, err := service.Get(context.Background(), "prod", validRef)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if result.YAML != "kind: Deployment" || repository.getCalls != 1 {
		t.Fatalf("unexpected result or call count: %+v, %d", result, repository.getCalls)
	}
	if repository.lastRef != validRef {
		t.Fatalf("ref not forwarded: %+v", repository.lastRef)
	}
}

func TestDeleteValidatesName(t *testing.T) {
	repository := &fakeRepository{}
	service := New(repository)
	ref := validRef
	ref.Name = ""
	if err := service.Delete(context.Background(), "prod", ref); err == nil {
		t.Fatal("expected validation error for missing name")
	}
	if repository.deleteCalls != 0 {
		t.Fatal("repository should not be called for invalid ref")
	}
}

func TestApplyRequiresYAML(t *testing.T) {
	repository := &fakeRepository{}
	service := New(repository)
	_, err := service.Apply(context.Background(), "prod", domainresources.ApplyRequest{YAML: "  \n"})
	if err == nil {
		t.Fatal("expected validation error for empty yaml")
	}
	if repository.applyCalls != 0 {
		t.Fatal("repository should not be called for empty yaml")
	}
}

func TestApplyDelegatesRequest(t *testing.T) {
	repository := &fakeRepository{
		applyResult: &domainresources.ApplyResult{Ref: validRef, Created: true, YAML: "kind: Deployment"},
	}
	service := New(repository)
	request := domainresources.ApplyRequest{
		YAML: "kind: Deployment", Resource: "deployments", Name: "web",
		Namespace: "apps", DryRun: true,
	}
	result, err := service.Apply(context.Background(), "prod", request)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if !result.Created || repository.lastApply != request {
		t.Fatalf("unexpected apply result or request: %+v, %+v", result, repository.lastApply)
	}
}

func TestCapabilitiesAllowsEmptyName(t *testing.T) {
	repository := &fakeRepository{
		capabilities: &domainresources.Capabilities{Get: true, Reasons: map[string]string{"delete": "denied"}},
	}
	service := New(repository)
	ref := validRef
	ref.Name = ""
	result, err := service.Capabilities(context.Background(), "prod", ref)
	if err != nil {
		t.Fatalf("Capabilities: %v", err)
	}
	if !result.Get || result.Delete || repository.capabilityCalls != 1 {
		t.Fatalf("unexpected capabilities result: %+v", result)
	}
	if repository.lastRef.Name != "" {
		t.Fatalf("expected anonymous capability ref, got %+v", repository.lastRef)
	}
}

func TestCapabilitiesRequiresResourceTarget(t *testing.T) {
	service := New(&fakeRepository{})
	ref := validRef
	ref.Resource = ""
	if _, err := service.Capabilities(context.Background(), "prod", ref); err == nil {
		t.Fatal("expected validation error for missing resource")
	}
}

func TestValidateRequiresRepository(t *testing.T) {
	if err := New(nil).Validate(); err == nil {
		t.Fatal("expected validation error for nil repository")
	}
	if err := New(&fakeRepository{}).Validate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func withRef(ref domainresources.Ref, mutate func(*domainresources.Ref)) domainresources.Ref {
	mutate(&ref)
	return ref
}

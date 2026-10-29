package gitops

import (
	"context"
	"errors"
	"testing"
	"time"

	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
)

type fakeManifestSource struct {
	manifests []domaingitops.Manifest
	issues    []domaingitops.ManifestIssue
	err       error
	calls     int
	lastPath  string
}

func (fake *fakeManifestSource) Load(
	_ context.Context,
	root string,
) ([]domaingitops.Manifest, []domaingitops.ManifestIssue, error) {
	fake.calls++
	fake.lastPath = root
	return fake.manifests, fake.issues, fake.err
}

type fakeLiveReader struct {
	current      string
	currentErr   error
	currentCalls int
	resources    map[string]*domaingitops.LiveResource
	errs         map[string]error
	calls        []domaingitops.Ref
	contexts     []string
}

func (fake *fakeLiveReader) CurrentContext(_ context.Context) (string, error) {
	fake.currentCalls++
	return fake.current, fake.currentErr
}

func (fake *fakeLiveReader) Read(
	_ context.Context,
	contextName string,
	ref domaingitops.Ref,
) (*domaingitops.LiveResource, error) {
	fake.calls = append(fake.calls, ref)
	fake.contexts = append(fake.contexts, contextName)
	key := liveKey(ref)
	return fake.resources[key], fake.errs[key]
}

func liveKey(ref domaingitops.Ref) string {
	return ref.APIVersion + "/" + ref.Kind + "/" + ref.Namespace + "/" + ref.Name
}

func testManifest(
	apiVersion string,
	kind string,
	name string,
	namespace string,
	sourceFile string,
	desired map[string]interface{},
) domaingitops.Manifest {
	return domaingitops.Manifest{
		APIVersion:  apiVersion,
		Kind:        kind,
		Name:        name,
		Namespace:   namespace,
		SourceFile:  sourceFile,
		Desired:     desired,
		DesiredYAML: "apiVersion: " + apiVersion + "\nkind: " + kind + "\n",
	}
}

func TestScanValidatesPath(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "empty", path: "  "},
		{name: "relative", path: "manifests/app"},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			source := &fakeManifestSource{}
			reader := &fakeLiveReader{current: "prod"}
			service := New(source, reader)

			if _, err := service.Scan(context.Background(), ScanRequest{Path: testCase.path}); err == nil {
				t.Fatal("expected path validation error")
			}
			if source.calls != 0 || reader.currentCalls != 0 {
				t.Fatal("ports must not be called when the path is invalid")
			}
		})
	}
}

func TestScanBuildsDeduplicatedReport(t *testing.T) {
	root := t.TempDir()
	deploymentDesired := map[string]interface{}{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata":   map[string]interface{}{"name": "web", "namespace": "prod"},
	}
	duplicate := testManifest(
		"apps/v1", "Deployment", "web", "prod", "b-deployment.yaml", deploymentDesired,
	)
	duplicate.DesiredYAML = "duplicate"
	changedDesired := map[string]interface{}{
		"spec": map[string]interface{}{"replicas": float64(2)},
	}
	missingDesired := map[string]interface{}{
		"metadata": map[string]interface{}{"name": "settings", "namespace": "prod"},
	}
	errorDesired := map[string]interface{}{
		"metadata": map[string]interface{}{"name": "credentials", "namespace": "prod"},
	}

	source := &fakeManifestSource{
		manifests: []domaingitops.Manifest{
			testManifest("apps/v1", "Deployment", "web", "prod", "a-deployment.yaml", deploymentDesired),
			duplicate,
			testManifest("v1", "Service", "api", "prod", "c-service.yaml", changedDesired),
			testManifest("v1", "ConfigMap", "settings", "prod", "d-configmap.yaml", missingDesired),
			testManifest("v1", "Secret", "credentials", "prod", "e-secret.yaml", errorDesired),
		},
		issues: []domaingitops.ManifestIssue{{
			SourceFile: "f-invalid.yaml",
			Message:    "invalid YAML",
		}},
	}
	reader := &fakeLiveReader{
		current: "current-ctx",
		resources: map[string]*domaingitops.LiveResource{
			liveKey(deploymentDesiredRef()): {
				Resource:  "deployments",
				Namespace: "prod",
				Found:     true,
				Object:    deploymentDesired,
				YAML:      "live deployment",
			},
			liveKey(domaingitops.Ref{
				APIVersion: "v1", Kind: "Service", Name: "api", Namespace: "prod",
			}): {
				Resource:  "services",
				Namespace: "prod",
				Found:     true,
				Object:    map[string]interface{}{"spec": map[string]interface{}{"replicas": int64(3)}},
			},
			liveKey(domaingitops.Ref{
				APIVersion: "v1", Kind: "ConfigMap", Name: "settings", Namespace: "prod",
			}): {
				Resource:  "configmaps",
				Namespace: "prod",
				Found:     false,
			},
			liveKey(domaingitops.Ref{
				APIVersion: "v1", Kind: "Secret", Name: "credentials", Namespace: "prod",
			}): {
				Resource:  "secrets",
				Namespace: "prod",
			},
		},
		errs: map[string]error{
			liveKey(domaingitops.Ref{
				APIVersion: "v1", Kind: "Secret", Name: "credentials", Namespace: "prod",
			}): errors.New("permission denied"),
		},
	}

	report, err := New(source, reader).Scan(context.Background(), ScanRequest{Path: root})
	if err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if source.lastPath != root {
		t.Fatalf("source path = %q, want %q", source.lastPath, root)
	}
	if report.ContextName != "current-ctx" || reader.currentCalls != 1 {
		t.Fatalf("unexpected context resolution: %q calls=%d", report.ContextName, reader.currentCalls)
	}
	if report.Path != root || report.ScannedAt.IsZero() || report.ScannedAt.Location() != time.UTC {
		t.Fatalf("unexpected report metadata: path=%q scannedAt=%v", report.Path, report.ScannedAt)
	}
	if report.Total != 5 || report.Clean != 1 || report.Changed != 1 ||
		report.Missing != 1 || report.Errors != 2 {
		t.Fatalf("unexpected summary: %+v", report)
	}
	if len(reader.calls) != 3 {
		t.Fatalf("expected 3 live reads after Secret exclusion and de-duplication, got %d", len(reader.calls))
	}
	for _, contextName := range reader.contexts {
		if contextName != "current-ctx" {
			t.Fatalf("reader received context %q", contextName)
		}
	}

	if len(report.Resources) != 5 {
		t.Fatalf("expected 5 resources entries, got %d", len(report.Resources))
	}
	if report.Resources[0].SourceFile != "a-deployment.yaml" ||
		report.Resources[0].Status != domaingitops.StatusClean {
		t.Fatalf("unexpected first resource: %+v", report.Resources[0])
	}
	if report.Resources[0].DesiredYAML == "duplicate" {
		t.Fatal("de-duplication should keep the first manifest")
	}
	if report.Resources[1].Status != domaingitops.StatusChanged ||
		report.Resources[2].Status != domaingitops.StatusMissing ||
		report.Resources[3].Status != domaingitops.StatusError ||
		report.Resources[4].Status != domaingitops.StatusError {
		t.Fatalf("unexpected ordered statuses: %+v", report.Resources)
	}
	if report.Resources[2].Resource != "configmaps" ||
		report.Resources[2].Namespace != "prod" {
		t.Fatalf("missing resource lost resolved metadata: %+v", report.Resources[2])
	}
	if report.Resources[3].Kind != "Secret" ||
		report.Resources[3].Message != "Secret manifests are excluded from GitOps drift until value redaction is implemented." {
		t.Fatalf("excluded Secret lost its audit entry: %+v", report.Resources[3])
	}
	if report.Resources[4].Message != "invalid YAML" {
		t.Fatalf("unexpected source issue entry: %+v", report.Resources[4])
	}
}

func deploymentDesiredRef() domaingitops.Ref {
	return domaingitops.Ref{
		APIVersion: "apps/v1", Kind: "Deployment", Name: "web", Namespace: "prod",
	}
}

func TestScanUsesRequestedContext(t *testing.T) {
	source := &fakeManifestSource{}
	reader := &fakeLiveReader{current: "current-ctx"}

	report, err := New(source, reader).Scan(context.Background(), ScanRequest{
		ContextName: "  prod  ",
		Path:        t.TempDir(),
	})
	if err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if report.ContextName != "prod" {
		t.Fatalf("context = %q, want prod", report.ContextName)
	}
	if reader.currentCalls != 0 {
		t.Fatalf("current context should not be resolved, calls=%d", reader.currentCalls)
	}
	if report.Total != 0 || len(report.Resources) != 0 {
		t.Fatalf("expected empty report, got %+v", report)
	}
}

func TestScanRequiresCurrentContext(t *testing.T) {
	source := &fakeManifestSource{}
	reader := &fakeLiveReader{current: ""}
	_, err := New(source, reader).Scan(context.Background(), ScanRequest{Path: t.TempDir()})
	if err == nil {
		t.Fatal("expected validation error for missing current context")
	}
	if source.calls != 0 {
		t.Fatal("source must not be called without a context")
	}
}

func TestScanPropagatesSourceError(t *testing.T) {
	sourceErr := errors.New("walk failed")
	source := &fakeManifestSource{err: sourceErr}
	reader := &fakeLiveReader{current: "prod"}

	_, err := New(source, reader).Scan(context.Background(), ScanRequest{Path: t.TempDir()})
	if !errors.Is(err, sourceErr) {
		t.Fatalf("expected source error, got %v", err)
	}
}

func TestScanPropagatesCurrentContextError(t *testing.T) {
	contextErr := errors.New("kubeconfig unavailable")
	source := &fakeManifestSource{}
	reader := &fakeLiveReader{currentErr: contextErr}

	_, err := New(source, reader).Scan(context.Background(), ScanRequest{Path: t.TempDir()})
	if !errors.Is(err, contextErr) {
		t.Fatalf("expected context error, got %v", err)
	}
	if source.calls != 0 {
		t.Fatal("source must not be called when context resolution fails")
	}
}

func TestValidateRequiresPorts(t *testing.T) {
	if err := New(nil, nil).Validate(); err == nil {
		t.Fatal("expected validation error for nil ports")
	}
	if err := New(&fakeManifestSource{}, &fakeLiveReader{}).Validate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

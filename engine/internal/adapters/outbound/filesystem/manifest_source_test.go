package filesystem

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"

	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
)

func writeTestFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func TestLoadParsesManifestsAndSkipsUnrelatedFiles(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, filepath.Join(root, "deployment.yaml"), `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: prod
  labels:
    app: web
  managedFields:
    - manager: kubectl
spec:
  replicas: 3
status:
  readyReplicas: 3
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: prod
spec:
  ports:
    - port: 80
`)
	writeTestFile(t, filepath.Join(root, "nested", "app.yml"), `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
  namespace: prod
`)
	writeTestFile(t, filepath.Join(root, "list.yaml"), `apiVersion: v1
kind: List
items:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: settings
      namespace: prod
  - apiVersion: v1
    kind: Secret
    metadata:
      name: credentials
      namespace: prod
  - metadata:
      name: missing-identity
`)
	writeTestFile(t, filepath.Join(root, "clusterrole.yaml"), `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: viewer
`)
	writeTestFile(t, filepath.Join(root, "values.yaml"), `replicaCount: 2
image:
  repository: nginx
`)
	writeTestFile(t, filepath.Join(root, "invalid.yaml"), `apiVersion: v1
kind: ConfigMap
metadata:
  name: [unterminated
`)
	writeTestFile(t, filepath.Join(root, ".hidden", "ignored.yaml"), `apiVersion: v1
kind: ConfigMap
metadata:
  name: hidden
`)
	writeTestFile(t, filepath.Join(root, "node_modules", "pkg", "ignored.yaml"), `apiVersion: v1
kind: ConfigMap
metadata:
  name: dependency
`)
	writeTestFile(t, filepath.Join(root, "notes.txt"), "not a manifest")

	manifests, issues, err := NewManifestSource().Load(context.Background(), root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(manifests) != 6 {
		t.Fatalf("expected 6 manifests, got %d: %+v", len(manifests), manifests)
	}
	if len(issues) != 1 || issues[0].SourceFile != filepath.Join(root, "invalid.yaml") {
		t.Fatalf("unexpected issues: %+v", issues)
	}
	if !strings.Contains(issues[0].Message, "invalid YAML") {
		t.Fatalf("unexpected issue message: %q", issues[0].Message)
	}

	expected := map[string]bool{
		"Deployment/web":     false,
		"Service/web":        false,
		"StatefulSet/db":     false,
		"ConfigMap/settings": false,
		"Secret/credentials": false,
		"ClusterRole/viewer": false,
	}
	for _, manifest := range manifests {
		key := manifest.Kind + "/" + manifest.Name
		if _, exists := expected[key]; !exists {
			t.Fatalf("unexpected manifest %s from %s", key, manifest.SourceFile)
		}
		expected[key] = true
		if strings.Contains(manifest.SourceFile, ".hidden") ||
			strings.Contains(manifest.SourceFile, "node_modules") {
			t.Fatalf("skipped directory leaked manifest: %s", manifest.SourceFile)
		}
		if manifest.DesiredYAML == "" {
			t.Fatalf("manifest %s has no desired YAML", key)
		}
	}
	for key, found := range expected {
		if !found {
			t.Errorf("missing manifest %s", key)
		}
	}

	deployment := findManifest(t, manifests, "Deployment", "web")
	if deployment.Namespace != "prod" || deployment.SourceFile != filepath.Join(root, "deployment.yaml") {
		t.Fatalf("unexpected deployment metadata: %+v", deployment)
	}
	if _, exists := deployment.Desired["status"]; exists {
		t.Fatal("desired object should not contain status")
	}
	metadata := deployment.Desired["metadata"].(map[string]interface{})
	if _, exists := metadata["managedFields"]; exists {
		t.Fatal("desired object should not contain managedFields")
	}
	if _, exists := metadata["labels"]; !exists {
		t.Fatal("desired object should keep user metadata")
	}

	var rendered map[string]interface{}
	if err := yaml.Unmarshal([]byte(deployment.DesiredYAML), &rendered); err != nil {
		t.Fatalf("render desired YAML: %v", err)
	}
	if _, exists := rendered["status"]; exists {
		t.Fatal("desired YAML should not contain status")
	}
	renderedMetadata := rendered["metadata"].(map[string]interface{})
	if _, exists := renderedMetadata["managedFields"]; exists {
		t.Fatal("desired YAML should not contain managedFields")
	}

	clusterRole := findManifest(t, manifests, "ClusterRole", "viewer")
	if clusterRole.Namespace != "" {
		t.Fatalf("cluster-scoped manifest should have no namespace: %+v", clusterRole)
	}
}

func TestLoadRejectsNonDirectory(t *testing.T) {
	root := t.TempDir()
	filePath := filepath.Join(root, "one.yaml")
	writeTestFile(t, filePath, "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: one\n")

	if _, _, err := NewManifestSource().Load(context.Background(), filePath); err == nil {
		t.Fatal("expected error for a non-directory path")
	}
	if _, _, err := NewManifestSource().Load(context.Background(), filepath.Join(root, "missing")); err == nil {
		t.Fatal("expected error for a missing path")
	}
}

func TestLoadHonorsCanceledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if _, _, err := NewManifestSource().Load(ctx, t.TempDir()); err == nil {
		t.Fatal("expected canceled context error")
	}
}

func findManifest(
	t *testing.T,
	manifests []domaingitops.Manifest,
	kind string,
	name string,
) domaingitops.Manifest {
	t.Helper()
	for _, manifest := range manifests {
		if manifest.Kind == kind && manifest.Name == name {
			return manifest
		}
	}
	t.Fatalf("manifest %s/%s not found", kind, name)
	return domaingitops.Manifest{}
}

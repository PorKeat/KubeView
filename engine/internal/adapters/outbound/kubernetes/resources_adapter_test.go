package kubernetes

import (
	"strings"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	legacycluster "github.com/kubeview/engine/internal/cluster"
	domainresources "github.com/kubeview/engine/internal/domain/resources"
)

func TestParseManifestRejectsInvalidYAML(t *testing.T) {
	if _, err := parseManifest("metadata: ["); err == nil {
		t.Fatal("expected invalid YAML to be rejected")
	}
	if _, err := parseManifest("null"); err == nil {
		t.Fatal("expected non-mapping manifest to be rejected")
	}
	object, err := parseManifest("apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: demo\n")
	if err != nil {
		t.Fatalf("parse valid manifest: %v", err)
	}
	apiVersion, kind, name := manifestIdentity(object)
	if apiVersion != "v1" || kind != "ConfigMap" || name != "demo" {
		t.Fatalf("unexpected identity: %s %s %s", apiVersion, kind, name)
	}
}

func TestValidateAPIVersion(t *testing.T) {
	if err := validateAPIVersion("apps/v1"); err != nil {
		t.Fatalf("valid apiVersion rejected: %v", err)
	}
	if err := validateAPIVersion("apps/v1/extra"); err == nil {
		t.Fatal("expected malformed apiVersion to be rejected")
	}
}

func TestNormalizeNamespaceUsesRefAndRejectsMismatch(t *testing.T) {
	namespaced := &legacycluster.GenericResourceTarget{Namespaced: true}
	object := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "ConfigMap",
		"metadata":   map[string]interface{}{"name": "demo"},
	}}

	if err := normalizeNamespace(object, namespaced, domainresources.ApplyRequest{Namespace: "apps"}); err != nil {
		t.Fatalf("expected ref namespace to be applied: %v", err)
	}
	if object.GetNamespace() != "apps" {
		t.Fatalf("expected namespace apps, got %q", object.GetNamespace())
	}

	object.SetNamespace("other")
	if err := normalizeNamespace(object, namespaced, domainresources.ApplyRequest{Namespace: "apps"}); err == nil {
		t.Fatal("expected namespace mismatch to be rejected")
	}

	object.SetNamespace("")
	if err := normalizeNamespace(object, namespaced, domainresources.ApplyRequest{}); err == nil {
		t.Fatal("expected missing namespace to be rejected")
	}

	clusterScoped := &legacycluster.GenericResourceTarget{Namespaced: false}
	object.SetNamespace("apps")
	if err := normalizeNamespace(object, clusterScoped, domainresources.ApplyRequest{}); err != nil {
		t.Fatalf("expected cluster-scoped namespace to be cleared: %v", err)
	}
	if object.GetNamespace() != "" {
		t.Fatalf("expected empty namespace, got %q", object.GetNamespace())
	}
	if err := normalizeNamespace(object, clusterScoped, domainresources.ApplyRequest{Namespace: "apps"}); err == nil {
		t.Fatal("expected cluster-scoped ref namespace to be rejected")
	}
}

func TestMarshalResourceStripsManagedFieldsAndStatus(t *testing.T) {
	object := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "ConfigMap",
		"metadata": map[string]interface{}{
			"name":          "demo",
			"managedFields": []interface{}{map[string]interface{}{"manager": "kubectl"}},
		},
		"status": map[string]interface{}{"phase": "Ready"},
		"data":   map[string]interface{}{"key": "value"},
	}}

	applied, err := marshalResource(object, true)
	if err != nil {
		t.Fatalf("marshal applied resource: %v", err)
	}
	if strings.Contains(applied, "managedFields") || strings.Contains(applied, "status") {
		t.Fatalf("applied yaml still contains server fields: %s", applied)
	}

	read, err := marshalResource(object, false)
	if err != nil {
		t.Fatalf("marshal read resource: %v", err)
	}
	if strings.Contains(read, "managedFields") || !strings.Contains(read, "status") {
		t.Fatalf("read yaml stripping is incorrect: %s", read)
	}
	if _, found, _ := unstructured.NestedFieldNoCopy(object.Object, "metadata", "managedFields"); !found {
		t.Fatal("marshal should not mutate the original object")
	}
}

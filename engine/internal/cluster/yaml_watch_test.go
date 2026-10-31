package cluster

import (
	"strings"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestYAMLWatchTargetKey(t *testing.T) {
	target := YAMLWatchTarget{
		ContextName: "prod",
		APIVersion:  "apps/v1",
		Kind:        "Deployment",
		Namespace:   "web",
		Name:        "api",
	}
	if got, want := target.Key(), "prod|apps/v1|Deployment|web|api"; got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}

func TestMarshalWatchYAMLRedactsSecrets(t *testing.T) {
	object := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "Secret",
		"metadata": map[string]interface{}{
			"name":      "database-secret",
			"namespace": "default",
			"managedFields": []interface{}{
				map[string]interface{}{"manager": "kubectl"},
			},
		},
		"type": "Opaque",
		"data": map[string]interface{}{
			"password": "c3VwZXItc2VjcmV0LXZhbHVl",
			"username": "YWRtaW4=",
		},
	}}

	yamlText, err := marshalWatchYAML(object, "Secret")
	if err != nil {
		t.Fatalf("marshalWatchYAML returned an error: %v", err)
	}
	if strings.Contains(yamlText, "c3VwZXItc2VjcmV0LXZhbHVl") {
		t.Fatalf("secret value leaked into YAML:\n%s", yamlText)
	}
	if !strings.Contains(yamlText, "<redacted>") {
		t.Fatalf("expected redacted values in YAML:\n%s", yamlText)
	}
	if strings.Contains(yamlText, "managedFields") {
		t.Fatalf("managedFields should be stripped:\n%s", yamlText)
	}
	if !strings.Contains(yamlText, "kind: Secret") {
		t.Fatalf("expected Secret kind in YAML:\n%s", yamlText)
	}
}

func TestMarshalWatchYAMLStripsManagedFields(t *testing.T) {
	object := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "ConfigMap",
		"metadata": map[string]interface{}{
			"name":      "app-config",
			"namespace": "default",
			"managedFields": []interface{}{
				map[string]interface{}{"manager": "kubectl"},
			},
		},
		"data": map[string]interface{}{
			"enabled": "true",
		},
	}}

	yamlText, err := marshalWatchYAML(object, "ConfigMap")
	if err != nil {
		t.Fatalf("marshalWatchYAML returned an error: %v", err)
	}
	if strings.Contains(yamlText, "managedFields") {
		t.Fatalf("managedFields should be stripped:\n%s", yamlText)
	}
	if !strings.Contains(yamlText, "enabled: \"true\"") &&
		!strings.Contains(yamlText, "enabled: true") {
		t.Fatalf("expected ConfigMap data in YAML:\n%s", yamlText)
	}
	if !strings.Contains(yamlText, "kind: ConfigMap") {
		t.Fatalf("expected ConfigMap kind in YAML:\n%s", yamlText)
	}
}

func TestYAMLFingerprintDetectsChanges(t *testing.T) {
	first := yamlFingerprint("kind: Pod\n")
	second := yamlFingerprint("kind: Pod\nmetadata:\n  name: web\n")
	if first == second {
		t.Fatal("expected different fingerprints for different manifests")
	}
	if first != yamlFingerprint("kind: Pod\n") {
		t.Fatal("expected stable fingerprints for identical manifests")
	}
}

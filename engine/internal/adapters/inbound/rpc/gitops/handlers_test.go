package gitops

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
)

func TestReportToResponsePreservesWireShape(t *testing.T) {
	report := &domaingitops.Report{
		ContextName: "prod",
		Path:        "/tmp/manifests",
		ScannedAt:   time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC),
		Total:       2,
		Clean:       1,
		Missing:     1,
		Resources: []domaingitops.Drift{
			{
				APIVersion:  "apps/v1",
				Kind:        "Deployment",
				Resource:    "deployments",
				Name:        "web",
				Namespace:   "prod",
				SourceFile:  "a-deployment.yaml",
				Status:      domaingitops.StatusClean,
				DesiredYAML: "kind: Deployment\n",
				LiveYAML:    "kind: Deployment\n",
			},
			{
				APIVersion:  "v1",
				Kind:        "ConfigMap",
				Resource:    "configmaps",
				Name:        "settings",
				SourceFile:  "b-configmap.yaml",
				Status:      domaingitops.StatusMissing,
				DesiredYAML: "kind: ConfigMap\n",
				Message:     "resource was not found in the cluster",
			},
		},
	}

	response := reportToResponse(report)
	payload, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	jsonText := string(payload)
	for _, field := range []string{
		`"contextName"`, `"path"`, `"scannedAt"`, `"total"`, `"clean"`,
		`"changed"`, `"missing"`, `"errors"`, `"resources"`, `"desiredYaml"`,
		`"sourceFile"`, `"status"`, `"liveYaml"`, `"message"`,
	} {
		if !strings.Contains(jsonText, field) {
			t.Errorf("wire response missing %s: %s", field, jsonText)
		}
	}
	if response.ScannedAt != "2026-10-28T12:00:00Z" {
		t.Errorf("scannedAt = %q", response.ScannedAt)
	}
	if strings.Contains(jsonText, `"namespace":""`) {
		t.Errorf("empty namespace should be omitted: %s", jsonText)
	}
}

func TestReportToResponseHandlesNilReport(t *testing.T) {
	response := reportToResponse(nil)
	if response.Resources == nil {
		t.Fatal("resources must be an empty array, not null")
	}
	payload, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	if !strings.Contains(string(payload), `"resources":[]`) {
		t.Fatalf("unexpected nil report payload: %s", payload)
	}
}

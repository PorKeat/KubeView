package gitops

import (
	"strings"
	"testing"
)

func desiredDeployment() map[string]interface{} {
	return map[string]interface{}{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata": map[string]interface{}{
			"name":      "web",
			"namespace": "prod",
			"labels":    map[string]interface{}{"app": "web"},
		},
		"spec": map[string]interface{}{
			"replicas": float64(3),
			"template": map[string]interface{}{
				"spec": map[string]interface{}{
					"containers": []interface{}{map[string]interface{}{
						"name":  "web",
						"image": "nginx:1.27",
					}},
				},
			},
		},
	}
}

func liveDeployment() map[string]interface{} {
	return map[string]interface{}{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata": map[string]interface{}{
			"name":              "web",
			"namespace":         "prod",
			"labels":            map[string]interface{}{"app": "web", "extra": "server"},
			"uid":               "6f1c",
			"resourceVersion":   "42",
			"generation":        int64(4),
			"creationTimestamp": "2026-10-28T00:00:00Z",
			"managedFields": []interface{}{map[string]interface{}{
				"manager": "kube-controller-manager",
			}},
		},
		"spec": map[string]interface{}{
			"replicas": int64(3),
			"selector": map[string]interface{}{
				"matchLabels": map[string]interface{}{"app": "web"},
			},
			"template": map[string]interface{}{
				"metadata": map[string]interface{}{"creationTimestamp": nil},
				"spec": map[string]interface{}{
					"restartPolicy": "Always",
					"containers": []interface{}{map[string]interface{}{
						"name":                   "web",
						"image":                  "nginx:1.27",
						"terminationMessagePath": "/dev/termination-log",
						"imagePullPolicy":        "IfNotPresent",
					}},
				},
			},
		},
		"status": map[string]interface{}{"readyReplicas": int64(3)},
	}
}

func TestClassifyCleanIgnoresServerAddedFields(t *testing.T) {
	desired := desiredDeployment()
	desiredMetadata := desired["metadata"].(map[string]interface{})
	desiredMetadata["resourceVersion"] = "999"
	desiredMetadata["managedFields"] = []interface{}{map[string]interface{}{"manager": "kubectl"}}
	desired["status"] = map[string]interface{}{"readyReplicas": float64(1)}

	status, message := Classify(desired, &LiveResource{
		Found:  true,
		Object: liveDeployment(),
	})
	if status != StatusClean || message != "" {
		t.Fatalf("expected clean, got status=%s message=%q", status, message)
	}
}

func TestClassifyMissing(t *testing.T) {
	status, message := Classify(desiredDeployment(), nil)
	if status != StatusMissing || !strings.Contains(message, "not found") {
		t.Fatalf("expected missing, got status=%s message=%q", status, message)
	}
	status, _ = Classify(desiredDeployment(), &LiveResource{Found: false})
	if status != StatusMissing {
		t.Fatalf("expected missing for Found=false, got %s", status)
	}
}

func TestClassifyChangedReportsFieldPath(t *testing.T) {
	live := liveDeployment()
	live["spec"].(map[string]interface{})["replicas"] = int64(1)

	status, message := Classify(desiredDeployment(), &LiveResource{Found: true, Object: live})
	if status != StatusChanged {
		t.Fatalf("expected changed, got %s", status)
	}
	if !strings.Contains(message, "spec.replicas") {
		t.Fatalf("expected changed message to name the field: %q", message)
	}
}

func TestClassifyChangedDetectsMissingNestedField(t *testing.T) {
	live := liveDeployment()
	metadata := live["metadata"].(map[string]interface{})
	delete(metadata, "labels")

	status, message := Classify(desiredDeployment(), &LiveResource{Found: true, Object: live})
	if status != StatusChanged || !strings.Contains(message, "metadata.labels") {
		t.Fatalf("expected changed at metadata.labels, got status=%s message=%q", status, message)
	}
}

func TestClassifyChangedDetectsExtraDesiredListItems(t *testing.T) {
	desired := desiredDeployment()
	spec := desired["spec"].(map[string]interface{})
	template := spec["template"].(map[string]interface{})
	templateSpec := template["spec"].(map[string]interface{})
	templateSpec["containers"] = append(templateSpec["containers"].([]interface{}), map[string]interface{}{
		"name": "sidecar",
	})

	status, message := Classify(desired, &LiveResource{Found: true, Object: liveDeployment()})
	if status != StatusChanged || !strings.Contains(message, "spec.template.spec.containers") {
		t.Fatalf("expected changed at containers, got status=%s message=%q", status, message)
	}
}

func TestFirstDifferenceTreatsNumbersAcrossTypes(t *testing.T) {
	desired := map[string]interface{}{
		"spec": map[string]interface{}{"replicas": int64(3), "port": float64(8080)},
	}
	live := map[string]interface{}{
		"spec": map[string]interface{}{"replicas": float64(3), "port": int32(8080)},
	}
	if difference := FirstDifference(desired, live); difference != "" {
		t.Fatalf("expected numeric equality, got difference %q", difference)
	}

	live["spec"].(map[string]interface{})["port"] = int32(9090)
	if difference := FirstDifference(desired, live); difference != "spec.port" {
		t.Fatalf("expected spec.port difference, got %q", difference)
	}
}

func TestFirstDifferenceIgnoresExtraLiveFields(t *testing.T) {
	desired := map[string]interface{}{
		"metadata": map[string]interface{}{"name": "web"},
	}
	live := map[string]interface{}{
		"metadata": map[string]interface{}{
			"name":        "web",
			"uid":         "abc",
			"annotations": map[string]interface{}{"server": "added"},
		},
		"serverAddedTopLevel": true,
	}
	if difference := FirstDifference(desired, live); difference != "" {
		t.Fatalf("expected clean subset, got difference %q", difference)
	}
}

func TestFirstDifferenceRejectsTypeMismatch(t *testing.T) {
	desired := map[string]interface{}{"spec": map[string]interface{}{"paused": false}}
	live := map[string]interface{}{"spec": map[string]interface{}{"paused": "false"}}
	if difference := FirstDifference(desired, live); difference != "spec.paused" {
		t.Fatalf("expected spec.paused difference, got %q", difference)
	}
}

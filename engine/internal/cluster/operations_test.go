package cluster

import (
	"errors"
	"testing"

	shared "github.com/kubeview/engine/internal/domain/shared"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestSanitizeJobCopyClearsGeneratedSelector(t *testing.T) {
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "report",
			Namespace: "default",
			Labels: map[string]string{
				"app":                          "report",
				"batch.kubernetes.io/job-name": "report",
			},
		},
		Spec: batchv1.JobSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"controller-uid": "abc"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app":                          "report",
						"controller-uid":               "abc",
						"batch.kubernetes.io/job-name": "report",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "main", Image: "busybox"}},
				},
			},
		},
	}
	copied := sanitizeJobCopy(job)
	if copied.Spec.Selector != nil {
		t.Fatalf("expected selector to be cleared")
	}
	if _, ok := copied.Spec.Template.Labels["controller-uid"]; ok {
		t.Fatalf("expected controller-uid label to be removed")
	}
	if copied.Spec.Template.Labels["app"] != "report" {
		t.Fatalf("expected user labels to be preserved")
	}
	if copied.Spec.Template.Labels["kubeview.io/cloned-from"] != "report" {
		t.Fatalf("expected clone provenance label")
	}
	if copied.Name != "" {
		t.Fatalf("expected copied job to have no name yet")
	}
	if job.Spec.Selector == nil {
		t.Fatalf("expected original job to be unchanged")
	}
}

func TestDeploymentRevisionParsing(t *testing.T) {
	replicaSet := &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{
			Annotations: map[string]string{"deployment.kubernetes.io/revision": "12"},
		},
	}
	revision, ok := deploymentRevision(replicaSet)
	if !ok || revision != 12 {
		t.Fatalf("expected revision 12, got %d (%v)", revision, ok)
	}

	replicaSet.Annotations["deployment.kubernetes.io/revision"] = "nope"
	if _, ok := deploymentRevision(replicaSet); ok {
		t.Fatalf("expected invalid revision to be rejected")
	}
}

func TestSelectHelmChartVersion(t *testing.T) {
	entries := []helmIndexEntry{
		{Version: "1.0.0"},
		{Version: "2.1.0"},
		{Version: "2.0.5"},
	}
	selected, err := selectHelmChartVersion(entries, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if selected.Version != "2.1.0" {
		t.Fatalf("expected latest semver 2.1.0, got %s", selected.Version)
	}

	selected, err = selectHelmChartVersion(entries, "2.0.5")
	if err != nil || selected.Version != "2.0.5" {
		t.Fatalf("expected exact version selection")
	}

	if _, err := selectHelmChartVersion(entries, "9.9.9"); err == nil {
		t.Fatalf("expected missing version error")
	}
}

func TestValidateTaints(t *testing.T) {
	if err := validateTaints([]NodeTaintInput{{Key: "dedicated", Effect: "NoSchedule"}}); err != nil {
		t.Fatalf("unexpected valid taint error: %v", err)
	}
	if err := validateTaints([]NodeTaintInput{{Key: "dedicated", Effect: "Bad"}}); err == nil {
		t.Fatalf("expected invalid effect error")
	}
	if err := validateTaints([]NodeTaintInput{{Key: "", Effect: "NoExecute"}}); err == nil {
		t.Fatalf("expected missing key error")
	}
}

func TestHelmRepositoryURLs(t *testing.T) {
	base, index, err := helmRepositoryURLs("https://charts.example.com/repo")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if base != "https://charts.example.com/repo" || index != "https://charts.example.com/repo/index.yaml" {
		t.Fatalf("unexpected URLs: %q %q", base, index)
	}
	base, index, err = helmRepositoryURLs("https://charts.example.com/repo/index.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if base != "https://charts.example.com/repo" || index != "https://charts.example.com/repo/index.yaml" {
		t.Fatalf("unexpected direct-index URLs: %q %q", base, index)
	}
	if _, _, err := helmRepositoryURLs("ftp://charts.example.com"); err == nil {
		t.Fatalf("expected unsupported scheme error")
	}
}

func TestMapActionErrorPreservesKubernetesKinds(t *testing.T) {
	forbidden := apierrors.NewForbidden(
		schema.GroupResource{Resource: "nodes"},
		"worker-1",
		errors.New("denied"),
	)
	mapped := MapActionError(forbidden, `drain node "worker-1"`)
	var sharedErr *shared.Error
	if !errors.As(mapped, &sharedErr) || sharedErr.Kind != shared.KindForbidden {
		t.Fatalf("expected forbidden domain error, got %#v", mapped)
	}

	notFound := apierrors.NewNotFound(
		schema.GroupResource{Resource: "nodes"},
		"worker-2",
	)
	mapped = MapActionError(notFound, `get node "worker-2"`)
	if !errors.As(mapped, &sharedErr) || sharedErr.Kind != shared.KindNotFound {
		t.Fatalf("expected not-found domain error, got %#v", mapped)
	}

	validation := shared.Validation("nodeName is required")
	mapped = MapActionError(validation, "drain node")
	if !errors.As(mapped, &sharedErr) || sharedErr.Kind != shared.KindInvalid {
		t.Fatalf("expected validation error to pass through, got %#v", mapped)
	}
}

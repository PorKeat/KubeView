// Package gitops contains transport-agnostic drift models and comparison
// rules for a local directory of Kubernetes manifests.
package gitops

import (
	"strings"
	"time"
)

// Status is the drift classification for one desired manifest.
type Status string

const (
	StatusClean   Status = "clean"
	StatusChanged Status = "changed"
	StatusMissing Status = "missing"
	StatusError   Status = "error"
)

// Ref identifies a Kubernetes resource. Resource is empty until the plural is
// resolved against the target cluster.
type Ref struct {
	APIVersion string
	Kind       string
	Resource   string
	Name       string
	Namespace  string
}

// Manifest is a desired resource parsed from a local source file.
type Manifest struct {
	APIVersion  string
	Kind        string
	Name        string
	Namespace   string
	SourceFile  string
	Desired     map[string]interface{}
	DesiredYAML string
}

// Ref returns the unresolved identity of the manifest.
func (manifest Manifest) Ref() Ref {
	return Ref{
		APIVersion: manifest.APIVersion,
		Kind:       manifest.Kind,
		Name:       manifest.Name,
		Namespace:  manifest.Namespace,
	}
}

// IdentityKey de-duplicates manifests by apiVersion, kind, namespace, and name.
func (manifest Manifest) IdentityKey() string {
	return strings.Join([]string{
		strings.TrimSpace(manifest.APIVersion),
		strings.TrimSpace(manifest.Kind),
		strings.TrimSpace(manifest.Namespace),
		strings.TrimSpace(manifest.Name),
	}, "\x00")
}

// ManifestIssue is a source-level problem that could not be attributed to a
// Kubernetes resource identity, such as malformed YAML.
type ManifestIssue struct {
	SourceFile string
	Message    string
}

// LiveResource is the cluster state for a desired resource. Object is the
// sanitized live object used for subset comparison.
type LiveResource struct {
	Resource  string
	Namespace string
	Found     bool
	Object    map[string]interface{}
	YAML      string
}

// Drift is the comparison result for one desired manifest or source issue.
type Drift struct {
	APIVersion  string
	Kind        string
	Resource    string
	Name        string
	Namespace   string
	SourceFile  string
	Status      Status
	DesiredYAML string
	LiveYAML    string
	Message     string
}

// Report is the complete drift scan result.
type Report struct {
	ContextName string
	Path        string
	ScannedAt   time.Time
	Total       int
	Clean       int
	Changed     int
	Missing     int
	Errors      int
	Resources   []Drift
}

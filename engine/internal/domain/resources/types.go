// Package resources contains transport-agnostic types and validation for
// generic Kubernetes resource actions.
package resources

import (
	"strings"

	shared "github.com/kubeview/engine/internal/domain/shared"
)

// Ref identifies a Kubernetes resource by API version, kind, plural resource,
// name, and optional namespace.
type Ref struct {
	APIVersion string
	Kind       string
	Resource   string
	Name       string
	Namespace  string
}

// ValidateRef requires every identity field used by get and delete.
func ValidateRef(ref Ref) error {
	if err := ValidateTarget(ref); err != nil {
		return err
	}
	if strings.TrimSpace(ref.Name) == "" {
		return shared.Validation("name is required")
	}
	return nil
}

// ValidateTarget validates the fields required to address a resource type.
// Name is optional because capability checks may apply to a resource type.
func ValidateTarget(ref Ref) error {
	if strings.TrimSpace(ref.APIVersion) == "" {
		return shared.Validation("apiVersion is required")
	}
	if strings.TrimSpace(ref.Kind) == "" {
		return shared.Validation("kind is required")
	}
	if strings.TrimSpace(ref.Resource) == "" {
		return shared.Validation("resource is required")
	}
	return nil
}

// GetResult is a live resource serialized as YAML.
type GetResult struct {
	Ref
	YAML string
}

// ApplyRequest describes a manifest to create or update. Name and Namespace
// are optional ref hints used to guard against a manifest changing identity.
type ApplyRequest struct {
	YAML      string
	Resource  string
	Name      string
	Namespace string
	DryRun    bool
}

// Validate checks the request fields that can be validated without parsing
// the manifest.
func (request ApplyRequest) Validate() error {
	if strings.TrimSpace(request.YAML) == "" {
		return shared.Validation("yaml is required")
	}
	return nil
}

// ApplyResult is the normalized result of a create or update.
type ApplyResult struct {
	Ref
	Created bool
	DryRun  bool
	YAML    string
}

// Capabilities reports the verbs the current kubeconfig identity may perform.
type Capabilities struct {
	Get     bool
	Create  bool
	Update  bool
	Delete  bool
	Reasons map[string]string
}

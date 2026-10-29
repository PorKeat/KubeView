package gitops

import (
	"context"

	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
)

// ScanRequest identifies a local manifest directory and an optional context.
type ScanRequest struct {
	ContextName string
	Path        string
}

// ManifestSource is the application-owned port for loading desired manifests.
type ManifestSource interface {
	Load(ctx context.Context, root string) ([]domaingitops.Manifest, []domaingitops.ManifestIssue, error)
}

// LiveReader is the application-owned port for resolving and reading live
// Kubernetes resources.
type LiveReader interface {
	CurrentContext(ctx context.Context) (string, error)
	Read(ctx context.Context, contextName string, ref domaingitops.Ref) (*domaingitops.LiveResource, error)
}

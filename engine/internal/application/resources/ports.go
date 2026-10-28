package resources

import (
	"context"

	domainresources "github.com/kubeview/engine/internal/domain/resources"
)

// Repository is the application-owned port for generic resource operations.
type Repository interface {
	Get(ctx context.Context, contextName string, ref domainresources.Ref) (*domainresources.GetResult, error)
	Apply(ctx context.Context, contextName string, request domainresources.ApplyRequest) (*domainresources.ApplyResult, error)
	Delete(ctx context.Context, contextName string, ref domainresources.Ref) error
	Capabilities(ctx context.Context, contextName string, ref domainresources.Ref) (*domainresources.Capabilities, error)
}

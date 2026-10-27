package fleet

import (
	"context"

	domainfleet "github.com/kubeview/engine/internal/domain/fleet"
)

// ContextRepository is the application-owned port for safe cluster metadata.
type ContextRepository interface {
	ListContexts(ctx context.Context) ([]domainfleet.Context, error)
}

// OverviewReader is the application-owned port for compact cluster telemetry.
type OverviewReader interface {
	ReadOverview(ctx context.Context, contextName string) (*domainfleet.Overview, error)
}

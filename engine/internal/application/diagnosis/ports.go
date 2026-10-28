package diagnosis

import (
	"context"

	domaindiagnosis "github.com/kubeview/engine/internal/domain/diagnosis"
)

// Params identifies the pod to diagnose. ContextName is optional; the
// evidence collector resolves it to the current context when empty.
type Params struct {
	ContextName string
	Namespace   string
	PodName     string
}

// EvidenceCollector is the application-owned port for gathering pod evidence.
// Implementations translate cluster APIs into domain models.
type EvidenceCollector interface {
	Collect(ctx context.Context, params Params) (*domaindiagnosis.Snapshot, error)
}

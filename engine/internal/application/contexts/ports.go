package contexts

import (
	"context"

	domaincontexts "github.com/kubeview/engine/internal/domain/contexts"
)

// Repository is the application-owned port for context metadata and switching.
type Repository interface {
	List(ctx context.Context) (*domaincontexts.ListResult, error)
	Switch(ctx context.Context, name string) (*domaincontexts.SwitchResult, error)
	ListNamespaces(ctx context.Context, contextName string) ([]string, error)
}

// SwitchObserver lets infrastructure react after a successful context switch
// without coupling the application service to watchers or transports.
type SwitchObserver interface {
	Switched(ctx context.Context, contextName string)
}

type ObserverFunc func(context.Context, string)

func (observer ObserverFunc) Switched(ctx context.Context, contextName string) {
	observer(ctx, contextName)
}

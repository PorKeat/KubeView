package bootstrap

import (
	"context"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	kubernetesadapter "github.com/kubeview/engine/internal/adapters/outbound/kubernetes"
	appcontexts "github.com/kubeview/engine/internal/application/contexts"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func RegisterContextsModule(
	server *ipc.Server,
	manager *legacycluster.Manager,
	getWatcher func() *legacycluster.ResourceWatcher,
) error {
	if manager == nil {
		return nil
	}

	adapter := kubernetesadapter.NewContextsAdapter(manager)
	observer := appcontexts.ObserverFunc(func(ctx context.Context, contextName string) {
		if watcher := getWatcher(); watcher != nil {
			watcher.SwitchContext(ctx, contextName)
		}
	})
	service := appcontexts.New(adapter, observer)
	if err := service.Validate(); err != nil {
		return err
	}
	rpc.RegisterContextsHandlers(server, service)
	return nil
}

package bootstrap

import (
	resourcesrpc "github.com/kubeview/engine/internal/adapters/inbound/rpc/resources"
	kubernetesadapter "github.com/kubeview/engine/internal/adapters/outbound/kubernetes"
	appresources "github.com/kubeview/engine/internal/application/resources"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func RegisterResourcesModule(server *ipc.Server, manager *legacycluster.Manager) error {
	if manager == nil {
		return nil
	}
	adapter := kubernetesadapter.NewResourcesAdapter(manager)
	service := appresources.New(adapter)
	if err := service.Validate(); err != nil {
		return err
	}
	resourcesrpc.RegisterHandlers(server, service)
	return nil
}

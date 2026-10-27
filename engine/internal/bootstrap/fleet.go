package bootstrap

import (
	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	kubernetesadapter "github.com/kubeview/engine/internal/adapters/outbound/kubernetes"
	appfleet "github.com/kubeview/engine/internal/application/fleet"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func RegisterFleetModule(server *ipc.Server, manager *legacycluster.Manager) error {
	if manager == nil {
		return nil
	}
	adapter := kubernetesadapter.NewFleetAdapter(manager)
	service := appfleet.New(adapter, adapter)
	if err := service.Validate(); err != nil {
		return err
	}
	rpc.RegisterFleetHandlers(server, service)
	return nil
}

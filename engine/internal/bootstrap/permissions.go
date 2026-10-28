package bootstrap

import (
	permissionsrpc "github.com/kubeview/engine/internal/adapters/inbound/rpc/permissions"
	kubernetesadapter "github.com/kubeview/engine/internal/adapters/outbound/kubernetes"
	apppermissions "github.com/kubeview/engine/internal/application/permissions"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func RegisterPermissionsModule(server *ipc.Server, manager *legacycluster.Manager) error {
	if manager == nil {
		return nil
	}
	adapter := kubernetesadapter.NewPermissionsAdapter(manager)
	service := apppermissions.New(adapter, adapter, adapter)
	if err := service.Validate(); err != nil {
		return err
	}
	permissionsrpc.RegisterHandlers(server, service)
	return nil
}

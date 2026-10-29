package bootstrap

import (
	gitopsrpc "github.com/kubeview/engine/internal/adapters/inbound/rpc/gitops"
	filesystemadapter "github.com/kubeview/engine/internal/adapters/outbound/filesystem"
	kubernetesadapter "github.com/kubeview/engine/internal/adapters/outbound/kubernetes"
	appgitops "github.com/kubeview/engine/internal/application/gitops"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func RegisterGitOpsModule(server *ipc.Server, manager *legacycluster.Manager) error {
	if manager == nil {
		return nil
	}
	service := appgitops.New(
		filesystemadapter.NewManifestSource(),
		kubernetesadapter.NewGitOpsAdapter(manager),
	)
	if err := service.Validate(); err != nil {
		return err
	}
	gitopsrpc.RegisterHandlers(server, service)
	return nil
}

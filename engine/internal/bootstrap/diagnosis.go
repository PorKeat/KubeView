package bootstrap

import (
	diagnosisrpc "github.com/kubeview/engine/internal/adapters/inbound/rpc/diagnosis"
	kubernetesadapter "github.com/kubeview/engine/internal/adapters/outbound/kubernetes"
	appdiagnosis "github.com/kubeview/engine/internal/application/diagnosis"
	legacycluster "github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func RegisterDiagnosisModule(server *ipc.Server, manager *legacycluster.Manager) error {
	if manager == nil {
		return nil
	}
	adapter := kubernetesadapter.NewPodDiagnosisAdapter(manager)
	service := appdiagnosis.New(adapter)
	if err := service.Validate(); err != nil {
		return err
	}
	diagnosisrpc.RegisterHandlers(server, service)
	return nil
}

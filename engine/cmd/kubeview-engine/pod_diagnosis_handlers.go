package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
	"github.com/kubeview/engine/internal/poddiagnosis"
)

func registerPodDiagnosisHandlers(server *ipc.Server, mgr *cluster.Manager) {
	server.Register("pods.diagnose", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p poddiagnosis.DiagnoseParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.Namespace == "" || p.PodName == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "namespace and podName are required",
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		result, err := poddiagnosis.Diagnose(ctx, mgr, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to diagnose pod: %v", err),
			}
		}
		return result, nil
	})
}

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerFleetHandlers(server *ipc.Server, mgr *cluster.Manager) {
	server.Register("clusters.fleetOverview", func(_ json.RawMessage) (interface{}, *ipc.RPCError) {
		if mgr == nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrEngineUnavailable,
				Message: "Kubeconfig manager is not initialized",
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		res, err := mgr.GetFleetOverview(ctx)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to get fleet overview: %v", err),
			}
		}
		return res, nil
	})
}

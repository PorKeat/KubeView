package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerHelmHandlers(server *ipc.Server) {
	server.Register("helm.charts", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			RepositoryURL string `json:"repositoryUrl"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid Helm chart params: %v", err),
			}
		}
		if p.RepositoryURL == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "repositoryUrl is required",
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		result, err := cluster.FetchHelmCharts(ctx, p.RepositoryURL)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to load Helm charts: %v", err),
			}
		}
		return result, nil
	})
}

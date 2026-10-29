package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerSimpleResourceHandlers(server *ipc.Server, mgr *cluster.Manager) {
	server.Register("simpleResources.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Kind        string `json:"kind"`
			Namespace   string `json:"namespace"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid simple resource params: %v", err),
			}
		}
		if p.Kind == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "kind is required",
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListSimpleResources(ctx, p.ContextName, p.Kind, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list %s: %v", p.Kind, err),
			}
		}
		return res, nil
	})

	server.Register("simpleResources.counts", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		return mgr.CountSimpleResources(ctx, p.ContextName), nil
	})
}

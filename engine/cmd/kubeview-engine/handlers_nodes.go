package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerNodeHandlers(server *ipc.Server, mgr *cluster.Manager) {
	resolveContext := func(contextName string) string {
		if contextName != "" {
			return contextName
		}
		if listRes, err := mgr.ListContexts(); err == nil {
			return listRes.CurrentContext
		}
		return ""
	}

	server.Register("nodes.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		items, err := mgr.ListNodes(ctx, resolveContext(p.ContextName))
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, "list nodes"),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to list nodes: %v", err),
			)
		}
		return map[string]interface{}{"items": items, "totalCount": len(items)}, nil
	})

	server.Register("nodes.get", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.NodeActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		node, err := mgr.GetNode(ctx, resolveContext(p.ContextName), p.NodeName)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("get node %q", p.NodeName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to get node: %v", err),
			)
		}
		return node, nil
	})

	registerCordon := func(method string, unschedulable bool) {
		server.Register(method, func(params json.RawMessage) (interface{}, *ipc.RPCError) {
			var p cluster.NodeActionParams
			if err := json.Unmarshal(params, &p); err != nil {
				return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
			}
			if p.NodeName == "" {
				return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "nodeName is required"}
			}
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			node, err := mgr.CordonNode(ctx, cluster.NodeActionParams{
				ContextName: resolveContext(p.ContextName),
				NodeName:    p.NodeName,
			}, unschedulable)
			if err != nil {
				return nil, rpc.MapError(
					cluster.MapActionError(err, fmt.Sprintf("update node %q", p.NodeName)),
					ipc.ErrK8sConnFailed,
					fmt.Sprintf("Failed to update node: %v", err),
				)
			}
			return node, nil
		})
	}
	registerCordon("nodes.cordon", true)
	registerCordon("nodes.uncordon", false)

	server.Register("nodes.drain", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DrainNodeParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.NodeName == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "nodeName is required"}
		}
		if p.TimeoutSeconds <= 0 || p.TimeoutSeconds > 900 {
			p.TimeoutSeconds = 120
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(p.TimeoutSeconds+15)*time.Second)
		defer cancel()
		result, err := mgr.DrainNode(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("drain node %q", p.NodeName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to drain node: %v", err),
			)
		}
		return result, nil
	})

	server.Register("nodes.taint", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.UpdateNodeTaintsParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.NodeName == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "nodeName is required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		node, err := mgr.ReplaceNodeTaints(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("update taints on node %q", p.NodeName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to update node taints: %v", err),
			)
		}
		return node, nil
	})

	server.Register("nodes.label", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.UpdateNodeLabelsParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.NodeName == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "nodeName is required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		node, err := mgr.UpdateNodeLabels(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("update labels on node %q", p.NodeName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to update node labels: %v", err),
			)
		}
		return node, nil
	})
}

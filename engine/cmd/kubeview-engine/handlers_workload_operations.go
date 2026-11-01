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

func registerWorkloadOperationHandlers(server *ipc.Server, mgr *cluster.Manager) {
	resolveContext := func(contextName string) string {
		if contextName != "" {
			return contextName
		}
		if listRes, err := mgr.ListContexts(); err == nil {
			return listRes.CurrentContext
		}
		return ""
	}

	server.Register("deployments.rolloutHistory", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		items, err := mgr.ListDeploymentRevisions(ctx, resolveContext(p.ContextName), p.Namespace, p.Name)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("load rollout history for deployment %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to load rollout history: %v", err),
			)
		}
		return map[string]interface{}{"items": items, "totalCount": len(items)}, nil
	})

	server.Register("deployments.rollback", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			cluster.DeploymentActionParams
			Revision int64 `json:"revision"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Revision <= 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and a positive revision are required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		if err := mgr.RollbackDeployment(ctx, cluster.RollbackDeploymentParams{
			DeploymentActionParams: p.DeploymentActionParams,
			Revision:               p.Revision,
		}); err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("roll back deployment %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to roll back deployment: %v", err),
			)
		}
		return map[string]interface{}{"success": true, "name": p.Name, "revision": p.Revision}, nil
	})

	registerPauseResume := func(method string, paused bool) {
		server.Register(method, func(params json.RawMessage) (interface{}, *ipc.RPCError) {
			var p cluster.DeploymentActionParams
			if err := json.Unmarshal(params, &p); err != nil {
				return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
			}
			if p.Name == "" {
				return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
			}
			p.ContextName = resolveContext(p.ContextName)
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			if err := mgr.SetDeploymentPaused(ctx, p, paused); err != nil {
				action := "pause"
				if !paused {
					action = "resume"
				}
				return nil, rpc.MapError(
					cluster.MapActionError(err, fmt.Sprintf("%s deployment %q", action, p.Name)),
					ipc.ErrK8sConnFailed,
					fmt.Sprintf("Failed to update deployment: %v", err),
				)
			}
			return map[string]interface{}{"success": true, "name": p.Name, "paused": paused}, nil
		})
	}
	registerPauseResume("deployments.pause", true)
	registerPauseResume("deployments.resume", false)

	server.Register("statefulsets.partition", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.SetStatefulSetPartitionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Partition < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and a non-negative partition are required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := mgr.SetStatefulSetPartition(ctx, p); err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("set partition on statefulset %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to update statefulset partition: %v", err),
			)
		}
		return map[string]interface{}{"success": true, "name": p.Name, "partition": p.Partition}, nil
	})

	server.Register("jobs.retry", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CloneJobParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		job, err := mgr.CloneJob(ctx, p, true)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("retry job %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to retry job: %v", err),
			)
		}
		return job, nil
	})

	server.Register("jobs.clone", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CloneJobParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.NewName == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and newName are required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		job, err := mgr.CloneJob(ctx, p, false)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("clone job %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to clone job: %v", err),
			)
		}
		return job, nil
	})

	server.Register("persistentvolumeclaims.expand", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ExpandPersistentVolumeClaimParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Storage == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and storage are required"}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		result, err := mgr.ExpandPersistentVolumeClaim(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("expand persistentvolumeclaim %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to expand persistentvolumeclaim: %v", err),
			)
		}
		return map[string]interface{}{"name": result.Name, "storage": result.Storage}, nil
	})
}

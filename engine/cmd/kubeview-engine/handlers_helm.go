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

func registerHelmHandlers(server *ipc.Server, mgr *cluster.Manager) {
	resolveContext := func(contextName string) string {
		if contextName != "" {
			return contextName
		}
		if listRes, err := mgr.ListContexts(); err == nil {
			return listRes.CurrentContext
		}
		return ""
	}

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
			return nil, rpc.MapError(
				cluster.MapActionError(err, "load Helm charts"),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to load Helm charts: %v", err),
			)
		}
		return result, nil
	})

	actionTimeout := func(seconds int) time.Duration {
		if seconds <= 0 {
			return 10 * time.Minute
		}
		return time.Duration(seconds+30) * time.Second
	}

	server.Register("helm.install", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.HelmInstallParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), actionTimeout(p.TimeoutSeconds))
		defer cancel()
		result, err := mgr.InstallHelmRelease(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("install Helm release %q", p.ReleaseName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Helm install failed: %v", err),
			)
		}
		return result, nil
	})

	server.Register("helm.upgrade", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.HelmUpgradeParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), actionTimeout(p.TimeoutSeconds))
		defer cancel()
		result, err := mgr.UpgradeHelmRelease(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("upgrade Helm release %q", p.ReleaseName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Helm upgrade failed: %v", err),
			)
		}
		return result, nil
	})

	server.Register("helm.rollback", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.HelmRollbackParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), actionTimeout(p.TimeoutSeconds))
		defer cancel()
		result, err := mgr.RollbackHelmRelease(ctx, p)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("roll back Helm release %q", p.ReleaseName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Helm rollback failed: %v", err),
			)
		}
		return result, nil
	})

	server.Register("helm.uninstall", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.HelmUninstallParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		p.ContextName = resolveContext(p.ContextName)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		if err := mgr.UninstallHelmRelease(ctx, p); err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("uninstall Helm release %q", p.ReleaseName)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Helm uninstall failed: %v", err),
			)
		}
		return map[string]interface{}{"success": true, "name": p.ReleaseName}, nil
	})

	server.Register("helm.history", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		items, err := mgr.GetHelmReleaseHistory(ctx, resolveContext(p.ContextName), p.Namespace, p.Name)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("load Helm history for %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to load Helm history: %v", err),
			)
		}
		return map[string]interface{}{"items": items, "totalCount": len(items)}, nil
	})

	server.Register("helm.values", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		values, err := mgr.GetHelmReleaseValues(ctx, resolveContext(p.ContextName), p.Namespace, p.Name)
		if err != nil {
			return nil, rpc.MapError(
				cluster.MapActionError(err, fmt.Sprintf("load Helm values for %q", p.Name)),
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to load Helm values: %v", err),
			)
		}
		return map[string]interface{}{"values": values}, nil
	})
}

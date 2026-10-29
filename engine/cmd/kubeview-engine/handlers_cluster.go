package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/diagnostics"
	"github.com/kubeview/engine/internal/ipc"
)

func registerClusterHandlers(
	server *ipc.Server,
	mgr *cluster.Manager,
	diagRunner *diagnostics.Runner,
) {
	// Method: clusters.importKubeconfig
	server.Register("clusters.importKubeconfig", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ImportKubeconfigParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}

		res, err := mgr.ImportKubeconfig(p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: err.Error(),
			}
		}

		server.Log("Successfully imported kubeconfig, active context: %s, total contexts: %d", res.ActiveContext, res.TotalContexts)
		return res, nil
	})

	// Method: clusters.detectSystemConfigs
	server.Register("clusters.detectSystemConfigs", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		res, err := mgr.DetectSystemConfigs()
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to detect system configs: %v", err),
			}
		}
		server.Log("System config detection found %d files with %d contexts", len(res.DiscoveredFiles), len(res.Contexts))
		return res, nil
	})

	// Method: clusters.updateKubeconfigContext
	server.Register("clusters.updateKubeconfigContext", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			YAML        string `json:"yaml"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "contextName is required",
			}
		}
		res, err := mgr.UpdateKubeconfigContext(p.ContextName, p.YAML)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: err.Error(),
			}
		}
		server.Log("Updated kubeconfig context: %s", p.ContextName)
		return res, nil
	})

	// Method: clusters.exportKubeconfig
	server.Register("clusters.exportKubeconfig", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Context     string `json:"context,omitempty"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		contextName := p.ContextName
		if contextName == "" {
			contextName = p.Context
		}
		if contextName == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "contextName is required",
			}
		}

		res, err := mgr.ExportKubeconfig(contextName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: err.Error(),
			}
		}
		server.Log("Exported kubeconfig for context: %s", contextName)
		return res, nil
	})

	// Method: clusters.importDetected
	server.Register("clusters.importDetected", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ImportDetectedContextsParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}

		res, err := mgr.ImportDetectedContexts(p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to import detected contexts: %v", err),
			}
		}
		server.Log("Successfully imported %d system contexts, active context: %s", len(res.ImportedContexts), res.ActiveContext)
		return res, nil
	})

	// Method: clusters.deleteContext
	server.Register("clusters.deleteContext", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if err := mgr.DeleteContext(p.ContextName); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: err.Error(),
			}
		}
		server.Log("Deleted context: %s", p.ContextName)
		return map[string]interface{}{"success": true}, nil
	})

	// Method: clusters.updateEndpoint
	server.Register("clusters.updateEndpoint", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			NewServer   string `json:"newServer"`
			Insecure    *bool  `json:"insecure,omitempty"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" || p.NewServer == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "contextName and newServer are required",
			}
		}
		var insecureArgs []bool
		if p.Insecure != nil {
			insecureArgs = append(insecureArgs, *p.Insecure)
		}
		if err := mgr.UpdateEndpoint(p.ContextName, p.NewServer, insecureArgs...); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: err.Error(),
			}
		}
		server.Log("Updated endpoint for context '%s' to '%s' (insecure: %v)", p.ContextName, p.NewServer, p.Insecure)
		return map[string]interface{}{"success": true, "contextName": p.ContextName, "newServer": p.NewServer}, nil
	})

	// Method: clusters.clearAll
	server.Register("clusters.clearAll", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		if err := mgr.ClearAllContexts(); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: err.Error(),
			}
		}
		server.Log("Cleared all managed clusters (clean slate)")
		return map[string]interface{}{"success": true}, nil
	})

	// Method: clusters.diagnose
	server.Register("clusters.diagnose", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Context     string `json:"context"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}

		ctxName := p.ContextName
		if ctxName == "" {
			ctxName = p.Context
		}
		if ctxName == "" {
			listRes, err := mgr.ListContexts()
			if err == nil {
				ctxName = listRes.CurrentContext
			}
		}

		server.Log("Running 4-stage diagnosis for context: %s", ctxName)

		client, restConfig, err := mgr.GetClientForContext(ctxName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to load context config: %v", err),
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		authInfo := mgr.GetAuthInfoForContext(ctxName)
		diagResult := diagRunner.Diagnose(ctx, ctxName, restConfig, authInfo, client)
		return diagResult, nil
	})

	// Method: clusters.overview
	server.Register("clusters.overview", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ClusterOverviewParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()

		res, err := mgr.GetClusterOverview(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to get cluster overview: %v", err),
			}
		}
		return res, nil
	})
}

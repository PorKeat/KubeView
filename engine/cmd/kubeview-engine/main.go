package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/diagnostics"
	"github.com/kubeview/engine/internal/ipc"
	"github.com/kubeview/engine/internal/stream"
)

func main() {
	configPathFlag := flag.String("kubeconfig", "", "Path to the kubeconfig file")
	flag.Parse()

	server := ipc.NewServer(os.Stdin, os.Stdout)
	server.Log("KubeView Go Engine sidecar initializing...")

	// 1. Initialize cluster manager
	mgr, err := cluster.NewManager(*configPathFlag)
	if err != nil {
		server.Log("Warning: unable to load initial kubeconfig: %v", err)
	}

	diagRunner := diagnostics.NewRunner()
	var resWatcher *cluster.ResourceWatcher

	// Start local HTTP / SSE / WebSocket streaming server
	streamSrv := stream.NewStreamServer(mgr)
	if err := streamSrv.Start("127.0.0.1:0"); err != nil {
		server.Log("Warning: streaming server failed to start: %v", err)
	} else {
		defer streamSrv.Stop()
	}

	// 2. Register RPC Handlers

	// Method: handshake
	server.Register("handshake", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p ipc.HandshakeParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}

		server.Log("Handshake received from client version: %s (protocol %s)", p.ClientVersion, p.ProtocolVersion)

		return &ipc.HandshakeResult{
			EngineVersion:        ipc.EngineVersion,
			ProtocolVersion:      ipc.ProtocolVersion,
			Status:               "ready",
			SupportedAPIVersions: []string{"v1"},
			StreamPort:           streamSrv.GetPort(),
		}, nil
	})

	// Method: clusters.listContexts
	server.Register("clusters.listContexts", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		if mgr == nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrEngineUnavailable,
				Message: "Kubeconfig manager is not initialized",
			}
		}

		res, err := mgr.ListContexts()
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list contexts: %v", err),
			}
		}

		return res, nil
	})

	// Method: clusters.switchContext
	server.Register("clusters.switchContext", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.SwitchContextParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}

		targetCtx := p.ContextName
		if targetCtx == "" {
			targetCtx = p.Context
		}

		if targetCtx == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "contextName parameter is required",
			}
		}

		res, err := mgr.SwitchContext(targetCtx)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sNotFound,
				Message: err.Error(),
			}
		}

		server.Log("Switched active context to: %s", targetCtx)
		if resWatcher != nil {
			resWatcher.SwitchContext(context.Background(), targetCtx)
		}
		return res, nil
	})

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

	// Method: clusters.listNamespaces
	server.Register("clusters.listNamespaces", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListNamespacesParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		targetCtx := p.ContextName
		if targetCtx == "" {
			targetCtx = p.Context
		}

		namespaces, err := mgr.ListNamespaces(ctx, targetCtx)
		if err != nil {
			server.Log("Listing namespaces for '%s' returned error (%v); falling back to default context namespace", targetCtx, err)
			defaultNs := mgr.GetContextNamespace(targetCtx)
			if defaultNs == "" {
				defaultNs = "default"
			}
			return &cluster.ListNamespacesResult{
				Namespaces: []string{defaultNs},
			}, nil
		}

		return &cluster.ListNamespacesResult{
			Namespaces: namespaces,
		}, nil
	})

	// Method: pods.list
	server.Register("pods.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListPodsParams
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

		res, err := mgr.ListPods(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list pods: %v", err),
			}
		}
		return res, nil
	})

	// Method: deployments.list
	server.Register("deployments.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListDeploymentsParams
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

		res, err := mgr.ListDeployments(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list deployments: %v", err),
			}
		}
		return res, nil
	})

	// Method: replicasets.list
	server.Register("replicasets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListReplicaSetsParams
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

		res, err := mgr.ListReplicaSets(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list replicasets: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.logs
	server.Register("pods.logs", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.PodLogsParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		res, err := mgr.GetPodLogs(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to get pod logs: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.delete
	server.Register("pods.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeletePodParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := mgr.DeletePod(ctx, p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to delete pod: %v", err),
			}
		}
		return map[string]interface{}{"success": true, "podName": p.PodName}, nil
	})

	// Method: pods.restart
	server.Register("pods.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.RestartPodParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := mgr.RestartPod(ctx, p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to restart pod: %v", err),
			}
		}
		return map[string]interface{}{"success": true, "restarted": p.PodName}, nil
	})

	// Method: pods.exec
	server.Register("pods.exec", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ExecPodParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		res, err := mgr.ExecPod(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Command execution failed: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.launchDebugContainer
	server.Register("pods.launchDebugContainer", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.LaunchDebugContainerParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		res, err := mgr.LaunchDebugContainer(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to launch debug container: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.yaml
	server.Register("pods.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			PodName     string `json:"podName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetPodYaml(ctx, p.ContextName, p.Namespace, p.PodName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to get pod YAML: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.events
	server.Register("pods.events", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			PodName     string `json:"podName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetPodEvents(ctx, p.ContextName, p.Namespace, p.PodName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to get pod events: %v", err),
			}
		}
		return res, nil
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

	// 3. Setup out-of-band file watcher and live K8s resource stream
	if mgr != nil {
		resWatcher = cluster.NewResourceWatcher(
			mgr,
			func(event cluster.PodChangeEvent) {
				_ = server.SendNotification("pods.changed", event)
				streamSrv.BroadcastNotification("pods.changed", event)
			},
			func(event cluster.PodEventItem) {
				_ = server.SendNotification("events.warning", event)
				streamSrv.BroadcastNotification("events.warning", event)
			},
			func(contextName string) {
				payload := map[string]string{
					"context": contextName,
				}
				_ = server.SendNotification("clusters.overviewChanged", payload)
				streamSrv.BroadcastNotification("clusters.overviewChanged", payload)
			},
		)

		initialCtx := mgr.GetCurrentContext()
		if initialCtx != "" {
			resWatcher.SwitchContext(context.Background(), initialCtx)
		}
		defer resWatcher.Stop()

		watcher := cluster.NewWatcher(mgr, func() {
			server.Log("Emitting clusters.contextsChanged notification")
			contexts, err := mgr.ListContexts()
			if err == nil {
				_ = server.SendNotification("clusters.contextsChanged", contexts)
				streamSrv.BroadcastNotification("clusters.contextsChanged", contexts)
			}
		})

		if err := watcher.Start(); err != nil {
			server.Log("Warning: unable to start kubeconfig watcher: %v", err)
		} else {
			defer watcher.Stop()
		}
	}

	// 4. Handle OS signals
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		server.Log("Signal received, stopping engine...")
		server.Stop()
		os.Exit(0)
	}()

	// 5. Run IPC server
	if err := server.Run(); err != nil {
		server.Log("Engine server stopped: %v", err)
	}
	server.Wait()
}


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
		server.Log("Fatal: unable to initialize kubeconfig manager: %v", err)
		os.Exit(1)
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
			StreamToken:          streamSrv.Token(),
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

	// Method: statefulsets.list
	server.Register("statefulsets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListStatefulSetsParams
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

		res, err := mgr.ListStatefulSets(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list statefulsets: %v", err),
			}
		}
		return res, nil
	})

	// Method: daemonsets.list
	server.Register("daemonsets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListDaemonSetsParams
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
		res, err := mgr.ListDaemonSets(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list daemonsets: %v", err)}
		}
		return res, nil
	})

	// Method: jobs.list
	server.Register("jobs.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListJobsParams
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
		res, err := mgr.ListJobs(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list jobs: %v", err)}
		}
		return res, nil
	})

	// Method: cronjobs.list
	server.Register("cronjobs.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListCronJobsParams
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
		res, err := mgr.ListCronJobs(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list cronjobs: %v", err)}
		}
		return res, nil
	})

	// Method: services.list
	server.Register("services.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListServicesParams
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
		res, err := mgr.ListServices(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list services: %v", err)}
		}
		return res, nil
	})

	// Method: endpoints.list
	server.Register("endpoints.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListEndpointsParams
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
		res, err := mgr.ListEndpoints(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list endpoints: %v", err)}
		}
		return res, nil
	})

	// Method: ingresses.list
	server.Register("ingresses.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListIngressesParams
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
		res, err := mgr.ListIngresses(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list ingresses: %v", err)}
		}
		return res, nil
	})

	// Method: gatewayresources.list
	server.Register("gatewayresources.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListGatewayResourcesParams
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
		res, err := mgr.ListGatewayResources(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list Gateway API resources: %v", err)}
		}
		return res, nil
	})

	// Method: networkpolicies.list
	server.Register("networkpolicies.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListNetworkPoliciesParams
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
		res, err := mgr.ListNetworkPolicies(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list network policies: %v", err)}
		}
		return res, nil
	})

	// Method: ingresses.apply
	server.Register("ingresses.apply", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ApplyIngressParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ApplyIngressYaml(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to apply ingress: %v", err)}
		}
		return res, nil
	})

	// Method: ingresses.delete
	server.Register("ingresses.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeleteIngressParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteIngress(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to delete ingress: %v", err)}
		}
		return map[string]interface{}{"success": true}, nil
	})

	// Method: gatewayresources.apply
	server.Register("gatewayresources.apply", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ApplyGatewayResourceParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ApplyGatewayResourceYaml(ctx, p.ContextName, p.Namespace, p.YAML)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to apply Gateway API resource: %v", err)}
		}
		return res, nil
	})

	// Method: gatewayresources.delete
	server.Register("gatewayresources.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeleteGatewayResourceParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteGatewayResource(ctx, p.ContextName, p.Namespace, p.Kind, p.Name); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to delete Gateway API resource: %v", err)}
		}
		return map[string]interface{}{"success": true}, nil
	})

	// Method: networking.counts
	server.Register("networking.counts", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetNetworkingCounts(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to count networking resources: %v", err)}
		}
		return res, nil
	})

	// Method: networking.observability
	server.Register("networking.observability", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
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
		res, err := mgr.GetNetworkObservability(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to load network observability: %v", err)}
		}
		return res, nil
	})

	// Method: networking.diagnoseService
	server.Register("networking.diagnoseService", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DiagnoseServiceParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		res, err := mgr.DiagnoseService(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to diagnose service: %v", err)}
		}
		return res, nil
	})

	// Method: portforwards.start
	server.Register("portforwards.start", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.PortForwardRequest
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		defer cancel()
		res, err := mgr.StartPortForward(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to start port forward: %v", err)}
		}
		return res, nil
	})

	// Method: portforwards.list
	server.Register("portforwards.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.ListPortForwards(ctx)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to list port forwards: %v", err)}
		}
		return res, nil
	})

	// Method: portforwards.stop
	server.Register("portforwards.stop", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ID == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "id is required"}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.StopPortForward(ctx, p.ID)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to stop port forward: %v", err)}
		}
		return res, nil
	})

	// Method: cilium.list
	server.Register("cilium.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()
		res, err := mgr.ListCiliumResources(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list Cilium resources: %v", err)}
		}
		return res, nil
	})

	// Method: cilium.hubbleFlows
	server.Register("cilium.hubbleFlows", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListHubbleFlowsParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
		defer cancel()
		res, err := mgr.ListHubbleFlows(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to read Hubble flows: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.list
	server.Register("configmaps.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListConfigMaps(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list ConfigMaps: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.yaml
	server.Register("configmaps.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetConfigMapYaml(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get ConfigMap YAML: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.list
	server.Register("secrets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListSecrets(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list Secrets: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.yaml
	server.Register("secrets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetSecretYaml(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get Secret YAML: %v", err)}
		}
		return res, nil
	})

	// Method: persistentvolumes.list
	server.Register("persistentvolumes.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
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
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListPersistentVolumes(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list PersistentVolumes: %v", err)}
		}
		return res, nil
	})

	// Method: persistentvolumes.yaml
	server.Register("persistentvolumes.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetPersistentVolumeYaml(ctx, p.ContextName, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get PersistentVolume YAML: %v", err)}
		}
		return res, nil
	})

	// Method: storageclasses.list
	server.Register("storageclasses.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
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
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListStorageClasses(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list StorageClasses: %v", err)}
		}
		return res, nil
	})

	// Method: storageclasses.yaml
	server.Register("storageclasses.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetStorageClassYaml(ctx, p.ContextName, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get StorageClass YAML: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.editData
	server.Register("configmaps.editData", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetConfigMapEditData(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to load ConfigMap editor: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.apply
	server.Register("configmaps.apply", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ConfigMapUpdateParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ApplyConfigMap(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to update ConfigMap: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.reveal
	server.Register("secrets.reveal", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetSecretEditData(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to reveal Secret editor: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.apply
	server.Register("secrets.apply", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.SecretUpdateParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ApplySecret(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to update Secret: %v", err)}
		}
		return res, nil
	})

	// Method: serviceaccounts.list
	server.Register("serviceaccounts.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListServiceAccounts(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list ServiceAccounts: %v", err)}
		}
		return res, nil
	})

	// Method: serviceaccounts.yaml
	server.Register("serviceaccounts.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetServiceAccountYaml(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get ServiceAccount YAML: %v", err)}
		}
		return res, nil
	})

	// Method: rbac.list
	server.Register("rbac.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListRBACResources(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list RBAC resources: %v", err)}
		}
		return res, nil
	})

	// Method: rbac.yaml
	server.Register("rbac.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Kind        string `json:"kind"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetRBACResourceYaml(ctx, p.ContextName, p.Kind, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get RBAC YAML: %v", err)}
		}
		return res, nil
	})

	// Method: crds.list
	server.Register("crds.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
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
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListCRDs(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list CustomResourceDefinitions: %v", err)}
		}
		return res, nil
	})

	// Method: crds.yaml
	server.Register("crds.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetCRDYaml(ctx, p.ContextName, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get CRD YAML: %v", err)}
		}
		return res, nil
	})

	// Method: crds.instances
	server.Register("crds.instances", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Group       string `json:"group"`
			Version     string `json:"version"`
			Resource    string `json:"resource"`
			Namespace   string `json:"namespace"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListCustomResourceInstances(ctx, p.ContextName, p.Group, p.Version, p.Resource, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list custom resources: %v", err)}
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

	// Method: deployments.restart
	server.Register("deployments.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.RestartDeployment(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to restart deployment: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: deployments.scale
	server.Register("deployments.scale", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Replicas == nil || *p.Replicas < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and non-negative replicas are required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.ScaleDeployment(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to scale deployment: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "replicas": *p.Replicas}, nil
	})

	// Method: deployments.delete
	server.Register("deployments.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteDeployment(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete deployment: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: replicasets.scale
	server.Register("replicasets.scale", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ReplicaSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Replicas == nil || *p.Replicas < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and non-negative replicas are required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.ScaleReplicaSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to scale replicaset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "replicas": *p.Replicas}, nil
	})

	// Method: replicasets.delete
	server.Register("replicasets.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ReplicaSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteReplicaSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete replicaset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: statefulsets.restart
	server.Register("statefulsets.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.StatefulSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.RestartStatefulSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to restart statefulset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: statefulsets.scale
	server.Register("statefulsets.scale", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.StatefulSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Replicas == nil || *p.Replicas < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and non-negative replicas are required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.ScaleStatefulSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to scale statefulset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "replicas": *p.Replicas}, nil
	})

	// Method: statefulsets.delete
	server.Register("statefulsets.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.StatefulSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteStatefulSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete statefulset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: daemonsets.restart
	server.Register("daemonsets.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DaemonSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.RestartDaemonSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to restart daemonset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: daemonsets.delete
	server.Register("daemonsets.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DaemonSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteDaemonSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete daemonset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: jobs.delete
	server.Register("jobs.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.JobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteJob(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete job: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: cronjobs.suspend
	server.Register("cronjobs.suspend", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.SetCronJobSuspend(ctx, p, true); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to suspend cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "suspend": true}, nil
	})

	// Method: cronjobs.resume
	server.Register("cronjobs.resume", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.SetCronJobSuspend(ctx, p, false); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to resume cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "suspend": false}, nil
	})

	// Method: cronjobs.delete
	server.Register("cronjobs.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteCronJob(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: cronjobs.trigger
	server.Register("cronjobs.trigger", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		jobName, err := mgr.TriggerCronJob(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to trigger cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "jobName": jobName}, nil
	})

	// Method: deployments.yaml
	server.Register("deployments.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName    string `json:"contextName"`
			Namespace      string `json:"namespace"`
			DeploymentName string `json:"deploymentName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetDeploymentYaml(ctx, p.ContextName, p.Namespace, p.DeploymentName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get deployment YAML: %v", err)}
		}
		return res, nil
	})

	// Method: replicasets.yaml
	server.Register("replicasets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName    string `json:"contextName"`
			Namespace      string `json:"namespace"`
			ReplicaSetName string `json:"replicaSetName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetReplicaSetYaml(ctx, p.ContextName, p.Namespace, p.ReplicaSetName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get replicaset YAML: %v", err)}
		}
		return res, nil
	})

	// Method: statefulsets.yaml
	server.Register("statefulsets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName     string `json:"contextName"`
			Namespace       string `json:"namespace"`
			StatefulSetName string `json:"statefulSetName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetStatefulSetYaml(ctx, p.ContextName, p.Namespace, p.StatefulSetName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get statefulset YAML: %v", err)}
		}
		return res, nil
	})

	// Method: daemonsets.yaml
	server.Register("daemonsets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName   string `json:"contextName"`
			Namespace     string `json:"namespace"`
			DaemonSetName string `json:"daemonSetName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetDaemonSetYaml(ctx, p.ContextName, p.Namespace, p.DaemonSetName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get daemonset YAML: %v", err)}
		}
		return res, nil
	})

	// Method: jobs.yaml
	server.Register("jobs.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			JobName     string `json:"jobName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetJobYaml(ctx, p.ContextName, p.Namespace, p.JobName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get job YAML: %v", err)}
		}
		return res, nil
	})

	// Method: cronjobs.yaml
	server.Register("cronjobs.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			CronJobName string `json:"cronJobName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetCronJobYaml(ctx, p.ContextName, p.Namespace, p.CronJobName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get cronjob YAML: %v", err)}
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

	// Method: services.yaml
	server.Register("services.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			ServiceName string `json:"serviceName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetServiceYaml(ctx, p.ContextName, p.Namespace, p.ServiceName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get service YAML: %v", err)}
		}
		return res, nil
	})

	// Method: endpoints.yaml
	server.Register("endpoints.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName   string `json:"contextName"`
			Namespace     string `json:"namespace"`
			EndpointsName string `json:"endpointsName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetEndpointsYaml(ctx, p.ContextName, p.Namespace, p.EndpointsName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get endpoints YAML: %v", err)}
		}
		return res, nil
	})

	// Method: ingresses.yaml
	server.Register("ingresses.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			IngressName string `json:"ingressName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetIngressYaml(ctx, p.ContextName, p.Namespace, p.IngressName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get ingress YAML: %v", err)}
		}
		return res, nil
	})

	// Method: gatewayresources.yaml
	server.Register("gatewayresources.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Kind        string `json:"kind"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetGatewayResourceYaml(ctx, p.ContextName, p.Namespace, p.Kind, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get Gateway API resource YAML: %v", err)}
		}
		return res, nil
	})

	// Method: networkpolicies.yaml
	server.Register("networkpolicies.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName       string `json:"contextName"`
			Namespace         string `json:"namespace"`
			NetworkPolicyName string `json:"networkPolicyName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetNetworkPolicyYaml(ctx, p.ContextName, p.Namespace, p.NetworkPolicyName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get network policy YAML: %v", err)}
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

	registerFleetHandlers(server, mgr)

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

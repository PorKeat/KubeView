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

		if p.ContextName == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "contextName parameter is required",
			}
		}

		res, err := mgr.SwitchContext(p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sNotFound,
				Message: err.Error(),
			}
		}

		server.Log("Switched active context to: %s", p.ContextName)
		return res, nil
	})

	// Method: clusters.diagnose
	server.Register("clusters.diagnose", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}

		ctxName := p.ContextName
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

		diagResult := diagRunner.Diagnose(ctx, ctxName, restConfig, nil, client)
		return diagResult, nil
	})

	// Method: clusters.listNamespaces
	server.Register("clusters.listNamespaces", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListNamespacesParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()

		namespaces, err := mgr.ListNamespaces(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sForbidden,
				Message: fmt.Sprintf("Failed to list namespaces: %v", err),
			}
		}

		return &cluster.ListNamespacesResult{
			Namespaces: namespaces,
		}, nil
	})

	// 3. Setup out-of-band file watcher
	if mgr != nil {
		watcher := cluster.NewWatcher(mgr, func() {
			server.Log("Emitting clusters.contextsChanged notification")
			contexts, err := mgr.ListContexts()
			if err == nil {
				_ = server.SendNotification("clusters.contextsChanged", contexts)
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


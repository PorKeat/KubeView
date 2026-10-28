package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"

	"github.com/kubeview/engine/internal/bootstrap"
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
	getResWatcher := func() *cluster.ResourceWatcher { return resWatcher }

	// Start local HTTP / SSE / WebSocket streaming server
	streamSrv := stream.NewStreamServer(mgr)
	if err := streamSrv.Start("127.0.0.1:0"); err != nil {
		server.Log("Warning: streaming server failed to start: %v", err)
	} else {
		defer streamSrv.Stop()
	}

	// 2. Register RPC handlers
	registerCoreHandlers(server, streamSrv)
	registerClusterHandlers(server, mgr, diagRunner)
	registerWorkloadHandlers(server, mgr)
	registerNetworkingHandlers(server, mgr)
	registerConfigAccessHandlers(server, mgr)
	registerActionHandlers(server, mgr)
	if err := bootstrap.RegisterContextsModule(server, mgr, getResWatcher); err != nil {
		server.Log("Fatal: unable to initialize contexts module: %v", err)
		os.Exit(1)
	}
	if err := bootstrap.RegisterFleetModule(server, mgr); err != nil {
		server.Log("Fatal: unable to initialize fleet module: %v", err)
		os.Exit(1)
	}
	if err := bootstrap.RegisterDiagnosisModule(server, mgr); err != nil {
		server.Log("Fatal: unable to initialize diagnosis module: %v", err)
		os.Exit(1)
	}
	if err := bootstrap.RegisterPermissionsModule(server, mgr); err != nil {
		server.Log("Fatal: unable to initialize permissions module: %v", err)
		os.Exit(1)
	}
	if err := bootstrap.RegisterResourcesModule(server, mgr); err != nil {
		server.Log("Fatal: unable to initialize resources module: %v", err)
		os.Exit(1)
	}

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

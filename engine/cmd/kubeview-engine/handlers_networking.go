package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerNetworkingHandlers(server *ipc.Server, mgr *cluster.Manager) {
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
}

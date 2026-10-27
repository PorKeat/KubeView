package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	appcontexts "github.com/kubeview/engine/internal/application/contexts"
	domaincontexts "github.com/kubeview/engine/internal/domain/contexts"
	"github.com/kubeview/engine/internal/ipc"
)

type contextResponse struct {
	Name      string `json:"name"`
	Cluster   string `json:"cluster"`
	Server    string `json:"server"`
	User      string `json:"user"`
	Namespace string `json:"namespace"`
	IsCurrent bool   `json:"isCurrent"`
	Provider  string `json:"provider"`
	AuthType  string `json:"authType"`
}

type contextListResponse struct {
	CurrentContext string            `json:"currentContext"`
	Contexts       []contextResponse `json:"contexts"`
	ConfigPath     string            `json:"configPath"`
}

type switchContextParams struct {
	ContextName string `json:"contextName"`
	Context     string `json:"context,omitempty"`
}

type switchContextResponse struct {
	ActiveContext string          `json:"activeContext"`
	Context       contextResponse `json:"context"`
	Status        string          `json:"status"`
}

type listNamespacesParams struct {
	ContextName string `json:"contextName,omitempty"`
	Context     string `json:"context,omitempty"`
}

type listNamespacesResponse struct {
	Namespaces []string `json:"namespaces"`
}

func RegisterContextsHandlers(server *ipc.Server, service *appcontexts.Service) {
	server.Register("clusters.listContexts", func(_ json.RawMessage) (interface{}, *ipc.RPCError) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		result, err := service.List(ctx)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list contexts: %v", err),
			}
		}
		return contextListToResponse(result), nil
	})

	server.Register("clusters.switchContext", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p switchContextParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		target := p.ContextName
		if target == "" {
			target = p.Context
		}
		if target == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "contextName parameter is required",
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		result, err := service.Switch(ctx, target)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sNotFound,
				Message: err.Error(),
			}
		}
		return &switchContextResponse{
			ActiveContext: result.ActiveContext,
			Context:       contextToResponse(result.Context),
			Status:        result.Status,
		}, nil
	})

	server.Register("clusters.listNamespaces", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p listNamespacesParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		target := p.ContextName
		if target == "" {
			target = p.Context
		}

		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		namespaces, err := service.ListNamespaces(ctx, target)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list namespaces: %v", err),
			}
		}
		return &listNamespacesResponse{Namespaces: namespaces}, nil
	})
}

func contextListToResponse(result *domaincontexts.ListResult) *contextListResponse {
	contexts := make([]contextResponse, 0, len(result.Contexts))
	for _, item := range result.Contexts {
		contexts = append(contexts, contextToResponse(item))
	}
	return &contextListResponse{
		CurrentContext: result.CurrentContext,
		Contexts:       contexts,
		ConfigPath:     result.ConfigPath,
	}
}

func contextToResponse(item domaincontexts.Context) contextResponse {
	return contextResponse{
		Name:      item.Name,
		Cluster:   item.Cluster,
		Server:    item.Server,
		User:      item.User,
		Namespace: item.Namespace,
		IsCurrent: item.IsCurrent,
		Provider:  item.Provider,
		AuthType:  item.AuthType,
	}
}

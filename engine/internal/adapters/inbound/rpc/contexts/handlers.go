package contexts

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
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

type listResponse struct {
	CurrentContext string            `json:"currentContext"`
	Contexts       []contextResponse `json:"contexts"`
	ConfigPath     string            `json:"configPath"`
}

type switchParams struct {
	ContextName string `json:"contextName"`
	Context     string `json:"context,omitempty"`
}

type switchResponse struct {
	ActiveContext string          `json:"activeContext"`
	Context       contextResponse `json:"context"`
	Status        string          `json:"status"`
}

type namespacesParams struct {
	ContextName string `json:"contextName,omitempty"`
	Context     string `json:"context,omitempty"`
}

type namespacesResponse struct {
	Namespaces []string `json:"namespaces"`
}

func RegisterHandlers(server *ipc.Server, service *appcontexts.Service) {
	rpc.Register(server, "clusters.listContexts", 5*time.Second, func(
		ctx context.Context,
		_ json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		result, err := service.List(ctx)
		if err != nil {
			return nil, rpc.MapError(
				err,
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to list contexts: %v", err),
			)
		}
		return listToResponse(result), nil
	})

	rpc.Register(server, "clusters.switchContext", 5*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p switchParams
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

		result, err := service.Switch(ctx, target)
		if err != nil {
			return nil, rpc.MapError(err, ipc.ErrK8sNotFound, err.Error())
		}
		return &switchResponse{
			ActiveContext: result.ActiveContext,
			Context:       contextToResponse(result.Context),
			Status:        result.Status,
		}, nil
	})

	rpc.Register(server, "clusters.listNamespaces", 3*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p namespacesParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		target := p.ContextName
		if target == "" {
			target = p.Context
		}

		namespaces, err := service.ListNamespaces(ctx, target)
		if err != nil {
			return nil, rpc.MapError(
				err,
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to list namespaces: %v", err),
			)
		}
		return &namespacesResponse{Namespaces: namespaces}, nil
	})
}

func listToResponse(result *domaincontexts.ListResult) *listResponse {
	contexts := make([]contextResponse, 0, len(result.Contexts))
	for _, item := range result.Contexts {
		contexts = append(contexts, contextToResponse(item))
	}
	return &listResponse{
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

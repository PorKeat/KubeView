package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	appresources "github.com/kubeview/engine/internal/application/resources"
	domainresources "github.com/kubeview/engine/internal/domain/resources"
	"github.com/kubeview/engine/internal/ipc"
)

type getParams struct {
	ContextName string `json:"contextName,omitempty"`
	APIVersion  string `json:"apiVersion"`
	Kind        string `json:"kind"`
	Resource    string `json:"resource"`
	Name        string `json:"name"`
	Namespace   string `json:"namespace,omitempty"`
}

type applyParams struct {
	ContextName string `json:"contextName,omitempty"`
	YAML        string `json:"yaml"`
	Resource    string `json:"resource,omitempty"`
	DryRun      bool   `json:"dryRun,omitempty"`
	Name        string `json:"name,omitempty"`
	Namespace   string `json:"namespace,omitempty"`
}

type deleteParams struct {
	ContextName string `json:"contextName,omitempty"`
	APIVersion  string `json:"apiVersion"`
	Kind        string `json:"kind"`
	Resource    string `json:"resource"`
	Name        string `json:"name"`
	Namespace   string `json:"namespace,omitempty"`
}

type capabilitiesParams struct {
	ContextName string `json:"contextName,omitempty"`
	APIVersion  string `json:"apiVersion"`
	Kind        string `json:"kind"`
	Resource    string `json:"resource"`
	Name        string `json:"name,omitempty"`
	Namespace   string `json:"namespace,omitempty"`
}

type getResponse struct {
	APIVersion string `json:"apiVersion"`
	Kind       string `json:"kind"`
	Resource   string `json:"resource"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace,omitempty"`
	YAML       string `json:"yaml"`
}

type applyResponse struct {
	APIVersion string `json:"apiVersion"`
	Kind       string `json:"kind"`
	Resource   string `json:"resource"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace,omitempty"`
	Created    bool   `json:"created"`
	DryRun     bool   `json:"dryRun"`
	YAML       string `json:"yaml"`
}

type deleteResponse struct {
	Deleted bool `json:"deleted"`
}

type capabilitiesResponse struct {
	Get     bool              `json:"get"`
	Create  bool              `json:"create"`
	Update  bool              `json:"update"`
	Delete  bool              `json:"delete"`
	Reasons map[string]string `json:"reasons,omitempty"`
}

func RegisterHandlers(server *ipc.Server, service *appresources.Service) {
	rpc.Register(server, "resources.get", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p getParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, invalidParams(err)
		}
		result, err := service.Get(ctx, p.ContextName, domainresources.Ref{
			APIVersion: p.APIVersion,
			Kind:       p.Kind,
			Resource:   p.Resource,
			Name:       p.Name,
			Namespace:  p.Namespace,
		})
		if err != nil {
			return nil, rpc.MapError(
				err, ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to get resource %s/%s: %v", p.Kind, p.Name, err),
			)
		}
		return &getResponse{
			APIVersion: result.APIVersion,
			Kind:       result.Kind,
			Resource:   result.Resource,
			Name:       result.Name,
			Namespace:  result.Namespace,
			YAML:       result.YAML,
		}, nil
	})

	rpc.Register(server, "resources.apply", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p applyParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, invalidParams(err)
		}
		result, err := service.Apply(ctx, p.ContextName, domainresources.ApplyRequest{
			YAML:      p.YAML,
			Resource:  p.Resource,
			Name:      p.Name,
			Namespace: p.Namespace,
			DryRun:    p.DryRun,
		})
		if err != nil {
			return nil, rpc.MapError(
				err, ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to apply resource: %v", err),
			)
		}
		return &applyResponse{
			APIVersion: result.APIVersion,
			Kind:       result.Kind,
			Resource:   result.Resource,
			Name:       result.Name,
			Namespace:  result.Namespace,
			Created:    result.Created,
			DryRun:     result.DryRun,
			YAML:       result.YAML,
		}, nil
	})

	rpc.Register(server, "resources.delete", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p deleteParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, invalidParams(err)
		}
		err := service.Delete(ctx, p.ContextName, domainresources.Ref{
			APIVersion: p.APIVersion,
			Kind:       p.Kind,
			Resource:   p.Resource,
			Name:       p.Name,
			Namespace:  p.Namespace,
		})
		if err != nil {
			return nil, rpc.MapError(
				err, ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to delete resource %s/%s: %v", p.Kind, p.Name, err),
			)
		}
		return &deleteResponse{Deleted: true}, nil
	})

	rpc.Register(server, "resources.capabilities", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p capabilitiesParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, invalidParams(err)
		}
		result, err := service.Capabilities(ctx, p.ContextName, domainresources.Ref{
			APIVersion: p.APIVersion,
			Kind:       p.Kind,
			Resource:   p.Resource,
			Name:       p.Name,
			Namespace:  p.Namespace,
		})
		if err != nil {
			return nil, rpc.MapError(
				err, ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to check resource capabilities: %v", err),
			)
		}
		return &capabilitiesResponse{
			Get:     result.Get,
			Create:  result.Create,
			Update:  result.Update,
			Delete:  result.Delete,
			Reasons: result.Reasons,
		}, nil
	})
}

func invalidParams(err error) *ipc.RPCError {
	return &ipc.RPCError{
		Code:    ipc.ErrCodeInvalidParams,
		Message: fmt.Sprintf("Invalid params: %v", err),
	}
}

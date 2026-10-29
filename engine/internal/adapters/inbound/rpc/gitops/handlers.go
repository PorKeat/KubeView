package gitops

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	appgitops "github.com/kubeview/engine/internal/application/gitops"
	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
	"github.com/kubeview/engine/internal/ipc"
)

type scanParams struct {
	ContextName string `json:"contextName,omitempty"`
	Path        string `json:"path"`
}

type resourceDriftResponse struct {
	APIVersion  string `json:"apiVersion"`
	Kind        string `json:"kind"`
	Resource    string `json:"resource"`
	Name        string `json:"name"`
	Namespace   string `json:"namespace,omitempty"`
	SourceFile  string `json:"sourceFile"`
	Status      string `json:"status"`
	DesiredYAML string `json:"desiredYaml"`
	LiveYAML    string `json:"liveYaml,omitempty"`
	Message     string `json:"message,omitempty"`
}

type scanResponse struct {
	ContextName string                  `json:"contextName"`
	Path        string                  `json:"path"`
	ScannedAt   string                  `json:"scannedAt"`
	Total       int                     `json:"total"`
	Clean       int                     `json:"clean"`
	Changed     int                     `json:"changed"`
	Missing     int                     `json:"missing"`
	Errors      int                     `json:"errors"`
	Resources   []resourceDriftResponse `json:"resources"`
}

func RegisterHandlers(server *ipc.Server, service *appgitops.Service) {
	rpc.Register(server, "gitops.scan", 30*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		if service == nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrEngineUnavailable,
				Message: "GitOps service is not initialized",
			}
		}

		var parsed scanParams
		if err := json.Unmarshal(params, &parsed); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}

		report, err := service.Scan(ctx, appgitops.ScanRequest{
			ContextName: parsed.ContextName,
			Path:        parsed.Path,
		})
		if err != nil {
			return nil, rpc.MapError(
				err,
				ipc.ErrCodeInternalError,
				fmt.Sprintf("Failed to scan GitOps drift: %v", err),
			)
		}
		return reportToResponse(report), nil
	})
}

func reportToResponse(report *domaingitops.Report) *scanResponse {
	response := &scanResponse{Resources: []resourceDriftResponse{}}
	if report == nil {
		return response
	}

	response.ContextName = report.ContextName
	response.Path = report.Path
	response.ScannedAt = report.ScannedAt.UTC().Format(time.RFC3339)
	response.Total = report.Total
	response.Clean = report.Clean
	response.Changed = report.Changed
	response.Missing = report.Missing
	response.Errors = report.Errors
	response.Resources = make([]resourceDriftResponse, 0, len(report.Resources))
	for _, resource := range report.Resources {
		response.Resources = append(response.Resources, resourceDriftResponse{
			APIVersion:  resource.APIVersion,
			Kind:        resource.Kind,
			Resource:    resource.Resource,
			Name:        resource.Name,
			Namespace:   resource.Namespace,
			SourceFile:  resource.SourceFile,
			Status:      string(resource.Status),
			DesiredYAML: resource.DesiredYAML,
			LiveYAML:    resource.LiveYAML,
			Message:     resource.Message,
		})
	}
	return response
}

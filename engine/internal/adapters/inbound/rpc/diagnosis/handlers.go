package diagnosis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	appdiagnosis "github.com/kubeview/engine/internal/application/diagnosis"
	domaindiagnosis "github.com/kubeview/engine/internal/domain/diagnosis"
	"github.com/kubeview/engine/internal/ipc"
)

type diagnoseParams struct {
	ContextName string `json:"contextName,omitempty"`
	Namespace   string `json:"namespace"`
	PodName     string `json:"podName"`
}

type resourceItemResponse struct {
	CPU    string `json:"cpu,omitempty"`
	Memory string `json:"memory,omitempty"`
}

type probeResponse struct {
	Kind                string `json:"kind"`
	Configured          bool   `json:"configured"`
	Handler             string `json:"handler,omitempty"`
	InitialDelaySeconds int32  `json:"initialDelaySeconds,omitempty"`
	TimeoutSeconds      int32  `json:"timeoutSeconds,omitempty"`
	PeriodSeconds       int32  `json:"periodSeconds,omitempty"`
	FailureThreshold    int32  `json:"failureThreshold,omitempty"`
	SuccessThreshold    int32  `json:"successThreshold,omitempty"`
	Status              string `json:"status"`
	Message             string `json:"message,omitempty"`
}

type containerResponse struct {
	Name                  string                `json:"name"`
	Image                 string                `json:"image"`
	Ready                 bool                  `json:"ready"`
	RestartCount          int32                 `json:"restartCount"`
	State                 string                `json:"state"`
	StateReason           string                `json:"stateReason,omitempty"`
	StateMessage          string                `json:"stateMessage,omitempty"`
	ExitCode              *int32                `json:"exitCode,omitempty"`
	LastTerminatedReason  string                `json:"lastTerminatedReason,omitempty"`
	LastTerminatedMessage string                `json:"lastTerminatedMessage,omitempty"`
	Requests              *resourceItemResponse `json:"requests,omitempty"`
	Limits                *resourceItemResponse `json:"limits,omitempty"`
	CPUUsageMillicores    int64                 `json:"cpuUsageMillicores,omitempty"`
	MemoryUsageBytes      int64                 `json:"memoryUsageBytes,omitempty"`
	MetricsAvailable      bool                  `json:"metricsAvailable"`
	Probes                []probeResponse       `json:"probes"`
	LogExcerpt            string                `json:"logExcerpt,omitempty"`
	LogSource             string                `json:"logSource,omitempty"`
	LogError              string                `json:"logError,omitempty"`
}

type conditionResponse struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
}

type eventResponse struct {
	Context                 string `json:"context,omitempty"`
	Type                    string `json:"type"`
	Reason                  string `json:"reason"`
	Message                 string `json:"message"`
	Count                   int32  `json:"count"`
	LastTimestamp           string `json:"lastTimestamp"`
	Source                  string `json:"source"`
	InvolvedObjectKind      string `json:"involvedObjectKind,omitempty"`
	InvolvedObjectName      string `json:"involvedObjectName,omitempty"`
	InvolvedObjectNamespace string `json:"involvedObjectNamespace,omitempty"`
}

type evidenceResponse struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Status  string   `json:"status"`
	Summary string   `json:"summary"`
	Details []string `json:"details,omitempty"`
}

type commandResponse struct {
	Label       string `json:"label"`
	Command     string `json:"command"`
	Description string `json:"description,omitempty"`
}

type fixResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

type diagnoseResponse struct {
	ContextName       string              `json:"contextName"`
	Namespace         string              `json:"namespace"`
	PodName           string              `json:"podName"`
	GeneratedAt       string              `json:"generatedAt"`
	Severity          string              `json:"severity"`
	IssueType         string              `json:"issueType"`
	Healthy           bool                `json:"healthy"`
	Title             string              `json:"title"`
	Summary           string              `json:"summary"`
	RootCause         string              `json:"rootCause"`
	OwnerKind         string              `json:"ownerKind,omitempty"`
	OwnerName         string              `json:"ownerName,omitempty"`
	NodeName          string              `json:"nodeName,omitempty"`
	Conditions        []conditionResponse `json:"conditions"`
	Containers        []containerResponse `json:"containers"`
	Events            []eventResponse     `json:"events"`
	Evidence          []evidenceResponse  `json:"evidence"`
	SuggestedCommands []commandResponse   `json:"suggestedCommands"`
	SuggestedFixes    []fixResponse       `json:"suggestedFixes"`
}

func RegisterHandlers(server *ipc.Server, service *appdiagnosis.Service) {
	rpc.Register(server, "pods.diagnose", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p diagnoseParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}

		result, err := service.Diagnose(ctx, appdiagnosis.Params{
			ContextName: p.ContextName,
			Namespace:   p.Namespace,
			PodName:     p.PodName,
		})
		if err != nil {
			return nil, rpc.MapError(
				err,
				ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to diagnose pod: %v", err),
			)
		}
		return resultToResponse(result), nil
	})
}

func resultToResponse(result *domaindiagnosis.Result) *diagnoseResponse {
	return &diagnoseResponse{
		ContextName:       result.ContextName,
		Namespace:         result.Namespace,
		PodName:           result.PodName,
		GeneratedAt:       result.GeneratedAt.Format(time.RFC3339),
		Severity:          result.Severity,
		IssueType:         result.IssueType,
		Healthy:           result.Healthy,
		Title:             result.Title,
		Summary:           result.Summary,
		RootCause:         result.RootCause,
		OwnerKind:         result.OwnerKind,
		OwnerName:         result.OwnerName,
		NodeName:          result.NodeName,
		Conditions:        conditionsToResponse(result.Conditions),
		Containers:        containersToResponse(result.Containers),
		Events:            eventsToResponse(result.Events),
		Evidence:          evidenceToResponse(result.Evidence),
		SuggestedCommands: commandsToResponse(result.SuggestedCommands),
		SuggestedFixes:    fixesToResponse(result.SuggestedFixes),
	}
}

func conditionsToResponse(conditions []domaindiagnosis.Condition) []conditionResponse {
	response := make([]conditionResponse, 0, len(conditions))
	for _, condition := range conditions {
		response = append(response, conditionResponse{
			Type:               condition.Type,
			Status:             condition.Status,
			LastTransitionTime: condition.LastTransitionTime,
			Reason:             condition.Reason,
			Message:            condition.Message,
		})
	}
	return response
}

func eventsToResponse(events []domaindiagnosis.Event) []eventResponse {
	response := make([]eventResponse, 0, len(events))
	for _, event := range events {
		response = append(response, eventResponse{
			Context:                 event.Context,
			Type:                    event.Type,
			Reason:                  event.Reason,
			Message:                 event.Message,
			Count:                   event.Count,
			LastTimestamp:           event.LastTimestamp,
			Source:                  event.Source,
			InvolvedObjectKind:      event.InvolvedObjectKind,
			InvolvedObjectName:      event.InvolvedObjectName,
			InvolvedObjectNamespace: event.InvolvedObjectNamespace,
		})
	}
	return response
}

func containersToResponse(containers []domaindiagnosis.Container) []containerResponse {
	response := make([]containerResponse, 0, len(containers))
	for _, container := range containers {
		response = append(response, containerResponse{
			Name:                  container.Name,
			Image:                 container.Image,
			Ready:                 container.Ready,
			RestartCount:          container.RestartCount,
			State:                 container.State,
			StateReason:           container.StateReason,
			StateMessage:          container.StateMessage,
			ExitCode:              container.ExitCode,
			LastTerminatedReason:  container.LastTerminatedReason,
			LastTerminatedMessage: container.LastTerminatedMessage,
			Requests:              resourceToResponse(container.Requests),
			Limits:                resourceToResponse(container.Limits),
			CPUUsageMillicores:    container.CPUUsageMillicores,
			MemoryUsageBytes:      container.MemoryUsageBytes,
			MetricsAvailable:      container.MetricsAvailable,
			Probes:                probesToResponse(container.Probes),
			LogExcerpt:            container.LogExcerpt,
			LogSource:             container.LogSource,
			LogError:              container.LogError,
		})
	}
	return response
}

func probesToResponse(probes []domaindiagnosis.Probe) []probeResponse {
	response := make([]probeResponse, 0, len(probes))
	for _, probe := range probes {
		response = append(response, probeResponse{
			Kind:                probe.Kind,
			Configured:          probe.Configured,
			Handler:             probe.Handler,
			InitialDelaySeconds: probe.InitialDelaySeconds,
			TimeoutSeconds:      probe.TimeoutSeconds,
			PeriodSeconds:       probe.PeriodSeconds,
			FailureThreshold:    probe.FailureThreshold,
			SuccessThreshold:    probe.SuccessThreshold,
			Status:              probe.Status,
			Message:             probe.Message,
		})
	}
	return response
}

func resourceToResponse(item *domaindiagnosis.ResourceList) *resourceItemResponse {
	if item == nil {
		return nil
	}
	return &resourceItemResponse{CPU: item.CPU, Memory: item.Memory}
}

func evidenceToResponse(evidence []domaindiagnosis.Evidence) []evidenceResponse {
	response := make([]evidenceResponse, 0, len(evidence))
	for _, item := range evidence {
		response = append(response, evidenceResponse{
			ID:      item.ID,
			Label:   item.Label,
			Status:  item.Status,
			Summary: item.Summary,
			Details: item.Details,
		})
	}
	return response
}

func commandsToResponse(commands []domaindiagnosis.Command) []commandResponse {
	response := make([]commandResponse, 0, len(commands))
	for _, command := range commands {
		response = append(response, commandResponse{
			Label:       command.Label,
			Command:     command.Command,
			Description: command.Description,
		})
	}
	return response
}

func fixesToResponse(fixes []domaindiagnosis.Fix) []fixResponse {
	response := make([]fixResponse, 0, len(fixes))
	for _, fix := range fixes {
		response = append(response, fixResponse{
			ID:          fix.ID,
			Title:       fix.Title,
			Description: fix.Description,
			Severity:    fix.Severity,
		})
	}
	return response
}

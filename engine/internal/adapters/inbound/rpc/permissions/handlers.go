package permissions

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/adapters/inbound/rpc"
	apppermissions "github.com/kubeview/engine/internal/application/permissions"
	domainpermissions "github.com/kubeview/engine/internal/domain/permissions"
	"github.com/kubeview/engine/internal/ipc"
)

type subjectRequest struct {
	Kind      string   `json:"kind"`
	Name      string   `json:"name"`
	Namespace string   `json:"namespace,omitempty"`
	Groups    []string `json:"groups,omitempty"`
}

type effectiveParams struct {
	ContextName string         `json:"contextName,omitempty"`
	Subject     subjectRequest `json:"subject"`
}

type operationRequest struct {
	Namespace      string `json:"namespace,omitempty"`
	Verb           string `json:"verb"`
	APIGroup       string `json:"apiGroup,omitempty"`
	Resource       string `json:"resource,omitempty"`
	Subresource    string `json:"subresource,omitempty"`
	ResourceName   string `json:"resourceName,omitempty"`
	NonResourceURL string `json:"nonResourceURL,omitempty"`
	ClusterScoped  bool   `json:"clusterScoped,omitempty"`
}

type explainParams struct {
	ContextName string           `json:"contextName,omitempty"`
	Subject     subjectRequest   `json:"subject"`
	Operation   operationRequest `json:"operation"`
}

type currentIdentityParams struct {
	ContextName string `json:"contextName,omitempty"`
}

type subjectResponse struct {
	Kind      string   `json:"kind"`
	Name      string   `json:"name"`
	Namespace string   `json:"namespace,omitempty"`
	Groups    []string `json:"groups,omitempty"`
}

type bindingSubjectResponse struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

type bindingEvidenceResponse struct {
	Kind      string                   `json:"kind"`
	Name      string                   `json:"name"`
	Namespace string                   `json:"namespace,omitempty"`
	RoleKind  string                   `json:"roleKind"`
	RoleName  string                   `json:"roleName"`
	Subjects  []bindingSubjectResponse `json:"subjects"`
}

type ruleEvidenceResponse struct {
	Verbs           []string `json:"verbs"`
	APIGroups       []string `json:"apiGroups"`
	Resources       []string `json:"resources"`
	ResourceNames   []string `json:"resourceNames"`
	NonResourceURLs []string `json:"nonResourceURLs"`
	Scope           string   `json:"scope"`
	Namespace       string   `json:"namespace,omitempty"`
	BindingKind     string   `json:"bindingKind"`
	BindingName     string   `json:"bindingName"`
	RoleKind        string   `json:"roleKind"`
	RoleName        string   `json:"roleName"`
	RuleIndex       int      `json:"ruleIndex"`
}

type namespaceAccessResponse struct {
	Namespace   string   `json:"namespace"`
	ClusterWide bool     `json:"clusterWide"`
	RuleCount   int      `json:"ruleCount"`
	Verbs       []string `json:"verbs"`
}

type effectiveResponse struct {
	Subject        subjectResponse           `json:"subject"`
	ClusterRules   []ruleEvidenceResponse    `json:"clusterRules"`
	NamespaceRules []ruleEvidenceResponse    `json:"namespaceRules"`
	Namespaces     []namespaceAccessResponse `json:"namespaces"`
	Bindings       []bindingEvidenceResponse `json:"bindings"`
	Warnings       []string                  `json:"warnings"`
	GeneratedAt    string                    `json:"generatedAt"`
}

type accessReviewResponse struct {
	Allowed         bool   `json:"allowed"`
	Authoritative   bool   `json:"authoritative"`
	Reason          string `json:"reason,omitempty"`
	EvaluationError string `json:"evaluationError,omitempty"`
}

type decisionResponse struct {
	Allowed         bool                      `json:"allowed"`
	Reason          string                    `json:"reason"`
	Summary         string                    `json:"summary"`
	MatchedRules    []ruleEvidenceResponse    `json:"matchedRules"`
	MatchedBindings []bindingEvidenceResponse `json:"matchedBindings"`
	SAR             *accessReviewResponse     `json:"sar,omitempty"`
	Warnings        []string                  `json:"warnings"`
}

func RegisterHandlers(server *ipc.Server, service *apppermissions.Service) {
	rpc.Register(server, "access.effective", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p effectiveParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, invalidParams(err)
		}
		subject, err := toSubject(p.Subject)
		if err != nil {
			return nil, rpc.MapError(err, ipc.ErrCodeInvalidParams, err.Error())
		}
		result, err := service.Effective(ctx, p.ContextName, subject)
		if err != nil {
			return nil, rpc.MapError(err, ipc.ErrK8sConnFailed, fmt.Sprintf("Failed to evaluate permissions: %v", err))
		}
		return effectiveToResponse(result), nil
	})

	rpc.Register(server, "access.explain", 20*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p explainParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, invalidParams(err)
		}
		subject, err := toSubject(p.Subject)
		if err != nil {
			return nil, rpc.MapError(err, ipc.ErrCodeInvalidParams, err.Error())
		}
		decision, err := service.Explain(ctx, p.ContextName, subject, toOperation(p.Operation))
		if err != nil {
			return nil, rpc.MapError(err, ipc.ErrK8sConnFailed, fmt.Sprintf("Failed to explain permission: %v", err))
		}
		return decisionToResponse(decision), nil
	})

	rpc.Register(server, "access.currentIdentity", 10*time.Second, func(
		ctx context.Context,
		params json.RawMessage,
	) (interface{}, *ipc.RPCError) {
		var p currentIdentityParams
		if len(params) > 0 {
			if err := json.Unmarshal(params, &p); err != nil {
				return nil, invalidParams(err)
			}
		}
		subject, err := service.CurrentIdentity(ctx, p.ContextName)
		if err != nil {
			return nil, rpc.MapError(err, ipc.ErrK8sConnFailed,
				fmt.Sprintf("Failed to determine current identity: %v", err))
		}
		return identityToResponse(subject), nil
	})
}

func invalidParams(err error) *ipc.RPCError {
	return &ipc.RPCError{
		Code:    ipc.ErrCodeInvalidParams,
		Message: fmt.Sprintf("Invalid params: %v", err),
	}
}

func toSubject(request subjectRequest) (domainpermissions.Subject, error) {
	kind := domainpermissions.SubjectKind(request.Kind)
	if kind != domainpermissions.SubjectUser &&
		kind != domainpermissions.SubjectGroup &&
		kind != domainpermissions.SubjectServiceAccount {
		return domainpermissions.Subject{}, fmt.Errorf("unsupported subject kind %q", request.Kind)
	}
	return domainpermissions.Subject{
		Kind:      kind,
		Name:      request.Name,
		Namespace: request.Namespace,
		Groups:    request.Groups,
	}, nil
}

func toOperation(request operationRequest) domainpermissions.Operation {
	return domainpermissions.Operation{
		Namespace:      request.Namespace,
		Verb:           request.Verb,
		APIGroup:       request.APIGroup,
		Resource:       request.Resource,
		Subresource:    request.Subresource,
		ResourceName:   request.ResourceName,
		NonResourceURL: request.NonResourceURL,
		ClusterScoped:  request.ClusterScoped,
	}
}

func effectiveToResponse(result *domainpermissions.Effective) *effectiveResponse {
	clusterRules := make([]ruleEvidenceResponse, 0, len(result.ClusterRules))
	for _, rule := range result.ClusterRules {
		clusterRules = append(clusterRules, ruleToResponse(rule))
	}
	namespaceRules := make([]ruleEvidenceResponse, 0, len(result.NamespaceRules))
	for _, rule := range result.NamespaceRules {
		namespaceRules = append(namespaceRules, ruleToResponse(rule))
	}
	namespaces := make([]namespaceAccessResponse, 0, len(result.Namespaces))
	for _, item := range result.Namespaces {
		namespaces = append(namespaces, namespaceAccessResponse{
			Namespace: item.Namespace, ClusterWide: item.ClusterWide,
			RuleCount: item.RuleCount, Verbs: item.Verbs,
		})
	}
	bindings := make([]bindingEvidenceResponse, 0, len(result.Bindings))
	for _, item := range result.Bindings {
		bindings = append(bindings, bindingToResponse(item))
	}
	return &effectiveResponse{
		Subject:        subjectToResponse(result.Subject),
		ClusterRules:   clusterRules,
		NamespaceRules: namespaceRules,
		Namespaces:     namespaces,
		Bindings:       bindings,
		Warnings:       result.Warnings,
		GeneratedAt:    result.GeneratedAt.UTC().Format(time.RFC3339),
	}
}

func decisionToResponse(decision *domainpermissions.Decision) *decisionResponse {
	rules := make([]ruleEvidenceResponse, 0, len(decision.MatchedRules))
	for _, rule := range decision.MatchedRules {
		rules = append(rules, ruleToResponse(rule))
	}
	bindings := make([]bindingEvidenceResponse, 0, len(decision.MatchedBindings))
	for _, binding := range decision.MatchedBindings {
		bindings = append(bindings, bindingToResponse(binding))
	}
	response := &decisionResponse{
		Allowed: decision.Allowed, Reason: decision.Reason, Summary: decision.Summary,
		MatchedRules: rules, MatchedBindings: bindings, Warnings: decision.Warnings,
	}
	if decision.SAR != nil {
		response.SAR = &accessReviewResponse{
			Allowed: decision.SAR.Allowed, Authoritative: decision.SAR.Authoritative,
			Reason: decision.SAR.Reason, EvaluationError: decision.SAR.EvaluationError,
		}
	}
	return response
}

func subjectToResponse(subject domainpermissions.Subject) subjectResponse {
	return subjectResponse{
		Kind: string(subject.Kind), Name: subject.Name,
		Namespace: subject.Namespace, Groups: subject.EffectiveGroups(),
	}
}

func identityToResponse(subject domainpermissions.Subject) subjectResponse {
	return subjectResponse{
		Kind: string(subject.Kind), Name: subject.Name,
		Namespace: subject.Namespace, Groups: subject.Groups,
	}
}

func bindingToResponse(binding domainpermissions.BindingEvidence) bindingEvidenceResponse {
	subjects := make([]bindingSubjectResponse, 0, len(binding.Subjects))
	for _, subject := range binding.Subjects {
		subjects = append(subjects, bindingSubjectResponse{
			Kind: subject.Kind, Name: subject.Name, Namespace: subject.Namespace,
		})
	}
	return bindingEvidenceResponse{
		Kind: binding.Kind, Name: binding.Name, Namespace: binding.Namespace,
		RoleKind: binding.RoleKind, RoleName: binding.RoleName, Subjects: subjects,
	}
}

func ruleToResponse(rule domainpermissions.RuleEvidence) ruleEvidenceResponse {
	return ruleEvidenceResponse{
		Verbs: rule.Verbs, APIGroups: rule.APIGroups, Resources: rule.Resources,
		ResourceNames: rule.ResourceNames, NonResourceURLs: rule.NonResourceURLs,
		Scope: rule.Scope, Namespace: rule.Namespace, BindingKind: rule.BindingKind,
		BindingName: rule.BindingName, RoleKind: rule.RoleKind, RoleName: rule.RoleName,
		RuleIndex: rule.RuleIndex,
	}
}

package kubernetes

import (
	"context"

	legacycluster "github.com/kubeview/engine/internal/cluster"
	domaincontexts "github.com/kubeview/engine/internal/domain/contexts"
)

// ContextsAdapter implements the contexts application ports using the legacy
// manager as the transitional Kubernetes/kubeconfig adapter.
type ContextsAdapter struct {
	manager *legacycluster.Manager
}

func NewContextsAdapter(manager *legacycluster.Manager) *ContextsAdapter {
	return &ContextsAdapter{manager: manager}
}

func (adapter *ContextsAdapter) List(ctx context.Context) (*domaincontexts.ListResult, error) {
	result, err := adapter.manager.ListContexts()
	if err != nil {
		return nil, err
	}

	contexts := make([]domaincontexts.Context, 0, len(result.Contexts))
	for _, item := range result.Contexts {
		contexts = append(contexts, mapContext(item))
	}
	return &domaincontexts.ListResult{
		CurrentContext: result.CurrentContext,
		Contexts:       contexts,
		ConfigPath:     result.ConfigPath,
	}, nil
}

func (adapter *ContextsAdapter) Switch(
	ctx context.Context,
	contextName string,
) (*domaincontexts.SwitchResult, error) {
	result, err := adapter.manager.SwitchContext(contextName)
	if err != nil {
		return nil, err
	}
	return &domaincontexts.SwitchResult{
		ActiveContext: result.ActiveContext,
		Context:       mapContext(result.Context),
		Status:        result.Status,
	}, nil
}

func (adapter *ContextsAdapter) ListNamespaces(
	ctx context.Context,
	contextName string,
) ([]string, error) {
	namespaces, err := adapter.manager.ListNamespaces(ctx, contextName)
	if err != nil {
		fallback := adapter.manager.GetContextNamespace(contextName)
		if fallback == "" {
			fallback = "default"
		}
		return []string{fallback}, nil
	}
	return namespaces, nil
}

func mapContext(item legacycluster.ContextSummary) domaincontexts.Context {
	return domaincontexts.Context{
		Name:      item.Name,
		Cluster:   item.Cluster,
		Server:    item.Server,
		User:      item.User,
		Namespace: item.Namespace,
		IsCurrent: item.IsCurrent,
		Provider:  string(item.Provider),
		AuthType:  string(item.AuthType),
	}
}

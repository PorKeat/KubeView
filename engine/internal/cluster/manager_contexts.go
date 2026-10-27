package cluster

import (
	"fmt"
	"sort"
)

// GetConfigPath returns the active kubeconfig path
func (m *Manager) GetConfigPath() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.configPath
}

// ListContexts returns all contexts present in the kubeconfig with safe metadata
func (m *Manager) ListContexts() (*ListContextsResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.rawConfig == nil {
		return &ListContextsResult{
			CurrentContext: "",
			Contexts:       []ContextSummary{},
			ConfigPath:     m.configPath,
		}, nil
	}

	var summaries []ContextSummary
	for name, ctx := range m.rawConfig.Contexts {
		serverUrl := ""
		clusterObj := m.rawConfig.Clusters[ctx.Cluster]
		if clusterObj != nil {
			serverUrl = clusterObj.Server
		}

		userObj := m.rawConfig.AuthInfos[ctx.AuthInfo]
		authType := detectAuthType(userObj)
		provider := detectProvider(name, ctx.Cluster, serverUrl)

		ns := ctx.Namespace
		if ns == "" {
			ns = "default"
		}

		summaries = append(summaries, ContextSummary{
			Name:      name,
			Cluster:   ctx.Cluster,
			Server:    serverUrl,
			User:      ctx.AuthInfo,
			Namespace: ns,
			IsCurrent: name == m.currentContext,
			Provider:  provider,
			AuthType:  authType,
		})
	}

	sort.Slice(summaries, func(i, j int) bool { return summaries[i].Name < summaries[j].Name })

	return &ListContextsResult{
		CurrentContext: m.currentContext,
		Contexts:       summaries,
		ConfigPath:     m.configPath,
	}, nil
}

// GetCurrentContext returns the active context name
func (m *Manager) GetCurrentContext() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.currentContext
}

// SwitchContext sets the active context and prepares the client
func (m *Manager) SwitchContext(contextName string) (*SwitchContextResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.rawConfig == nil || m.rawConfig.Contexts[contextName] == nil {
		return nil, fmt.Errorf("context '%s' does not exist in kubeconfig", contextName)
	}

	m.currentContext = contextName
	ctx := m.rawConfig.Contexts[contextName]

	serverUrl := ""
	clusterObj := m.rawConfig.Clusters[ctx.Cluster]
	if clusterObj != nil {
		serverUrl = clusterObj.Server
	}

	userObj := m.rawConfig.AuthInfos[ctx.AuthInfo]
	authType := detectAuthType(userObj)
	provider := detectProvider(contextName, ctx.Cluster, serverUrl)

	ns := ctx.Namespace
	if ns == "" {
		ns = "default"
	}

	summary := ContextSummary{
		Name:      contextName,
		Cluster:   ctx.Cluster,
		Server:    serverUrl,
		User:      ctx.AuthInfo,
		Namespace: ns,
		IsCurrent: true,
		Provider:  provider,
		AuthType:  authType,
	}

	return &SwitchContextResult{
		ActiveContext: contextName,
		Context:       summary,
		Status:        "ready",
	}, nil
}

// GetContextNamespace returns the namespace configured for the given context, or "default"
func (m *Manager) GetContextNamespace(contextName string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.rawConfig == nil {
		return "default"
	}
	if contextName == "" {
		contextName = m.currentContext
	}
	ctx := m.rawConfig.Contexts[contextName]
	if ctx != nil && ctx.Namespace != "" {
		return ctx.Namespace
	}
	return "default"
}

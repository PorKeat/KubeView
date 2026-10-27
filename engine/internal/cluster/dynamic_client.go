package cluster

import (
	"fmt"

	"k8s.io/client-go/dynamic"
)

// getDynamicClient returns a cached dynamic client for the given context.
func (m *Manager) getDynamicClient(contextName string) (dynamic.Interface, error) {
	m.mu.Lock()
	if contextName == "" {
		contextName = m.currentContext
	}
	if client, exists := m.dynamicClients[contextName]; exists {
		m.mu.Unlock()
		return client, nil
	}
	m.mu.Unlock()

	_, restConfig, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	client, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	m.mu.Lock()
	if m.dynamicClients == nil {
		m.dynamicClients = make(map[string]dynamic.Interface)
	}
	m.dynamicClients[contextName] = client
	m.mu.Unlock()
	return client, nil
}

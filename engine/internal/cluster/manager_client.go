package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// GetClientForContext returns a kubernetes.Interface for the given or active context
func (m *Manager) GetClientForContext(ctxName string) (kubernetes.Interface, *rest.Config, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if ctxName == "" {
		ctxName = m.currentContext
	}

	if client, exists := m.clientsets[ctxName]; exists {
		return client, m.restConfigs[ctxName], nil
	}

	restConfig, err := m.buildRESTConfig(ctxName)
	if err != nil {
		return nil, nil, err
	}

	client, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	m.clientsets[ctxName] = client
	m.restConfigs[ctxName] = restConfig
	return client, restConfig, nil
}

// GetAuthInfoForContext retrieves the raw AuthInfo struct for a given context name
func (m *Manager) GetAuthInfoForContext(ctxName string) *clientcmdapi.AuthInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.rawConfig == nil {
		return nil
	}
	if ctx, ok := m.rawConfig.Contexts[ctxName]; ok {
		return m.rawConfig.AuthInfos[ctx.AuthInfo]
	}
	return nil
}

func (m *Manager) buildRESTConfig(ctxName string) (*rest.Config, error) {
	if m.rawConfig == nil {
		return nil, fmt.Errorf("kubeconfig is not loaded")
	}

	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*m.rawConfig,
		ctxName,
		&clientcmd.ConfigOverrides{},
		nil,
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to build rest config for context '%s': %w", ctxName, err)
	}

	// Sensible timeouts and QPS defaults for desktop IDE responsiveness
	restConfig.Timeout = 10 * time.Second
	restConfig.QPS = 50.0
	restConfig.Burst = 100

	return restConfig, nil
}

// ListNamespaces lists all accessible namespaces in the cluster
func (m *Manager) ListNamespaces(ctx context.Context, contextName string) ([]string, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	var names []string
	continueToken := ""
	for {
		nsList, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{
			Limit:    200,
			Continue: continueToken,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to list namespaces: %w", err)
		}
		for _, item := range nsList.Items {
			names = append(names, item.Name)
		}
		continueToken = nsList.Continue
		if continueToken == "" {
			break
		}
	}
	sort.Strings(names)

	return names, nil
}

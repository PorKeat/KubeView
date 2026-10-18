package cluster

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// Manager handles kubeconfig loading, context switching, and client-go instances
type Manager struct {
	mu             sync.RWMutex
	configPath     string
	rawConfig      *clientcmdapi.Config
	currentContext string
	clientsets     map[string]kubernetes.Interface
	restConfigs    map[string]*rest.Config
}

// NewManager creates a new cluster Manager
func NewManager(customConfigPath string) (*Manager, error) {
	mgr := &Manager{
		configPath:  customConfigPath,
		clientsets:  make(map[string]kubernetes.Interface),
		restConfigs: make(map[string]*rest.Config),
	}

	if err := mgr.ReloadConfig(); err != nil {
		if os.IsNotExist(err) {
			mgr.rawConfig = clientcmdapi.NewConfig()
			return mgr, nil
		}
		return nil, err
	}

	return mgr, nil
}

// ReloadConfig reloads the kubeconfig file(s) from disk
func (m *Manager) ReloadConfig() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	fileList := discoverConfigFiles(m.configPath)
	if len(fileList) == 0 {
		m.rawConfig = clientcmdapi.NewConfig()
		return nil
	}

	mergedConfig := clientcmdapi.NewConfig()
	for _, f := range fileList {
		cfg, err := clientcmd.LoadFromFile(f)
		if err != nil {
			continue // skip non-kubeconfig or unparseable files
		}
		for k, v := range cfg.Clusters {
			if _, exists := mergedConfig.Clusters[k]; !exists {
				mergedConfig.Clusters[k] = v
			}
		}
		for k, v := range cfg.AuthInfos {
			if _, exists := mergedConfig.AuthInfos[k]; !exists {
				mergedConfig.AuthInfos[k] = v
			}
		}
		for k, v := range cfg.Contexts {
			if _, exists := mergedConfig.Contexts[k]; !exists {
				mergedConfig.Contexts[k] = v
			}
		}
		if mergedConfig.CurrentContext == "" && cfg.CurrentContext != "" {
			mergedConfig.CurrentContext = cfg.CurrentContext
		}
	}

	m.rawConfig = mergedConfig
	if m.currentContext == "" || mergedConfig.Contexts[m.currentContext] == nil {
		m.currentContext = mergedConfig.CurrentContext
	}

	// Invalidate cached clientsets
	m.clientsets = make(map[string]kubernetes.Interface)
	m.restConfigs = make(map[string]*rest.Config)

	return nil
}

func discoverConfigFiles(explicitPath string) []string {
	if explicitPath != "" {
		return []string{explicitPath}
	}

	var candidates []string
	if env := os.Getenv("KUBECONFIG"); env != "" {
		for _, p := range filepath.SplitList(env) {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				candidates = append(candidates, trimmed)
			}
		}
	}

	home, err := os.UserHomeDir()
	if err == nil {
		defaultConfig := filepath.Join(home, ".kube", "config")
		candidates = append(candidates, defaultConfig)

		// Scan ~/.kube for additional .yaml/.yml configurations
		kubeDir := filepath.Join(home, ".kube")
		entries, err := os.ReadDir(kubeDir)
		if err == nil {
			for _, entry := range entries {
				if entry.IsDir() {
					continue
				}
				name := entry.Name()
				if strings.Contains(name, ".bak") || strings.Contains(name, ".backup") || strings.HasPrefix(name, ".") {
					continue
				}
				if strings.HasSuffix(name, ".yaml") || strings.HasSuffix(name, ".yml") {
					candidates = append(candidates, filepath.Join(kubeDir, name))
				}
			}
		}
	}

	seen := make(map[string]bool)
	var result []string
	for _, c := range candidates {
		if !seen[c] {
			seen[c] = true
			if _, err := os.Stat(c); err == nil {
				result = append(result, c)
			}
		}
	}

	return result
}

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

	return &ListContextsResult{
		CurrentContext: m.currentContext,
		Contexts:       summaries,
		ConfigPath:     m.configPath,
	}, nil
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

	nsList, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 200})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	var names []string
	for _, item := range nsList.Items {
		names = append(names, item.Name)
	}

	return names, nil
}

func detectProvider(contextName, clusterName, serverUrl string) ProviderType {
	lower := strings.ToLower(contextName + " " + clusterName + " " + serverUrl)
	switch {
	case strings.Contains(lower, "kind-") || strings.Contains(lower, "kind"):
		return ProviderKind
	case strings.Contains(lower, "minikube"):
		return ProviderMinikube
	case strings.Contains(lower, "eks") || strings.Contains(lower, "amazonaws.com"):
		return ProviderEKS
	case strings.Contains(lower, "gke") || strings.Contains(lower, "google"):
		return ProviderGKE
	case strings.Contains(lower, "aks") || strings.Contains(lower, "azmk8s.io"):
		return ProviderAKS
	default:
		return ProviderGeneric
	}
}

func detectAuthType(authInfo *clientcmdapi.AuthInfo) AuthType {
	if authInfo == nil {
		return AuthUnknown
	}
	if authInfo.Exec != nil {
		return AuthExec
	}
	if len(authInfo.ClientCertificateData) > 0 || authInfo.ClientCertificate != "" {
		return AuthCert
	}
	if authInfo.Token != "" || authInfo.TokenFile != "" {
		return AuthToken
	}
	if authInfo.AuthProvider != nil {
		return AuthOIDC
	}
	return AuthUnknown
}

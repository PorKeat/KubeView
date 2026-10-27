package cluster

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

type cachedOverview struct {
	result   *ClusterOverviewResult
	cachedAt time.Time
}

type overviewCall struct {
	wg  sync.WaitGroup
	val *ClusterOverviewResult
	err error
}

// Manager handles kubeconfig loading, context switching, and client-go instances
type Manager struct {
	mu             sync.RWMutex
	configPath     string
	rawConfig      *clientcmdapi.Config
	currentContext string
	clientsets     map[string]kubernetes.Interface
	restConfigs    map[string]*rest.Config
	dynamicClients map[string]dynamic.Interface
	forwardsMu     sync.Mutex
	forwards       map[string]*portForwardSession
	overviewCache  map[string]cachedOverview
	overviewMu     sync.RWMutex
	overviewCalls  map[string]*overviewCall
	overviewCallMu sync.Mutex
}

// InvalidateOverviewCache purges cached overview data for a specific context, or all contexts if contextName is empty.
func (m *Manager) InvalidateOverviewCache(contextName string) {
	m.overviewMu.Lock()
	defer m.overviewMu.Unlock()
	if contextName == "" {
		m.overviewCache = make(map[string]cachedOverview)
		return
	}
	for k := range m.overviewCache {
		if k == contextName || strings.HasPrefix(k, contextName+"::") {
			delete(m.overviewCache, k)
		}
	}
}

// NewManager creates a new cluster Manager
func NewManager(customConfigPath string) (*Manager, error) {
	mgr := &Manager{
		configPath:     customConfigPath,
		clientsets:     make(map[string]kubernetes.Interface),
		restConfigs:    make(map[string]*rest.Config),
		dynamicClients: make(map[string]dynamic.Interface),
		forwards:       make(map[string]*portForwardSession),
		overviewCache:  make(map[string]cachedOverview),
		overviewCalls:  make(map[string]*overviewCall),
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

		fileBase := strings.TrimSuffix(filepath.Base(f), filepath.Ext(f))
		// Remove timestamps like _1792379041610570000_0 from fileBase
		parts := strings.Split(fileBase, "_")
		if len(parts) > 2 {
			fileBase = parts[0]
		}

		for ctxName, ctxObj := range cfg.Contexts {
			targetCtxName := ctxName
			targetClusterName := ctxObj.Cluster
			targetAuthName := ctxObj.AuthInfo

			clusterObj := cfg.Clusters[ctxObj.Cluster]
			userObj := cfg.AuthInfos[ctxObj.AuthInfo]

			// Check collision with already merged contexts
			if existingCtx, exists := mergedConfig.Contexts[targetCtxName]; exists {
				existingCluster := mergedConfig.Clusters[existingCtx.Cluster]
				serverUrl := ""
				if clusterObj != nil {
					serverUrl = clusterObj.Server
				}
				cleanServer := strings.TrimRight(strings.ToLower(serverUrl), "/")
				existingServer := ""
				if existingCluster != nil {
					existingServer = strings.TrimRight(strings.ToLower(existingCluster.Server), "/")
				}

				if cleanServer != "" && cleanServer != existingServer {
					// Different cluster endpoint! Disambiguate context name, cluster name, and auth name
					targetCtxName = fmt.Sprintf("%s (%s)", ctxName, fileBase)
					targetClusterName = fmt.Sprintf("%s-%s", ctxObj.Cluster, fileBase)
					targetAuthName = fmt.Sprintf("%s-%s", ctxObj.AuthInfo, fileBase)
				}
			}

			if clusterObj != nil {
				mergedConfig.Clusters[targetClusterName] = clusterObj
			}
			if userObj != nil {
				mergedConfig.AuthInfos[targetAuthName] = userObj
			}

			newCtx := *ctxObj
			newCtx.Cluster = targetClusterName
			newCtx.AuthInfo = targetAuthName
			mergedConfig.Contexts[targetCtxName] = &newCtx
		}

		if mergedConfig.CurrentContext == "" && cfg.CurrentContext != "" {
			if _, exists := mergedConfig.Contexts[cfg.CurrentContext]; exists {
				mergedConfig.CurrentContext = cfg.CurrentContext
			}
		}
	}

	if mergedConfig.CurrentContext == "" {
		for cName := range mergedConfig.Contexts {
			mergedConfig.CurrentContext = cName
			break
		}
	}

	m.rawConfig = mergedConfig
	if m.currentContext == "" || mergedConfig.Contexts[m.currentContext] == nil {
		m.currentContext = mergedConfig.CurrentContext
	}

	// Invalidate cached clientsets
	m.clientsets = make(map[string]kubernetes.Interface)
	m.dynamicClients = make(map[string]dynamic.Interface)
	m.restConfigs = make(map[string]*rest.Config)

	return nil
}

func getKubeViewDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".kubeview", "clusters")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

func discoverConfigFiles(explicitPath string) []string {
	if explicitPath != "" {
		return []string{explicitPath}
	}

	var candidates []string

	// Solely load configurations managed by KubeView in ~/.kubeview/clusters/
	if dir, err := getKubeViewDir(); err == nil {
		entries, err := os.ReadDir(dir)
		if err == nil {
			for _, entry := range entries {
				if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
					continue
				}
				// Load any file regardless of extension or no extension
				candidates = append(candidates, filepath.Join(dir, entry.Name()))
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

func sanitizeConfigName(cleanName string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, cleanName)
}

// ImportKubeconfig imports a kubeconfig from raw YAML, file path, directory, or multiple files into ~/.kube/kubeview_*.yaml
func (m *Manager) ImportKubeconfig(params ImportKubeconfigParams) (*ImportKubeconfigResult, error) {
	// If filePath is a directory, dynamically discover all valid kubeconfigs inside it (no extension restriction!)
	if strings.TrimSpace(params.FilePath) != "" {
		if fi, err := os.Stat(params.FilePath); err == nil && fi.IsDir() {
			entries, readErr := os.ReadDir(params.FilePath)
			if readErr == nil {
				for _, entry := range entries {
					if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
						continue
					}
					fullPath := filepath.Join(params.FilePath, entry.Name())
					data, err := os.ReadFile(fullPath)
					if err == nil {
						if testCfg, err := clientcmd.Load(data); err == nil && testCfg != nil && len(testCfg.Contexts) > 0 {
							params.Files = append(params.Files, ImportKubeconfigFileItem{
								FilePath: fullPath,
								Name:     entry.Name(),
							})
						}
					}
				}
			}
		}
	}

	targetDir, err := getKubeViewDir()
	if err != nil {
		return nil, fmt.Errorf("cannot resolve KubeView data directory: %w", err)
	}

	// Handle batch import (multiple files or folder contents)
	if len(params.Files) > 0 {
		var allImported []string
		var firstActive string
		var lastSavedPath string
		validCount := 0

		timestamp := time.Now().Unix()

		for idx, f := range params.Files {
			var fileCfg *clientcmdapi.Config
			var loadErr error

			if strings.TrimSpace(f.RawYAML) != "" {
				fileCfg, loadErr = clientcmd.Load([]byte(f.RawYAML))
			} else if strings.TrimSpace(f.FilePath) != "" {
				fileCfg, loadErr = clientcmd.LoadFromFile(f.FilePath)
			}

			if loadErr != nil || fileCfg == nil || len(fileCfg.Contexts) == 0 {
				continue
			}

			cleanName := "cluster"
			if f.Name != "" {
				cleanName = strings.ReplaceAll(f.Name, " ", "_")
			} else if fileCfg.CurrentContext != "" {
				cleanName = strings.ReplaceAll(fileCfg.CurrentContext, " ", "_")
			}
			cleanName = sanitizeConfigName(cleanName)

			targetPath := filepath.Join(targetDir, fmt.Sprintf("%s_%d_%d.kubeconfig", cleanName, timestamp, idx))
			if err := clientcmd.WriteToFile(*fileCfg, targetPath); err != nil {
				continue
			}

			validCount++
			lastSavedPath = targetPath

			for ctxName := range fileCfg.Contexts {
				allImported = append(allImported, ctxName)
				if firstActive == "" {
					firstActive = ctxName
				}
			}
			if fileCfg.CurrentContext != "" && firstActive == "" {
				firstActive = fileCfg.CurrentContext
			}
		}

		if validCount == 0 {
			return nil, fmt.Errorf("no valid kubeconfig files found among provided items")
		}

		// Reload manager to merge the new configurations
		if err := m.ReloadConfig(); err != nil {
			return nil, fmt.Errorf("failed to reload configs after batch import: %w", err)
		}

		if firstActive != "" {
			_, _ = m.SwitchContext(firstActive)
		}

		return &ImportKubeconfigResult{
			Success:          true,
			ImportedContexts: allImported,
			ActiveContext:    firstActive,
			SavedPath:        lastSavedPath,
			TotalContexts:    len(m.rawConfig.Contexts),
		}, nil
	}

	// Single config import (raw YAML or single file)
	var cfg *clientcmdapi.Config

	if strings.TrimSpace(params.RawYAML) != "" {
		cfg, err = clientcmd.Load([]byte(params.RawYAML))
		if err != nil {
			return nil, fmt.Errorf("invalid kubeconfig YAML format: %w", err)
		}
	} else if strings.TrimSpace(params.FilePath) != "" {
		cfg, err = clientcmd.LoadFromFile(params.FilePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read kubeconfig file '%s': %w", params.FilePath, err)
		}
	} else {
		return nil, fmt.Errorf("either rawYaml, filePath, or files array must be provided")
	}

	if cfg == nil || len(cfg.Contexts) == 0 {
		return nil, fmt.Errorf("kubeconfig contains no valid contexts")
	}

	cleanName := "cluster"
	if params.Name != "" {
		cleanName = strings.ReplaceAll(params.Name, " ", "_")
	} else if cfg.CurrentContext != "" {
		cleanName = strings.ReplaceAll(cfg.CurrentContext, " ", "_")
	}
	cleanName = sanitizeConfigName(cleanName)

	targetPath := filepath.Join(targetDir, fmt.Sprintf("%s_%d.kubeconfig", cleanName, time.Now().Unix()))

	if err := clientcmd.WriteToFile(*cfg, targetPath); err != nil {
		return nil, fmt.Errorf("failed to write kubeconfig to %s: %w", targetPath, err)
	}

	// Reload manager to merge the new configuration
	if err := m.ReloadConfig(); err != nil {
		return nil, fmt.Errorf("failed to reload configs after import: %w", err)
	}

	var importedContexts []string
	for ctxName := range cfg.Contexts {
		importedContexts = append(importedContexts, ctxName)
	}

	firstCtx := cfg.CurrentContext
	if firstCtx == "" && len(importedContexts) > 0 {
		firstCtx = importedContexts[0]
	}

	if firstCtx != "" {
		_, _ = m.SwitchContext(firstCtx)
	}

	return &ImportKubeconfigResult{
		Success:          true,
		ImportedContexts: importedContexts,
		ActiveContext:    firstCtx,
		SavedPath:        targetPath,
		TotalContexts:    len(m.rawConfig.Contexts),
	}, nil
}

// DeleteContext removes a specific context from KubeView managed clusters
func (m *Manager) DeleteContext(contextName string) error {
	contextName = strings.TrimSpace(contextName)
	dir, err := getKubeViewDir()
	if err != nil {
		return err
	}

	found := false
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("context '%s' not found", contextName)
		}
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		filePath := filepath.Join(dir, entry.Name())
		cfg, err := clientcmd.LoadFromFile(filePath)
		if err != nil || cfg == nil {
			continue
		}

		removed := false
		for cName := range cfg.Contexts {
			if cName == contextName || strings.EqualFold(cName, contextName) {
				delete(cfg.Contexts, cName)
				removed = true
			}
		}

		if !removed {
			continue
		}
		found = true
		if len(cfg.Contexts) == 0 {
			if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
				return fmt.Errorf("failed to remove kubeconfig '%s': %w", filePath, err)
			}
		} else if err := clientcmd.WriteToFile(*cfg, filePath); err != nil {
			return fmt.Errorf("failed to write kubeconfig '%s': %w", filePath, err)
		}
	}

	if !found {
		return fmt.Errorf("context '%s' not found", contextName)
	}

	return m.ReloadConfig()
}

// ClearAllContexts deletes all managed clusters in ~/.kubeview/clusters/ for a clean slate
func (m *Manager) ClearAllContexts() error {
	dir, err := getKubeViewDir()
	if err != nil {
		return err
	}

	entries, err := os.ReadDir(dir)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if err := os.Remove(filepath.Join(dir, entry.Name())); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("failed to remove '%s': %w", entry.Name(), err)
		}
	}

	m.mu.Lock()
	m.rawConfig = clientcmdapi.NewConfig()
	m.currentContext = ""
	m.clientsets = make(map[string]kubernetes.Interface)
	m.restConfigs = make(map[string]*rest.Config)
	m.mu.Unlock()

	return nil
}

// UpdateEndpoint updates the API server endpoint URL for a specific cluster context
func (m *Manager) UpdateEndpoint(contextName, newServerUrl string, insecure ...bool) error {
	contextName = strings.TrimSpace(contextName)
	newServerUrl = strings.TrimSpace(newServerUrl)
	if newServerUrl == "" {
		return fmt.Errorf("new server URL cannot be empty")
	}
	if !strings.HasPrefix(newServerUrl, "http://") && !strings.HasPrefix(newServerUrl, "https://") {
		newServerUrl = "https://" + newServerUrl
	}

	// Guarantee port is present (default :6443)
	if parsed, err := url.Parse(newServerUrl); err == nil {
		if parsed.Port() == "" {
			parsed.Host = parsed.Host + ":6443"
			newServerUrl = parsed.String()
		}
	}

	dir, err := getKubeViewDir()
	if err != nil {
		return err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	found := false
	for _, entry := range entries {
		if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		filePath := filepath.Join(dir, entry.Name())
		cfg, err := clientcmd.LoadFromFile(filePath)
		if err != nil || cfg == nil {
			continue
		}

		matched := false
		for cName, cObj := range cfg.Contexts {
			if strings.EqualFold(strings.TrimSpace(cName), contextName) {
				clusterName := cObj.Cluster
				if clusterObj, exists := cfg.Clusters[clusterName]; exists {
					clusterObj.Server = newServerUrl
					if len(insecure) > 0 {
						if insecure[0] {
							clusterObj.InsecureSkipTLSVerify = true
							clusterObj.CertificateAuthorityData = nil
							clusterObj.CertificateAuthority = ""
						} else {
							clusterObj.InsecureSkipTLSVerify = false
						}
					}
					matched = true
				}
			}
		}

		if matched {
			found = true
			if err := clientcmd.WriteToFile(*cfg, filePath); err != nil {
				return fmt.Errorf("failed to write kubeconfig '%s': %w", filePath, err)
			}
		}
	}

	if !found {
		m.mu.Lock()
		if m.rawConfig != nil {
			for cName, ctxObj := range m.rawConfig.Contexts {
				if strings.EqualFold(strings.TrimSpace(cName), contextName) {
					if clObj, ok := m.rawConfig.Clusters[ctxObj.Cluster]; ok {
						clObj.Server = newServerUrl
						if len(insecure) > 0 {
							if insecure[0] {
								clObj.InsecureSkipTLSVerify = true
								clObj.CertificateAuthorityData = nil
								clObj.CertificateAuthority = ""
							} else {
								clObj.InsecureSkipTLSVerify = false
							}
						}
						found = true
					}
				}
			}
		}
		m.mu.Unlock()
	}

	if !found {
		return fmt.Errorf("context '%s' not found", contextName)
	}

	m.InvalidateOverviewCache(contextName)
	return m.ReloadConfig()
}

package cluster

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

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

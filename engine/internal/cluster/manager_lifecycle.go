package cluster

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

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

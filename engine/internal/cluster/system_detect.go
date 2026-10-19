package cluster

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

type DetectedContextInfo struct {
	ContextName string       `json:"contextName"`
	ClusterName string       `json:"clusterName"`
	Server      string       `json:"server"`
	User        string       `json:"user"`
	Provider    ProviderType `json:"provider"`
	AuthType    AuthType     `json:"authType"`
	FilePath    string       `json:"filePath"`
	FileName    string       `json:"fileName"`
	IsImported  bool         `json:"isImported"`
}

type DetectSystemConfigsResult struct {
	DiscoveredFiles []string              `json:"discoveredFiles"`
	Contexts        []DetectedContextInfo `json:"contexts"`
}

type ImportDetectedContextItem struct {
	ContextName string `json:"contextName"`
	FilePath    string `json:"filePath"`
}

type ImportDetectedContextsParams struct {
	Contexts []ImportDetectedContextItem `json:"contexts"`
}

// DetectSystemConfigs scans standard OS paths for existing kubeconfig files and extracts all available contexts
func (m *Manager) DetectSystemConfigs() (*DetectSystemConfigsResult, error) {
	var candidates []string

	// 1. User Home Directory paths (macOS, Linux, Windows)
	if home, err := os.UserHomeDir(); err == nil {
		kubeDir := filepath.Join(home, ".kube")
		candidates = append(candidates,
			filepath.Join(kubeDir, "config"),
			filepath.Join(kubeDir, "kubeconfig"),
		)

		// Scan any other regular files in ~/.kube/
		if entries, err := os.ReadDir(kubeDir); err == nil {
			for _, entry := range entries {
				if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
					continue
				}
				candidates = append(candidates, filepath.Join(kubeDir, entry.Name()))
			}
		}
	}

	// 2. Ambient KUBECONFIG environment variable (split platform-specifically)
	if envKube := os.Getenv("KUBECONFIG"); envKube != "" {
		for _, p := range filepath.SplitList(envKube) {
			if strings.TrimSpace(p) != "" {
				candidates = append(candidates, strings.TrimSpace(p))
			}
		}
	}

	// 3. Windows specific user & system paths
	if userProfile := os.Getenv("USERPROFILE"); userProfile != "" {
		candidates = append(candidates,
			filepath.Join(userProfile, ".kube", "config"),
			filepath.Join(userProfile, ".kube", "kubeconfig"),
		)
	}
	if allUsers := os.Getenv("ALLUSERSPROFILE"); allUsers != "" {
		candidates = append(candidates, filepath.Join(allUsers, "kubernetes", "admin.conf"))
	}
	if progData := os.Getenv("PROGRAMDATA"); progData != "" {
		candidates = append(candidates, filepath.Join(progData, "kubernetes", "admin.conf"))
	}

	// 4. Common Linux distributions and local clusters (MicroK8s, K3s)
	candidates = append(candidates,
		"/etc/rancher/k3s/k3s.yaml",
		"/etc/kubernetes/admin.conf",
		"/var/snap/microk8s/current/credentials/client.config",
	)

	// Resolve KubeView internal storage directory to exclude it from "external system discovery"
	kubeViewDir, _ := getKubeViewDir()

	seenFiles := make(map[string]bool)
	var validFiles []string
	var detectedContexts []DetectedContextInfo

	m.mu.RLock()
	activeConfig := m.rawConfig
	m.mu.RUnlock()

	for _, cand := range candidates {
		cleanPath := filepath.Clean(cand)
		if seenFiles[cleanPath] {
			continue
		}
		seenFiles[cleanPath] = true

		// Skip internal KubeView storage
		if kubeViewDir != "" && strings.HasPrefix(cleanPath, kubeViewDir) {
			continue
		}

		fi, err := os.Stat(cleanPath)
		if err != nil || fi.IsDir() {
			continue
		}

		// Try loading as kubeconfig
		cfg, err := clientcmd.LoadFromFile(cleanPath)
		if err != nil || cfg == nil || len(cfg.Contexts) == 0 {
			continue
		}

		validFiles = append(validFiles, cleanPath)
		fileName := filepath.Base(cleanPath)

		for ctxName, ctx := range cfg.Contexts {
			serverUrl := ""
			clusterObj := cfg.Clusters[ctx.Cluster]
			if clusterObj != nil {
				serverUrl = clusterObj.Server
			}

			userObj := cfg.AuthInfos[ctx.AuthInfo]
			authType := detectAuthType(userObj)
			provider := detectProvider(ctxName, ctx.Cluster, serverUrl)

			isAlreadyImported := false
			if activeConfig != nil && activeConfig.Contexts[ctxName] != nil {
				isAlreadyImported = true
			}

			detectedContexts = append(detectedContexts, DetectedContextInfo{
				ContextName: ctxName,
				ClusterName: ctx.Cluster,
				Server:      serverUrl,
				User:        ctx.AuthInfo,
				Provider:    provider,
				AuthType:    authType,
				FilePath:    cleanPath,
				FileName:    fileName,
				IsImported:  isAlreadyImported,
			})
		}
	}

	// Sort contexts alphabetically by name
	sort.Slice(detectedContexts, func(i, j int) bool {
		return detectedContexts[i].ContextName < detectedContexts[j].ContextName
	})

	return &DetectSystemConfigsResult{
		DiscoveredFiles: validFiles,
		Contexts:        detectedContexts,
	}, nil
}

// ImportDetectedContexts isolates and imports only the chosen contexts into KubeView
func (m *Manager) ImportDetectedContexts(params ImportDetectedContextsParams) (*ImportKubeconfigResult, error) {
	if len(params.Contexts) == 0 {
		return nil, fmt.Errorf("no contexts specified for import")
	}

	targetDir, err := getKubeViewDir()
	if err != nil {
		return nil, fmt.Errorf("cannot resolve KubeView data directory: %w", err)
	}

	var importedContexts []string
	var lastSavedPath string
	timestamp := time.Now().UnixNano()

	for idx, item := range params.Contexts {
		if strings.TrimSpace(item.FilePath) == "" || strings.TrimSpace(item.ContextName) == "" {
			continue
		}

		cfg, err := clientcmd.LoadFromFile(item.FilePath)
		if err != nil || cfg == nil {
			continue
		}

		ctxObj, exists := cfg.Contexts[item.ContextName]
		if !exists || ctxObj == nil {
			continue
		}

		// Create clean standalone config for this specific context
		singleCfg := clientcmdapi.NewConfig()
		singleCfg.Contexts[item.ContextName] = ctxObj

		if clusterObj, ok := cfg.Clusters[ctxObj.Cluster]; ok {
			singleCfg.Clusters[ctxObj.Cluster] = clusterObj
		}
		if userObj, ok := cfg.AuthInfos[ctxObj.AuthInfo]; ok {
			singleCfg.AuthInfos[ctxObj.AuthInfo] = userObj
		}
		singleCfg.CurrentContext = item.ContextName

		cleanName := sanitizeConfigName(item.ContextName)
		targetPath := filepath.Join(targetDir, fmt.Sprintf("%s_%d_%d.kubeconfig", cleanName, timestamp, idx))

		if err := clientcmd.WriteToFile(*singleCfg, targetPath); err != nil {
			continue
		}

		importedContexts = append(importedContexts, item.ContextName)
		lastSavedPath = targetPath
	}

	if len(importedContexts) == 0 {
		return nil, fmt.Errorf("failed to import any of the selected contexts")
	}

	// Reload manager to merge the new configurations
	if err := m.ReloadConfig(); err != nil {
		return nil, fmt.Errorf("failed to reload configs after importing system contexts: %w", err)
	}

	// Switch to the first newly imported context
	activeCtx := importedContexts[0]
	_, _ = m.SwitchContext(activeCtx)

	m.mu.RLock()
	totalContexts := len(m.rawConfig.Contexts)
	m.mu.RUnlock()

	return &ImportKubeconfigResult{
		Success:          true,
		ImportedContexts: importedContexts,
		ActiveContext:    activeCtx,
		SavedPath:        lastSavedPath,
		TotalContexts:    totalContexts,
	}, nil
}

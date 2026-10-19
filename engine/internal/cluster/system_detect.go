package cluster

import (
	"fmt"
	"net"
	"net/url"
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
	ContextName    string `json:"contextName"`
	FilePath       string `json:"filePath"`
	OverrideServer string `json:"overrideServer,omitempty"`
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
			if activeConfig != nil {
				cleanServer := strings.TrimRight(strings.ToLower(serverUrl), "/")
				for _, actCtx := range activeConfig.Contexts {
					actCluster := activeConfig.Clusters[actCtx.Cluster]
					if actCluster != nil {
						actServer := strings.TrimRight(strings.ToLower(actCluster.Server), "/")
						if actServer != "" && actServer == cleanServer {
							isAlreadyImported = true
							break
						}
					}
				}
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

		fileBase := strings.TrimSuffix(filepath.Base(item.FilePath), filepath.Ext(item.FilePath))
		if fileBase == "" {
			fileBase = "cluster"
		}

		targetCtxName := item.ContextName
		targetClusterName := ctxObj.Cluster
		targetAuthName := ctxObj.AuthInfo

		// Check if this context name already exists with a different server URL
		m.mu.RLock()
		serverUrl := ""
		if clusterObj, ok := cfg.Clusters[ctxObj.Cluster]; ok && clusterObj != nil {
			serverUrl = clusterObj.Server
		}
		cleanServer := strings.TrimRight(strings.ToLower(serverUrl), "/")

		nameCollision := false
		if m.rawConfig != nil {
			if existingCtx, exists := m.rawConfig.Contexts[targetCtxName]; exists {
				existingCluster := m.rawConfig.Clusters[existingCtx.Cluster]
				existingServer := ""
				if existingCluster != nil {
					existingServer = strings.TrimRight(strings.ToLower(existingCluster.Server), "/")
				}
				if existingServer != "" && existingServer != cleanServer {
					nameCollision = true
				}
			}
		}
		m.mu.RUnlock()

		for _, prev := range importedContexts {
			if prev == targetCtxName {
				nameCollision = true
				break
			}
		}

		if nameCollision {
			targetCtxName = fmt.Sprintf("%s (%s)", item.ContextName, fileBase)
			targetClusterName = fmt.Sprintf("%s-%s", ctxObj.Cluster, fileBase)
			targetAuthName = fmt.Sprintf("%s-%s", ctxObj.AuthInfo, fileBase)
		}

		// Create clean standalone config for this specific context
		singleCfg := clientcmdapi.NewConfig()
		newCtx := *ctxObj
		newCtx.Cluster = targetClusterName
		newCtx.AuthInfo = targetAuthName
		singleCfg.Contexts[targetCtxName] = &newCtx

		if clusterObj, ok := cfg.Clusters[ctxObj.Cluster]; ok {
			clCopy := *clusterObj
			if strings.TrimSpace(item.OverrideServer) != "" {
				newSrv := strings.TrimSpace(item.OverrideServer)
				if !strings.HasPrefix(newSrv, "http://") && !strings.HasPrefix(newSrv, "https://") {
					newSrv = "https://" + newSrv
				}
				if parsed, err := url.Parse(newSrv); err == nil {
					if parsed.Port() == "" {
						parsed.Host = parsed.Host + ":6443"
						newSrv = parsed.String()
					}
				}
				clCopy.Server = newSrv
			}
			singleCfg.Clusters[targetClusterName] = &clCopy
		}
		if userObj, ok := cfg.AuthInfos[ctxObj.AuthInfo]; ok {
			singleCfg.AuthInfos[targetAuthName] = userObj
		}
		singleCfg.CurrentContext = targetCtxName

		// Deduplicate: remove any existing file in targetDir that already defines targetCtxName
		if existingEntries, err := os.ReadDir(targetDir); err == nil {
			for _, e := range existingEntries {
				if e.IsDir() || strings.HasPrefix(e.Name(), ".") {
					continue
				}
				oldPath := filepath.Join(targetDir, e.Name())
				if oldCfg, err := clientcmd.LoadFromFile(oldPath); err == nil && oldCfg != nil {
					if _, exists := oldCfg.Contexts[targetCtxName]; exists {
						_ = os.Remove(oldPath)
					}
				}
			}
		}

		cleanName := sanitizeConfigName(targetCtxName)
		targetPath := filepath.Join(targetDir, fmt.Sprintf("%s_%d_%d.kubeconfig", cleanName, timestamp, idx))

		if err := clientcmd.WriteToFile(*singleCfg, targetPath); err != nil {
			continue
		}

		importedContexts = append(importedContexts, targetCtxName)
		lastSavedPath = targetPath
	}

	if len(importedContexts) == 0 {
		return nil, fmt.Errorf("failed to import any of the selected contexts")
	}

	// Reload manager to merge the new configurations
	if err := m.ReloadConfig(); err != nil {
		return nil, fmt.Errorf("failed to reload configs after importing system contexts: %w", err)
	}

	// Smart Context Switching:
	// If user already has an active working cluster, test candidate cluster connection.
	// Only switch if candidate is verified reachable or if no cluster was active.
	m.mu.RLock()
	currentActive := m.currentContext
	m.mu.RUnlock()

	candidateCtx := importedContexts[0]
	candidateServer := ""
	m.mu.RLock()
	if m.rawConfig != nil && m.rawConfig.Contexts[candidateCtx] != nil {
		cl := m.rawConfig.Clusters[m.rawConfig.Contexts[candidateCtx].Cluster]
		if cl != nil {
			candidateServer = cl.Server
		}
	}
	m.mu.RUnlock()

	isCandidateReachable := candidateServer != "" && probeEndpoint(candidateServer, 1500*time.Millisecond)

	activeCtx := currentActive
	if currentActive == "" || isCandidateReachable {
		activeCtx = candidateCtx
		_, _ = m.SwitchContext(activeCtx)
	}

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

func probeEndpoint(serverUrl string, timeoutDur time.Duration) bool {
	u, err := url.Parse(serverUrl)
	if err != nil {
		return false
	}
	host := u.Host
	if !strings.Contains(host, ":") {
		if u.Scheme == "https" {
			host += ":443"
		} else {
			host += ":80"
		}
	}
	conn, err := net.DialTimeout("tcp", host, timeoutDur)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}


package cluster

import (
	"fmt"
	"path/filepath"
	"strings"

	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// UpdateKubeconfigContext replaces one managed context with a validated
// single-context kubeconfig. Other contexts in the source file are preserved.
func (m *Manager) UpdateKubeconfigContext(
	contextName, yamlText string,
) (*ExportKubeconfigResult, error) {
	contextName = strings.TrimSpace(contextName)
	if contextName == "" {
		return nil, fmt.Errorf("context name is required")
	}

	updated, err := clientcmd.Load([]byte(yamlText))
	if err != nil {
		return nil, fmt.Errorf("invalid kubeconfig YAML: %w", err)
	}
	if len(updated.Contexts) != 1 {
		return nil, fmt.Errorf("edit exactly one context at a time")
	}
	ctx, ok := updated.Contexts[contextName]
	if !ok || ctx == nil {
		return nil, fmt.Errorf(
			"the YAML must keep the context name %q", contextName,
		)
	}
	if strings.TrimSpace(ctx.Cluster) == "" {
		return nil, fmt.Errorf("context %q has no cluster reference", contextName)
	}
	cluster, ok := updated.Clusters[ctx.Cluster]
	if !ok || cluster == nil {
		return nil, fmt.Errorf("cluster %q was not found in the YAML", ctx.Cluster)
	}
	var authInfo *clientcmdapi.AuthInfo
	if ctx.AuthInfo != "" {
		authInfo, ok = updated.AuthInfos[ctx.AuthInfo]
		if !ok || authInfo == nil {
			return nil, fmt.Errorf("user %q was not found in the YAML", ctx.AuthInfo)
		}
	}
	updated.CurrentContext = contextName

	files := discoverConfigFiles(m.configPath)
	if len(files) == 0 {
		return nil, fmt.Errorf("no managed kubeconfig files were found")
	}

	for _, filePath := range files {
		fileConfig, loadErr := clientcmd.LoadFromFile(filePath)
		if loadErr != nil || fileConfig == nil {
			continue
		}
		if _, exists := fileConfig.Contexts[contextName]; !exists {
			continue
		}

		delete(fileConfig.Contexts, contextName)
		pruneUnusedKubeconfigReferences(fileConfig)

		contextCopy := *ctx
		fileConfig.Contexts[contextName] = &contextCopy
		clusterCopy := *cluster
		fileConfig.Clusters[ctx.Cluster] = &clusterCopy
		if authInfo != nil {
			authCopy := *authInfo
			fileConfig.AuthInfos[ctx.AuthInfo] = &authCopy
		}

		if err := clientcmd.WriteToFile(*fileConfig, filePath); err != nil {
			return nil, fmt.Errorf(
				"failed to write kubeconfig %q: %w", filePath, err,
			)
		}
		if err := m.ReloadConfig(); err != nil {
			return nil, fmt.Errorf("failed to reload kubeconfig: %w", err)
		}

		canonical, err := clientcmd.Write(*updated)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize kubeconfig: %w", err)
		}
		return &ExportKubeconfigResult{
			ContextName: contextName,
			FileName:    filepath.Base(filePath),
			YAML:        string(canonical),
		}, nil
	}

	return nil, fmt.Errorf(
		"context %q was not found in a managed kubeconfig file", contextName,
	)
}

func pruneUnusedKubeconfigReferences(config *clientcmdapi.Config) {
	usedClusters := make(map[string]struct{}, len(config.Contexts))
	usedUsers := make(map[string]struct{}, len(config.Contexts))
	for _, context := range config.Contexts {
		if context == nil {
			continue
		}
		if context.Cluster != "" {
			usedClusters[context.Cluster] = struct{}{}
		}
		if context.AuthInfo != "" {
			usedUsers[context.AuthInfo] = struct{}{}
		}
	}
	for name := range config.Clusters {
		if _, used := usedClusters[name]; !used {
			delete(config.Clusters, name)
		}
	}
	for name := range config.AuthInfos {
		if _, used := usedUsers[name]; !used {
			delete(config.AuthInfos, name)
		}
	}
}

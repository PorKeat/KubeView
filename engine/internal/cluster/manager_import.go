package cluster

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

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

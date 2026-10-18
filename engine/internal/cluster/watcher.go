package cluster

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Watcher monitors kubeconfig files for out-of-band updates
type Watcher struct {
	manager  *Manager
	onChange func()
	logger   *log.Logger
	stopCh   chan struct{}
	mu       sync.Mutex
}

// NewWatcher creates a watcher for the manager's kubeconfig
func NewWatcher(mgr *Manager, onChange func()) *Watcher {
	return &Watcher{
		manager:  mgr,
		onChange: onChange,
		logger:   log.New(os.Stderr, "[kubeview-watcher] ", log.LstdFlags),
		stopCh:   make(chan struct{}),
	}
}

// Start begins watching the directory containing the kubeconfig file(s)
func (w *Watcher) Start() error {
	filePath := w.manager.GetConfigPath()
	watchDir := ""
	targetName := ""

	if filePath != "" {
		watchDir = filepath.Dir(filePath)
		targetName = filepath.Base(filePath)
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			return err
		}
		watchDir = filepath.Join(home, ".kube")
	}

	if _, err := os.Stat(watchDir); err != nil {
		return nil // directory doesn't exist yet
	}

	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	if err := fsWatcher.Add(watchDir); err != nil {
		_ = fsWatcher.Close()
		return err
	}

	w.logger.Printf("Watching kubeconfig directory: %s", watchDir)

	go func() {
		defer fsWatcher.Close()

		var debounceTimer *time.Timer
		var debounceMu sync.Mutex

		triggerChange := func() {
			w.logger.Printf("Kubeconfig modified on disk, reloading...")
			if err := w.manager.ReloadConfig(); err != nil {
				w.logger.Printf("Error reloading kubeconfig: %v", err)
				return
			}
			if w.onChange != nil {
				w.onChange()
			}
		}

		for {
			select {
			case <-w.stopCh:
				return
			case event, ok := <-fsWatcher.Events:
				if !ok {
					return
				}

				// Check if the modified file matches target kubeconfig or any config file
				fileName := filepath.Base(event.Name)
				matched := false
				if targetName != "" {
					matched = (fileName == targetName)
				} else {
					matched = (fileName == "config" || strings.HasSuffix(fileName, ".yaml") || strings.HasSuffix(fileName, ".yml")) &&
						!strings.Contains(fileName, ".bak") && !strings.Contains(fileName, ".backup")
				}

				if matched {
					debounceMu.Lock()
					if debounceTimer != nil {
						debounceTimer.Stop()
					}
					debounceTimer = time.AfterFunc(300*time.Millisecond, triggerChange)
					debounceMu.Unlock()
				}
			case err, ok := <-fsWatcher.Errors:
				if !ok {
					return
				}
				w.logger.Printf("Watcher error: %v", err)
			}
		}
	}()

	return nil
}

// Stop halts the watcher
func (w *Watcher) Stop() {
	w.mu.Lock()
	defer w.mu.Unlock()
	select {
	case <-w.stopCh:
	default:
		close(w.stopCh)
	}
}

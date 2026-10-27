package cluster

import (
	"os"
	"strings"
	"sync"
	"time"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
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

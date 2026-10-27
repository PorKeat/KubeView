package cluster

import (
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func newFakeManager(client kubernetes.Interface) *Manager {
	return &Manager{
		currentContext: "test",
		clientsets:     map[string]kubernetes.Interface{"test": client},
		restConfigs:    map[string]*rest.Config{"test": {}},
		dynamicClients: make(map[string]dynamic.Interface),
		overviewCache:  make(map[string]cachedOverview),
		overviewCalls:  make(map[string]*overviewCall),
		forwards:       make(map[string]*portForwardSession),
	}
}

func attachDynamicClient(manager *Manager, contextName string, client dynamic.Interface) {
	if manager.dynamicClients == nil {
		manager.dynamicClients = make(map[string]dynamic.Interface)
	}
	manager.dynamicClients[contextName] = client
}

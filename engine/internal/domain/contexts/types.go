package contexts

import shared "github.com/kubeview/engine/internal/domain/shared"

type Context = shared.ClusterContext

type ListResult struct {
	CurrentContext string
	Contexts       []Context
	ConfigPath     string
}

type SwitchResult struct {
	ActiveContext string
	Context       Context
	Status        string
}

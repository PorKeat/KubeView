package cluster

// ProviderType identifies the Kubernetes distribution
type ProviderType string

const (
	ProviderKind     ProviderType = "kind"
	ProviderMinikube ProviderType = "minikube"
	ProviderEKS      ProviderType = "eks"
	ProviderGKE      ProviderType = "gke"
	ProviderAKS      ProviderType = "aks"
	ProviderGeneric  ProviderType = "generic"
)

// AuthType describes how authentication is performed
type AuthType string

const (
	AuthCert    AuthType = "cert"
	AuthToken   AuthType = "token"
	AuthExec    AuthType = "exec"
	AuthOIDC    AuthType = "oidc"
	AuthUnknown AuthType = "unknown"
)

// ContextSummary contains safe context metadata without credentials
type ContextSummary struct {
	Name      string       `json:"name"`
	Cluster   string       `json:"cluster"`
	Server    string       `json:"server"`
	User      string       `json:"user"`
	Namespace string       `json:"namespace"`
	IsCurrent bool         `json:"isCurrent"`
	Provider  ProviderType `json:"provider"`
	AuthType  AuthType     `json:"authType"`
}

// ListContextsResult returned to caller
type ListContextsResult struct {
	CurrentContext string           `json:"currentContext"`
	Contexts       []ContextSummary `json:"contexts"`
	ConfigPath     string           `json:"configPath"`
}

// SwitchContextParams specifies the new context to activate
type SwitchContextParams struct {
	ContextName string `json:"contextName"`
}

// SwitchContextResult returned after activating a context
type SwitchContextResult struct {
	ActiveContext string         `json:"activeContext"`
	Context       ContextSummary `json:"context"`
	Status        string         `json:"status"` // "ready" | "failed"
}

// ListNamespacesParams for listing namespaces in the active or requested context
type ListNamespacesParams struct {
	ContextName string `json:"contextName,omitempty"`
}

// ListNamespacesResult returned to caller
type ListNamespacesResult struct {
	Namespaces []string `json:"namespaces"`
}

// ImportKubeconfigParams provides either raw YAML text or a local file path
type ImportKubeconfigParams struct {
	RawYAML  string `json:"rawYaml,omitempty"`
	FilePath string `json:"filePath,omitempty"`
	Name     string `json:"name,omitempty"`
}

// ImportKubeconfigResult returned after successfully parsing and persisting kubeconfig
type ImportKubeconfigResult struct {
	Success          bool     `json:"success"`
	ImportedContexts []string `json:"importedContexts"`
	ActiveContext    string   `json:"activeContext"`
	SavedPath        string   `json:"savedPath"`
	TotalContexts    int      `json:"totalContexts"`
}

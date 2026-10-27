package cluster

type ServiceAccountSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	SecretNames       []string          `json:"secretNames"`
	ImagePullSecrets  []string          `json:"imagePullSecretNames"`
	Automount         *bool             `json:"automount,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ListServiceAccountsResult struct {
	Items      []ServiceAccountSummary `json:"items"`
	TotalCount int                     `json:"totalCount"`
}

// RBACRuleSummary is a display-ready policy rule.
type RBACRuleSummary struct {
	Verbs           []string `json:"verbs"`
	APIGroups       []string `json:"apiGroups"`
	Resources       []string `json:"resources"`
	ResourceNames   []string `json:"resourceNames"`
	NonResourceURLs []string `json:"nonResourceURLs"`
}

type RBACSubjectSummary struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// RBACResourceSummary is a display-ready Role, ClusterRole, or binding.
type RBACResourceSummary struct {
	Kind              string               `json:"kind"`
	Name              string               `json:"name"`
	Namespace         string               `json:"namespace,omitempty"`
	RoleRef           string               `json:"roleRef,omitempty"`
	Rules             []RBACRuleSummary    `json:"rules"`
	Subjects          []RBACSubjectSummary `json:"subjects"`
	Age               string               `json:"age"`
	CreationTimestamp string               `json:"creationTimestamp"`
	Labels            map[string]string    `json:"labels,omitempty"`
	Annotations       map[string]string    `json:"annotations,omitempty"`
}

type ListRBACResourcesResult struct {
	Items      []RBACResourceSummary `json:"items"`
	TotalCount int                   `json:"totalCount"`
}

type CRDVersionSummary struct {
	Name    string `json:"name"`
	Served  bool   `json:"served"`
	Storage bool   `json:"storage"`
}

// CRDSummary is a display-ready CustomResourceDefinition row.
type CRDSummary struct {
	Name              string              `json:"name"`
	Group             string              `json:"group"`
	Kind              string              `json:"kind"`
	Plural            string              `json:"plural"`
	Scope             string              `json:"scope"`
	Versions          []CRDVersionSummary `json:"versions"`
	Age               string              `json:"age"`
	CreationTimestamp string              `json:"creationTimestamp"`
	Labels            map[string]string   `json:"labels,omitempty"`
	Annotations       map[string]string   `json:"annotations,omitempty"`
}

type ListCRDsResult struct {
	Items      []CRDSummary `json:"items"`
	TotalCount int          `json:"totalCount"`
}

type CustomResourceSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace,omitempty"`
	Status            string            `json:"status,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ListCustomResourcesResult struct {
	Items      []CustomResourceSummary `json:"items"`
	TotalCount int                     `json:"totalCount"`
}

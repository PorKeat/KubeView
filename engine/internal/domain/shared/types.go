package shared

// ClusterContext is the safe, transport-independent identity of a cluster
// context. Credentials never belong in this model.
type ClusterContext struct {
	Name      string
	Cluster   string
	Server    string
	User      string
	Namespace string
	IsCurrent bool
	Provider  string
	AuthType  string
}

type HealthStatus string

const (
	HealthStatusHealthy  HealthStatus = "healthy"
	HealthStatusDegraded HealthStatus = "degraded"
	HealthStatusOffline  HealthStatus = "offline"
)

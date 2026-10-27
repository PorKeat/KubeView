package cluster

// FleetWorkloadBreakdown reports degraded controller counts by workload kind.
type FleetWorkloadBreakdown struct {
	Deployments  int `json:"deployments"`
	ReplicaSets  int `json:"replicaSets"`
	StatefulSets int `json:"statefulSets"`
	DaemonSets   int `json:"daemonSets"`
	Jobs         int `json:"jobs"`
	CronJobs     int `json:"cronJobs"`
}

// FleetClusterOverview is the compact, cross-cluster health snapshot shown by
// the All Clusters dashboard. It intentionally omits node and event arrays.
type FleetClusterOverview struct {
	ContextName string       `json:"contextName"`
	Cluster     string       `json:"cluster"`
	Server      string       `json:"server"`
	Provider    ProviderType `json:"provider"`
	AuthType    AuthType     `json:"authType"`
	IsCurrent   bool         `json:"isCurrent"`
	Status      string       `json:"status"`
	Error       string       `json:"error,omitempty"`

	TotalNodes              int                    `json:"totalNodes"`
	ReadyNodes              int                    `json:"readyNodes"`
	TotalPods               int                    `json:"totalPods"`
	RunningPods             int                    `json:"runningPods"`
	PendingPods             int                    `json:"pendingPods"`
	FailedPods              int                    `json:"failedPods"`
	DegradedWorkloads       int                    `json:"degradedWorkloads"`
	DegradedWorkloadsByKind FleetWorkloadBreakdown `json:"degradedWorkloadsByKind"`
	WarningCount            int                    `json:"warningCount"`

	TotalCPUCores      float64 `json:"totalCpuCores"`
	CPUPercent         int     `json:"cpuPercent"`
	CPUUsagePercent    int     `json:"cpuUsagePercent,omitempty"`
	TotalMemoryGiB     float64 `json:"totalMemoryGiB"`
	MemoryPercent      int     `json:"memoryPercent"`
	MemoryUsagePercent int     `json:"memoryUsagePercent,omitempty"`
	HasMetrics         bool    `json:"hasMetrics"`
	FetchedAt          string  `json:"fetchedAt"`
}

type FleetOverviewTotals struct {
	Total             int `json:"total"`
	Healthy           int `json:"healthy"`
	Degraded          int `json:"degraded"`
	Offline           int `json:"offline"`
	TotalNodes        int `json:"totalNodes"`
	ReadyNodes        int `json:"readyNodes"`
	TotalPods         int `json:"totalPods"`
	RunningPods       int `json:"runningPods"`
	FailedPods        int `json:"failedPods"`
	DegradedWorkloads int `json:"degradedWorkloads"`
	WarningCount      int `json:"warningCount"`
}

type FleetOverviewResult struct {
	Clusters  []FleetClusterOverview `json:"clusters"`
	Totals    FleetOverviewTotals    `json:"totals"`
	FetchedAt string                 `json:"fetchedAt"`
}

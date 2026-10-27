package fleet

import "time"

type Status string

const (
	StatusHealthy  Status = "healthy"
	StatusDegraded Status = "degraded"
	StatusOffline  Status = "offline"
)

type Context struct {
	Name      string
	Cluster   string
	Server    string
	Provider  string
	AuthType  string
	IsCurrent bool
}

type WorkloadBreakdown struct {
	Deployments  int
	ReplicaSets  int
	StatefulSets int
	DaemonSets   int
	Jobs         int
	CronJobs     int
}

func (breakdown WorkloadBreakdown) Total() int {
	return breakdown.Deployments +
		breakdown.ReplicaSets +
		breakdown.StatefulSets +
		breakdown.DaemonSets +
		breakdown.Jobs +
		breakdown.CronJobs
}

type Overview struct {
	TotalNodes              int
	ReadyNodes              int
	TotalPods               int
	RunningPods             int
	PendingPods             int
	FailedPods              int
	DegradedWorkloadsByKind WorkloadBreakdown
	WarningCount            int
	TotalCPUCores           float64
	CPUPercent              int
	CPUUsagePercent         int
	TotalMemoryGiB          float64
	MemoryPercent           int
	MemoryUsagePercent      int
	HasMetrics              bool
}

type Snapshot struct {
	Context   Context
	Status    Status
	Error     string
	Overview  Overview
	FetchedAt time.Time
}

type Totals struct {
	Total             int
	Healthy           int
	Degraded          int
	Offline           int
	TotalNodes        int
	ReadyNodes        int
	TotalPods         int
	RunningPods       int
	FailedPods        int
	DegradedWorkloads int
	WarningCount      int
}

type Result struct {
	Clusters  []Snapshot
	Totals    Totals
	FetchedAt time.Time
}

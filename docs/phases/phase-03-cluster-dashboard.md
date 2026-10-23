# Phase 3: Cluster Overview & Dashboard Specification

> **Phase Goal:** Build an actionable cluster dashboard using **Apache ECharts** that immediately highlights what is broken, summarizes capacity utilization, and allows single-click navigation directly to affected resources.

---

## 1. Functional Scope

### 1.1 Cluster Health & Status Gauge

- Control plane health indicators: API Server, Controller Manager, Scheduler, etcd (when accessible).
- Node readiness aggregate: Total nodes, Ready, NotReady, SchedulingDisabled / Cordoned.
- Cluster version and runtime details (e.g. `v1.34.1`, container runtime `containerd://1.7.x`).

### 1.2 Workload Status Summary

- **Pod Status Breakdown:** Donut chart and counters for:
  - Running (Healthy `#38B879`)
  - Pending (Scheduling bottlenecks `#F5A623`)
  - CrashLoopBackOff / Error (`#E05252`)
  - Succeeded / Completed (`#8A919E`)
- **Workload Rollups:**
  - Deployments: Available vs Desired replicas.
  - StatefulSets: Ready vs Desired replicas.
  - DaemonSets: Available vs Desired nodes.
  - Jobs / CronJobs: Active vs Failed executions.

### 1.3 CPU & Memory Capacity Utilization (Apache ECharts)

- Interactive, responsive charts rendered via **Apache ECharts**:
  - Live CPU core consumption vs allocatable cluster cores.
  - Live Memory (RAM) consumption vs allocatable cluster memory.
- Dynamic data sourcing:
  - If Kubernetes Metrics Server is installed: stream live resource utilization.
  - If Prometheus is detected: link historical trends.
  - If no metrics provider is detected: display fallback capacity cards with install hints.

### 1.4 Problem Workloads & Warning Events Ticker (Better than Freelens)

- **Active Warning Feed:** Live feed of Kubernetes `Warning` events across the selected namespace or entire cluster.
- **Problem Workload Card:** Automatically identifies pods in `CrashLoopBackOff`, `ImagePullBackOff`, `OOMKilled`, or `NodeDiskPressure`.
- **Direct 1-Click Triage:** Clicking any failing workload card immediately opens Phase 6's unified Troubleshooting Workbench for that specific pod.

### 1.5 Storage & Namespace Rollups

- PersistentVolume allocation: Bound vs Available vs Released volume storage.
- Top namespaces by resource consumption and active workload density.
- Reorderable and collapsible widget cards tailored to the engineer's operational focus.

---

## 2. Technical Implementation Architecture

```
[Kubernetes API] ──► [Go Events Informer] ────┐
                                              ├──► [Go Dashboard Aggregator]
[Metrics API]    ──► [Go Metrics Poller (15s)] ──┘             │
                                                               ▼ (JSON-RPC Push Event)
                                                   [React Dashboard View]
                                                               │
                       ┌───────────────────────────────────────┼───────────────────────────┐
                       ▼                                       ▼                           ▼
              [Health Gauge Card]                    [Problem Workloads]         [ECharts Meters]
```

---

## 3. Acceptance Criteria & Quality Gates

1. **Glanceability:** An engineer can determine cluster health and failing workloads within 3 seconds of looking at the screen.
2. **One-Click Triage:** Clicking a failing pod in the Problem Workloads card opens the Troubleshooting Workbench within 200ms.
3. **Metrics Gracefulness:** If the cluster lacks Metrics Server, the dashboard does not throw errors; it gracefully indicates metrics are unavailable with setup instructions.
4. **Performance:** ECharts components consume minimal CPU (<1% idle) and do not animate continuously on periodic data refresh to preserve performance.

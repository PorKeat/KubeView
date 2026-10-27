import type { PodEventItem } from "./pods.js";
export interface NodeSummary {
  name: string;
  status: string;
  roles: string[];
  version: string;
  architecture: string;
  internalIP: string;
  podCIDR?: string;
  podCIDRs?: string[];
  cpuCapacity: string;
  cpuCores: number;
  cpuAllocated: string;
  cpuPercent: number;
  cpuUsage?: string;
  cpuUsagePercent?: number;
  memoryCapacity: string;
  memoryGiB: number;
  memoryAllocated: string;
  memoryPercent: number;
  memoryUsage?: string;
  memoryUsagePercent?: number;
  podCapacity: number;
  activePods: number;
}

export interface ClusterOverviewParams {
  contextName?: string;
}

export interface WorkloadControllerHealth {
  total: number;
  ready: number;
  degraded: number;
  unreadyList?: string[];
}

export interface WorkloadsSummary {
  deployments: WorkloadControllerHealth;
  replicaSets?: WorkloadControllerHealth;
  statefulSets: WorkloadControllerHealth;
  daemonSets: WorkloadControllerHealth;
  jobs: WorkloadControllerHealth;
  cronJobs: WorkloadControllerHealth;
}

export interface ClusterOverviewResult {
  contextName: string;
  totalNodes: number;
  readyNodes: number;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  succeededPods: number;
  totalCpuCores: number;
  allocatedCpuCores: number;
  cpuPercent: number;
  usedCpuCores?: number;
  cpuUsagePercent?: number;
  totalMemoryGiB: number;
  allocatedMemoryGiB: number;
  memoryPercent: number;
  usedMemoryGiB?: number;
  memoryUsagePercent?: number;
  podCapacity: number;
  podPercent: number;
  hasMetrics?: boolean;
  nodes: NodeSummary[];
  warningEvents: PodEventItem[];
  warningEventCount?: number;
  workloads?: WorkloadsSummary;
}

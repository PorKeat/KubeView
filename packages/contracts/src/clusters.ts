/**
 * Cluster Contexts, Connectivity Status, and Diagnostic Models
 */

export type ProviderType =
  "kind" | "eks" | "gke" | "aks" | "minikube" | "generic";
export type AuthType = "cert" | "token" | "exec" | "oidc" | "unknown";

export interface ContextSummary {
  name: string;
  cluster: string;
  server: string;
  user: string;
  namespace: string;
  isCurrent: boolean;
  provider: ProviderType;
  authType: AuthType;
}

export interface ListContextsResult {
  currentContext: string;
  contexts: ContextSummary[];
  configPath: string;
}

export interface SwitchContextResult {
  activeContext: string;
  context: ContextSummary;
  status: "ready" | "failed";
}

export type FleetClusterStatus = "healthy" | "degraded" | "offline";

export interface FleetWorkloadBreakdown {
  deployments: number;
  replicaSets: number;
  statefulSets: number;
  daemonSets: number;
  jobs: number;
  cronJobs: number;
}

export interface FleetClusterOverview {
  contextName: string;
  cluster: string;
  server: string;
  provider: ProviderType;
  authType: AuthType;
  isCurrent: boolean;
  status: FleetClusterStatus;
  error?: string;
  totalNodes: number;
  readyNodes: number;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  degradedWorkloads: number;
  degradedWorkloadsByKind: FleetWorkloadBreakdown;
  warningCount: number;
  totalCpuCores: number;
  cpuPercent: number;
  cpuUsagePercent?: number;
  totalMemoryGiB: number;
  memoryPercent: number;
  memoryUsagePercent?: number;
  hasMetrics: boolean;
  fetchedAt: string;
}

export interface FleetOverviewTotals {
  total: number;
  healthy: number;
  degraded: number;
  offline: number;
  totalNodes: number;
  readyNodes: number;
  totalPods: number;
  runningPods: number;
  failedPods: number;
  degradedWorkloads: number;
  warningCount: number;
}

export interface FleetOverviewResult {
  clusters: FleetClusterOverview[];
  totals: FleetOverviewTotals;
  fetchedAt: string;
}

export interface ListNamespacesResult {
  namespaces: string[];
}

export interface DiagnosticStage {
  name: "network" | "authentication" | "tls" | "rbac";
  passed: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface DiagnosticResult {
  clusterId: string;
  status: "connected" | "degraded" | "failed";
  serverVersion?: string;
  latencyMs?: number;
  stages: Record<string, DiagnosticStage>;
  remediation?: string;
}

export interface ClusterSummary {
  id: string;
  name: string;
  serverUrl: string;
  kubernetesVersion?: string;
  nodeCount?: number;
  status: "connected" | "degraded" | "offline" | "checking";
  latencyMs?: number;
}

export interface ImportKubeconfigFileItem {
  rawYaml?: string;
  filePath?: string;
  name?: string;
}

export interface ImportKubeconfigParams {
  rawYaml?: string;
  filePath?: string;
  name?: string;
  files?: ImportKubeconfigFileItem[];
}

export interface ImportKubeconfigResult {
  success: boolean;
  importedContexts: string[];
  activeContext: string;
  savedPath: string;
  totalContexts: number;
}

export interface ExportKubeconfigResult {
  contextName: string;
  fileName: string;
  yaml: string;
}

export interface UpdateKubeconfigContextParams {
  contextName: string;
  yaml: string;
}

export interface DetectedContextInfo {
  contextName: string;
  clusterName: string;
  server: string;
  user: string;
  provider: ProviderType;
  authType: AuthType;
  filePath: string;
  fileName: string;
  isImported: boolean;
}

export interface DetectSystemConfigsResult {
  discoveredFiles: string[];
  contexts: DetectedContextInfo[];
}

export interface ImportDetectedContextItem {
  contextName: string;
  filePath: string;
  overrideServer?: string;
}

export interface ImportDetectedContextsParams {
  contexts: ImportDetectedContextItem[];
}

export interface UpdateEndpointParams {
  contextName: string;
  newServer: string;
}

export interface UpdateEndpointResult {
  success: boolean;
  contextName: string;
  newServer: string;
}

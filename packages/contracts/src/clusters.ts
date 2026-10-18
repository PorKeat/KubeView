/**
 * Cluster Contexts, Connectivity Status, and Diagnostic Models
 */

export interface KubeContext {
  name: string;
  cluster: string;
  user: string;
  namespace?: string;
  isCurrent?: boolean;
  serverUrl?: string;
  authType?: "cert" | "token" | "exec" | "oidc" | "unknown";
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

export interface DiagnosticStage {
  name: "network" | "authentication" | "tls" | "rbac";
  passed: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface DiagnosticResult {
  clusterId: string;
  status: "connected" | "failed";
  serverVersion?: string;
  latencyMs?: number;
  stages: Record<string, DiagnosticStage>;
  remediation?: string;
}

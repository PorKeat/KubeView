/**
 * Cluster Contexts, Connectivity Status, and Diagnostic Models
 */

export type ProviderType = "kind" | "eks" | "gke" | "aks" | "minikube" | "generic";
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

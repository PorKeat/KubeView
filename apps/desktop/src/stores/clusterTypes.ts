import type {
  DiagnosticResult,
  ProviderType,
  ImportKubeconfigParams,
  ImportKubeconfigResult,
  PodSummary,
  DeploymentSummary,
  PodLogsParams,
  PodLogsResult,
  DeletePodParams,
  RestartPodParams,
  ExecPodParams,
  ExecPodResult,
  PodEventItem,
  ClusterOverviewResult,
  DetectedContextInfo,
  ImportDetectedContextItem,
} from "@kubeview/contracts";

export interface ClusterContextInfo {
  name: string;
  cluster: string;
  server: string;
  provider: ProviderType;
  status: "connected" | "degraded" | "offline" | "checking";
  latencyMs: number;
  namespace?: string;
  authType?: string;
}

export interface SelectedResource {
  kind: string;
  name: string;
  namespace: string;
  status: string;
  data?: Record<string, unknown>;
}

export interface PodModalTarget {
  name: string;
  namespace: string;
  container?: string;
}

export interface ClusterState {
  currentContext: string;
  availableContexts: ClusterContextInfo[];
  currentNamespace: string;
  availableNamespaces: string[];
  connectionStatus: "connected" | "degraded" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  rbacMode: "cluster-admin" | "namespace-scoped";
  configPath: string;
  diagnosticResult: DiagnosticResult | null;
  selectedResource: SelectedResource | null;
  isInspectorOpen: boolean;
  isLoading: boolean;
  isKubeconfigModalOpen: boolean;
  kubeconfigModalTab: "auto" | "browse" | "paste" | "manage";
  splashDismissed: boolean;

  // Real cluster overview & pods telemetry
  clusterOverview: ClusterOverviewResult | null;
  isOverviewLoading: boolean;
  pods: PodSummary[];
  totalPodsCount: number;
  isPodsLoading: boolean;
  hasLoadedPodsOnce: boolean;
  podNodeFilter: string | null;
  setPodNodeFilter: (nodeName: string | null) => void;

  // Deployment workloads
  deployments: DeploymentSummary[];
  totalDeploymentsCount: number;
  isDeploymentsLoading: boolean;
  hasLoadedDeploymentsOnce: boolean;

  // OS Auto-Detected Kubeconfig Contexts
  detectedSystemConfigs: DetectedContextInfo[];
  isDetectingConfigs: boolean;

  // Action modals for Pods
  logsModalPod: PodModalTarget | null;
  execModalPod: PodModalTarget | null;
  deleteConfirmPod: { name: string; namespace: string } | null;
  restartConfirmPod: { name: string; namespace: string } | null;
  bulkDeleteConfirmPods: { name: string; namespace: string }[] | null;
  bulkRestartConfirmPods: { name: string; namespace: string }[] | null;

  // Auto-refresh interval (0 = off, 3000, 5000, 10000, 30000)
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;

  // Endpoint configuration modal
  isEndpointModalOpen: boolean;
  endpointModalContextName: string;
  endpointModalCurrentServer: string;
  openEndpointModal: (contextName: string, currentServer: string) => void;
  closeEndpointModal: () => void;

  // Actions
  loadContexts: () => Promise<void>;
  switchContext: (contextName: string) => Promise<void>;
  diagnoseContext: (contextName?: string) => Promise<DiagnosticResult | null>;
  loadNamespaces: (contextName?: string) => Promise<void>;
  loadClusterOverview: (contextName?: string, namespace?: string) => Promise<ClusterOverviewResult | null>;
  loadPods: (namespace?: string, contextName?: string) => Promise<void>;
  loadDeployments: (namespace?: string, contextName?: string) => Promise<void>;
  getPodLogs: (params: PodLogsParams) => Promise<PodLogsResult>;
  deletePod: (params: DeletePodParams) => Promise<void>;
  restartPod: (params: RestartPodParams) => Promise<void>;
  bulkDeletePods: (
    pods: { name: string; namespace: string }[],
    force?: boolean
  ) => Promise<{ succeeded: number; failed: number }>;
  bulkRestartPods: (
    pods: { name: string; namespace: string }[]
  ) => Promise<{ succeeded: number; failed: number }>;
  execPod: (params: ExecPodParams) => Promise<ExecPodResult>;
  getPodYaml: (podName: string, namespace: string, contextName?: string) => Promise<string>;
  getPodEvents: (podName: string, namespace: string, contextName?: string) => Promise<PodEventItem[]>;

  openLogsModal: (pod: PodModalTarget) => void;
  closeLogsModal: () => void;
  openExecModal: (pod: PodModalTarget) => void;
  closeExecModal: () => void;
  openDeleteConfirm: (pod: { name: string; namespace: string }) => void;
  closeDeleteConfirm: () => void;
  openRestartConfirm: (pod: { name: string; namespace: string }) => void;
  closeRestartConfirm: () => void;
  openBulkDeleteConfirm: (pods: { name: string; namespace: string }[]) => void;
  closeBulkDeleteConfirm: () => void;
  openBulkRestartConfirm: (pods: { name: string; namespace: string }[]) => void;
  closeBulkRestartConfirm: () => void;

  setCurrentContext: (context: string) => void;
  setCurrentNamespace: (namespace: string) => void;
  setConnectionStatus: (status: "connected" | "degraded" | "checking" | "offline") => void;
  setServerInfo: (version: string, latency: number) => void;
  openInspector: (resource: SelectedResource) => void;
  closeInspector: () => void;
  openKubeconfigModal: (tab?: "auto" | "browse" | "paste" | "manage") => void;
  closeKubeconfigModal: () => void;
  setSplashDismissed: (dismissed: boolean) => void;
  importKubeconfig: (params: ImportKubeconfigParams) => Promise<ImportKubeconfigResult>;
  detectSystemConfigs: () => Promise<DetectedContextInfo[]>;
  importDetectedContexts: (contexts: ImportDetectedContextItem[]) => Promise<ImportKubeconfigResult>;
  deleteContext: (contextName: string) => Promise<void>;
  updateEndpoint: (contextName: string, newServer: string, insecure?: boolean) => Promise<void>;
  clearAllContexts: () => Promise<void>;
  initEventListener: () => Promise<() => void>;
}

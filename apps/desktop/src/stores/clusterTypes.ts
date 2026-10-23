import type {
  DiagnosticResult,
  ProviderType,
  ImportKubeconfigParams,
  ImportKubeconfigResult,
  PodSummary,
  DeploymentSummary,
  ReplicaSetSummary,
  DeploymentActionParams,
  ReplicaSetActionParams,
  StatefulSetSummary,
  StatefulSetActionParams,
  DaemonSetSummary,
  DaemonSetActionParams,
  JobSummary,
  JobActionParams,
  CronJobSummary,
  CronJobActionParams,
  CronJobTriggerResult,
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

/**
 * Workload actions mirror kubectl semantics.
 * Deployments support scale, rollout restart, and delete.
 * ReplicaSets support scale and delete; kubectl has no ReplicaSet restart.
 */
export type WorkloadActionRequest =
  | {
      kind: "Deployment";
      action: "scale" | "restart" | "delete";
      name: string;
      namespace: string;
      replicas?: number;
    }
  | {
      kind: "ReplicaSet";
      action: "scale" | "delete";
      name: string;
      namespace: string;
      replicas?: number;
      ownerDeployment?: string;
    }
  | {
      kind: "StatefulSet";
      action: "scale" | "restart" | "delete";
      name: string;
      namespace: string;
      replicas?: number;
      serviceName?: string;
      podManagementPolicy?: string;
      updateStrategy?: string;
      partition?: number;
      maxUnavailable?: string;
      pvcRetentionWhenDeleted?: string;
      pvcRetentionWhenScaled?: string;
    }
  | {
      kind: "DaemonSet";
      action: "restart" | "delete";
      name: string;
      namespace: string;
      updateStrategy?: string;
      maxUnavailable?: string;
      maxSurge?: string;
    }
  | {
      kind: "Job";
      action: "delete";
      name: string;
      namespace: string;
      ownerCronJob?: string;
      active?: number;
    }
  | {
      kind: "CronJob";
      action: "delete" | "suspend" | "resume" | "trigger";
      name: string;
      namespace: string;
      schedule?: string;
      suspend?: boolean;
      concurrencyPolicy?: string;
    };

export interface BulkWorkloadTarget {
  name: string;
  namespace: string;
}

export interface BulkWorkloadActionResult {
  succeeded: number;
  failed: number;
}

/**
 * Bulk mutations only expose actions that are valid for every target kind.
 * ReplicaSets have no rollout restart; Jobs have no scale or restart.
 */
export type BulkWorkloadActionRequest =
  | {
      kind: "ReplicaSet";
      action: "delete";
      targets: BulkWorkloadTarget[];
      onCompleted?: () => void;
    }
  | {
      kind: "StatefulSet";
      action: "restart" | "delete";
      targets: BulkWorkloadTarget[];
      onCompleted?: () => void;
    }
  | {
      kind: "DaemonSet";
      action: "restart" | "delete";
      targets: BulkWorkloadTarget[];
      onCompleted?: () => void;
    }
  | {
      kind: "Job";
      action: "delete";
      targets: BulkWorkloadTarget[];
      onCompleted?: () => void;
    };

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
  podLabelFilter: string | null;
  podLabelFilterSource: string | null;
  setPodLabelFilter: (
    selector: string | null,
    source?: string | null,
  ) => void;

  // Deployment workloads
  deployments: DeploymentSummary[];
  totalDeploymentsCount: number;
  isDeploymentsLoading: boolean;
  hasLoadedDeploymentsOnce: boolean;

  // ReplicaSet workloads
  replicaSets: ReplicaSetSummary[];
  totalReplicaSetsCount: number;
  isReplicaSetsLoading: boolean;
  hasLoadedReplicaSetsOnce: boolean;

  // StatefulSet workloads
  statefulSets: StatefulSetSummary[];
  totalStatefulSetsCount: number;
  isStatefulSetsLoading: boolean;
  hasLoadedStatefulSetsOnce: boolean;

  // DaemonSet workloads
  daemonSets: DaemonSetSummary[];
  totalDaemonSetsCount: number;
  isDaemonSetsLoading: boolean;
  hasLoadedDaemonSetsOnce: boolean;

  // Job workloads
  jobs: JobSummary[];
  totalJobsCount: number;
  isJobsLoading: boolean;
  hasLoadedJobsOnce: boolean;
  jobOwnerFilter: string | null;
  setJobOwnerFilter: (owner: string | null) => void;
  jobsViewMode: "jobs" | "cronjobs";
  setJobsViewMode: (mode: "jobs" | "cronjobs") => void;

  // CronJob workloads
  cronJobs: CronJobSummary[];
  totalCronJobsCount: number;
  isCronJobsLoading: boolean;
  hasLoadedCronJobsOnce: boolean;

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

  workloadAction: WorkloadActionRequest | null;
  openWorkloadAction: (action: WorkloadActionRequest) => void;
  closeWorkloadAction: () => void;

  bulkWorkloadAction: BulkWorkloadActionRequest | null;
  openBulkWorkloadAction: (action: BulkWorkloadActionRequest) => void;
  closeBulkWorkloadAction: () => void;
  executeBulkWorkloadAction: (
    action: BulkWorkloadActionRequest,
  ) => Promise<BulkWorkloadActionResult>;

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
  loadReplicaSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadStatefulSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadDaemonSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadJobs: (namespace?: string, contextName?: string) => Promise<void>;
  loadCronJobs: (namespace?: string, contextName?: string) => Promise<void>;
  getPodLogs: (params: PodLogsParams) => Promise<PodLogsResult>;
  deletePod: (params: DeletePodParams) => Promise<void>;
  restartPod: (params: RestartPodParams) => Promise<void>;
  restartDeployment: (params: DeploymentActionParams) => Promise<void>;
  scaleDeployment: (params: DeploymentActionParams) => Promise<void>;
  deleteDeployment: (params: DeploymentActionParams) => Promise<void>;
  scaleReplicaSet: (params: ReplicaSetActionParams) => Promise<void>;
  deleteReplicaSet: (params: ReplicaSetActionParams) => Promise<void>;
  restartStatefulSet: (params: StatefulSetActionParams) => Promise<void>;
  scaleStatefulSet: (params: StatefulSetActionParams) => Promise<void>;
  deleteStatefulSet: (params: StatefulSetActionParams) => Promise<void>;
  restartDaemonSet: (params: DaemonSetActionParams) => Promise<void>;
  deleteDaemonSet: (params: DaemonSetActionParams) => Promise<void>;
  deleteJob: (params: JobActionParams) => Promise<void>;
  deleteCronJob: (params: CronJobActionParams) => Promise<void>;
  suspendCronJob: (params: CronJobActionParams) => Promise<void>;
  resumeCronJob: (params: CronJobActionParams) => Promise<void>;
  triggerCronJob: (params: CronJobActionParams) => Promise<string>;
  bulkDeletePods: (
    pods: { name: string; namespace: string }[],
    force?: boolean
  ) => Promise<{ succeeded: number; failed: number }>;
  bulkRestartPods: (
    pods: { name: string; namespace: string }[]
  ) => Promise<{ succeeded: number; failed: number }>;
  execPod: (params: ExecPodParams) => Promise<ExecPodResult>;
  getPodYaml: (podName: string, namespace: string, contextName?: string) => Promise<string>;
  getDeploymentYaml: (name: string, namespace: string, contextName?: string) => Promise<string>;
  getReplicaSetYaml: (name: string, namespace: string, contextName?: string) => Promise<string>;
  getStatefulSetYaml: (name: string, namespace: string, contextName?: string) => Promise<string>;
  getDaemonSetYaml: (name: string, namespace: string, contextName?: string) => Promise<string>;
  getJobYaml: (name: string, namespace: string, contextName?: string) => Promise<string>;
  getCronJobYaml: (name: string, namespace: string, contextName?: string) => Promise<string>;
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

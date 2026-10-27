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
  ServiceSummary,
  EndpointsSummary,
  IngressSummary,
  GatewayResourceSummary,
  NetworkPolicySummary,
  ConfigMapSummary,
  SecretSummary,
  PersistentVolumeSummary,
  StorageClassSummary,
  ServiceAccountSummary,
  RBACResourceSummary,
  CRDSummary,
  NetworkingCountsResult,
  NetworkObservabilityResult,
  DiagnoseServiceResult,
  PortForwardRequest,
  PortForwardSession,
  ListCiliumResourcesResult,
  HubbleFlowSummary,
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
  initialTab?: "overview" | "edit";
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

export interface ResourceEditorTarget {
  kind: "Ingress" | "GatewayClass" | "Gateway" | "HTTPRoute" | "GRPCRoute";
  name: string;
  namespace: string;
}

export interface ServiceDiagnosticsTarget {
  serviceName: string;
  namespace: string;
  probePort?: string;
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
  podLabelFilter: string | null;
  podLabelFilterSource: string | null;
  setPodLabelFilter: (selector: string | null, source?: string | null) => void;

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

  // Networking resources
  services: ServiceSummary[];
  totalServicesCount: number;
  isServicesLoading: boolean;
  hasLoadedServicesOnce: boolean;

  endpoints: EndpointsSummary[];
  totalEndpointsCount: number;
  isEndpointsLoading: boolean;
  hasLoadedEndpointsOnce: boolean;

  ingresses: IngressSummary[];
  totalIngressesCount: number;
  isIngressesLoading: boolean;
  hasLoadedIngressesOnce: boolean;

  gatewayResources: GatewayResourceSummary[];
  totalGatewayResourcesCount: number;
  isGatewayResourcesLoading: boolean;
  hasLoadedGatewayResourcesOnce: boolean;
  gatewayApiAvailable: boolean;

  networkPolicies: NetworkPolicySummary[];
  totalNetworkPoliciesCount: number;
  isNetworkPoliciesLoading: boolean;
  hasLoadedNetworkPoliciesOnce: boolean;

  networkingCounts: NetworkingCountsResult | null;
  isNetworkingCountsLoading: boolean;
  hasLoadedNetworkingCountsOnce: boolean;

  // CNI and provider-neutral network observability
  networkObservability: NetworkObservabilityResult | null;
  isNetworkObservabilityLoading: boolean;
  hasLoadedNetworkObservabilityOnce: boolean;
  networkObservabilityError: string | null;

  // ConfigMaps
  configMaps: ConfigMapSummary[];
  totalConfigMapsCount: number;
  isConfigMapsLoading: boolean;
  hasLoadedConfigMapsOnce: boolean;

  // Secrets
  secrets: SecretSummary[];
  totalSecretsCount: number;
  isSecretsLoading: boolean;
  hasLoadedSecretsOnce: boolean;

  // Persistent Volumes
  persistentVolumes: PersistentVolumeSummary[];
  totalPersistentVolumesCount: number;
  isPersistentVolumesLoading: boolean;
  hasLoadedPersistentVolumesOnce: boolean;

  // Storage Classes
  storageClasses: StorageClassSummary[];
  totalStorageClassesCount: number;
  isStorageClassesLoading: boolean;
  hasLoadedStorageClassesOnce: boolean;

  // Service Accounts
  serviceAccounts: ServiceAccountSummary[];
  totalServiceAccountsCount: number;
  isServiceAccountsLoading: boolean;
  hasLoadedServiceAccountsOnce: boolean;

  // RBAC
  rbacResources: RBACResourceSummary[];
  totalRBACResourcesCount: number;
  isRBACResourcesLoading: boolean;
  hasLoadedRBACResourcesOnce: boolean;

  // Custom Resource Definitions
  crds: CRDSummary[];
  totalCRDsCount: number;
  isCRDsLoading: boolean;
  hasLoadedCRDsOnce: boolean;

  // Networking resource management
  resourceEditorTarget: ResourceEditorTarget | null;
  resourceEditorYaml: string;
  isResourceEditorLoading: boolean;
  isResourceEditorSaving: boolean;
  resourceEditorError: string | null;
  deleteResourceTarget: ResourceEditorTarget | null;

  // Service diagnostics
  diagnosticsTarget: ServiceDiagnosticsTarget | null;
  diagnosticsResult: DiagnoseServiceResult | null;
  isDiagnosticsLoading: boolean;
  diagnosticsError: string | null;

  // Port forwarding
  portForwards: PortForwardSession[];
  isPortForwardsLoading: boolean;
  portForwardsError: string | null;

  // Cilium and Hubble
  ciliumResources: ListCiliumResourcesResult | null;
  isCiliumLoading: boolean;
  hasLoadedCiliumOnce: boolean;
  hubbleFlows: HubbleFlowSummary[];
  isHubbleFlowsLoading: boolean;
  hubbleFlowsError: string | null;

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
  loadClusterOverview: (
    contextName?: string,
    namespace?: string,
  ) => Promise<ClusterOverviewResult | null>;
  loadPods: (namespace?: string, contextName?: string) => Promise<void>;
  loadDeployments: (namespace?: string, contextName?: string) => Promise<void>;
  loadReplicaSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadStatefulSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadDaemonSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadJobs: (namespace?: string, contextName?: string) => Promise<void>;
  loadCronJobs: (namespace?: string, contextName?: string) => Promise<void>;
  loadServices: (namespace?: string, contextName?: string) => Promise<void>;
  loadEndpoints: (namespace?: string, contextName?: string) => Promise<void>;
  loadIngresses: (namespace?: string, contextName?: string) => Promise<void>;
  loadGatewayResources: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadNetworkPolicies: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadNetworkingCounts: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  openResourceEditor: (target: ResourceEditorTarget) => Promise<void>;
  closeResourceEditor: () => void;
  setResourceEditorYaml: (yaml: string) => void;
  applyResourceEditor: () => Promise<void>;
  openDeleteResource: (target: ResourceEditorTarget) => void;
  closeDeleteResource: () => void;
  confirmDeleteResource: () => Promise<void>;
  openServiceDiagnostics: (target: ServiceDiagnosticsTarget) => void;
  closeServiceDiagnostics: () => void;
  runServiceDiagnostics: (target?: ServiceDiagnosticsTarget) => Promise<void>;
  loadPortForwards: () => Promise<void>;
  startPortForward: (
    request: PortForwardRequest,
  ) => Promise<PortForwardSession | null>;
  stopPortForward: (id: string) => Promise<void>;
  loadCiliumResources: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadNetworkObservability: (contextName?: string) => Promise<void>;
  loadConfigMaps: (namespace?: string, contextName?: string) => Promise<void>;
  loadSecrets: (namespace?: string, contextName?: string) => Promise<void>;
  loadPersistentVolumes: (contextName?: string) => Promise<void>;
  loadStorageClasses: (contextName?: string) => Promise<void>;
  getConfigMapYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getSecretYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getPersistentVolumeYaml: (
    name: string,
    contextName?: string,
  ) => Promise<string>;
  getStorageClassYaml: (name: string, contextName?: string) => Promise<string>;
  loadServiceAccounts: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  getServiceAccountYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  loadRBACResources: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  getRBACResourceYaml: (
    kind: string,
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  loadCRDs: (contextName?: string) => Promise<void>;
  getCRDYaml: (name: string, contextName?: string) => Promise<string>;
  loadHubbleFlows: (number?: number) => Promise<void>;
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
    force?: boolean,
  ) => Promise<{ succeeded: number; failed: number }>;
  bulkRestartPods: (
    pods: { name: string; namespace: string }[],
  ) => Promise<{ succeeded: number; failed: number }>;
  execPod: (params: ExecPodParams) => Promise<ExecPodResult>;
  getPodYaml: (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getDeploymentYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getReplicaSetYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getStatefulSetYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getDaemonSetYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getJobYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getCronJobYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getServiceYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getEndpointsYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getIngressYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getGatewayResourceYaml: (
    kind: string,
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getNetworkPolicyYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getPodEvents: (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => Promise<PodEventItem[]>;

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
  setConnectionStatus: (
    status: "connected" | "degraded" | "checking" | "offline",
  ) => void;
  setServerInfo: (version: string, latency: number) => void;
  openInspector: (resource: SelectedResource) => void;
  closeInspector: () => void;
  openKubeconfigModal: (tab?: "auto" | "browse" | "paste" | "manage") => void;
  closeKubeconfigModal: () => void;
  setSplashDismissed: (dismissed: boolean) => void;
  importKubeconfig: (
    params: ImportKubeconfigParams,
  ) => Promise<ImportKubeconfigResult>;
  detectSystemConfigs: () => Promise<DetectedContextInfo[]>;
  importDetectedContexts: (
    contexts: ImportDetectedContextItem[],
  ) => Promise<ImportKubeconfigResult>;
  deleteContext: (contextName: string) => Promise<void>;
  updateEndpoint: (
    contextName: string,
    newServer: string,
    insecure?: boolean,
  ) => Promise<void>;
  clearAllContexts: () => Promise<void>;
  initEventListener: () => Promise<() => void>;
}

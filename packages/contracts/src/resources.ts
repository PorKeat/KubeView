/**
 * Kubernetes Resource Envelopes, Reference Types, and Diff Models
 */

export interface ResourceRef {
  clusterId: string;
  apiVersion: string;
  resource: string;
  namespace?: string;
  name: string;
}

export interface ListResourcesRequest {
  clusterId: string;
  apiVersion: string;
  resource: string;
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continueToken?: string;
}

export interface ResourceList<T = GenericResource> {
  items: T[];
  continueToken?: string | null;
  resourceVersion?: string;
  totalCount?: number;
}

export interface KubeMetadata {
  name: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  ownerReferences?: Array<{
    apiVersion: string;
    kind: string;
    name: string;
    uid: string;
    controller?: boolean;
    blockOwnerDeletion?: boolean;
  }>;
}

export interface GenericResource {
  apiVersion: string;
  kind: string;
  metadata: KubeMetadata;
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
  data?: Record<string, unknown>;
  stringData?: Record<string, string>;
  [key: string]: unknown;
}

export interface DiffChange {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
  destructive?: boolean;
}

export interface ResourceDiffResult {
  diff: string;
  live: Record<string, unknown>;
  proposed: Record<string, unknown>;
  changes: DiffChange[];
  hasDestructiveChanges: boolean;
}

export interface PatchResourceRequest {
  ref: ResourceRef;
  patch: Record<string, unknown> | unknown[];
  patchType: "strategic" | "merge" | "json";
}

export interface ContainerEnvVar {
  name: string;
  value?: string;
  valueFrom?: string;
}

export interface ContainerPortInfo {
  name?: string;
  containerPort: number;
  protocol?: string;
}

export interface ContainerVolumeMountInfo {
  name: string;
  mountPath: string;
  readOnly?: boolean;
}

export interface ContainerResourceItem {
  cpu?: string;
  memory?: string;
}

export interface ContainerResourcesInfo {
  requests?: ContainerResourceItem;
  limits?: ContainerResourceItem;
}

export interface ContainerInfo {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
  stateReason?: string;
  exitCode?: number;
  lastTerminatedReason?: string;
  lastTerminatedMessage?: string;
  waitingReason?: string;
  waitingMessage?: string;
  env?: ContainerEnvVar[];
  ports?: ContainerPortInfo[];
  volumeMounts?: ContainerVolumeMountInfo[];
  resources?: ContainerResourcesInfo;
}

export interface PodConditionItem {
  type: string;
  status: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
}

export interface PodSummary {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  cpu: string;
  cpuPercent: number;
  memory: string;
  memoryPercent: number;
  nodeName: string;
  ip: string;
  containers: ContainerInfo[];
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  controlledBy?: string;
  qosClass?: string;
  conditions?: PodConditionItem[];
}

export interface ListPodsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListPodsResult {
  items: PodSummary[];
  totalCount: number;
}

export interface PodLogsParams {
  contextName?: string;
  namespace: string;
  podName: string;
  container?: string;
  tailLines?: number;
  previous?: boolean;
  timestamps?: boolean;
  sinceSeconds?: number;
}

export interface PodLogsResult {
  logs: string;
  container: string;
  containers: string[];
}

export interface DeletePodParams {
  contextName?: string;
  namespace: string;
  podName: string;
  gracePeriodSeconds?: number;
}

export interface RestartPodParams {
  contextName?: string;
  namespace: string;
  podName: string;
}

export interface ExecPodParams {
  contextName?: string;
  namespace: string;
  podName: string;
  container?: string;
  command: string[];
}

export interface ExecPodResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PodEventItem {
  type: string;
  reason: string;
  message: string;
  count: number;
  lastTimestamp: string;
  source: string;
  involvedObjectKind?: string;
  involvedObjectName?: string;
  involvedObjectNamespace?: string;
}

export interface PodEventsResult {
  events: PodEventItem[];
}

export interface PodYamlResult {
  yaml: string;
}

export interface DeploymentConditionItem {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastUpdateTime?: string;
  lastTransitionTime?: string;
}

export interface DeploymentSummary {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  desiredReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  unavailableReplicas: number;
  age: string;
  creationTimestamp: string;
  images: string[];
  selector?: Record<string, string>;
  strategy: string;
  revision?: string;
  paused: boolean;
  generation: number;
  observedGeneration: number;
  conditions?: DeploymentConditionItem[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListDeploymentsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListDeploymentsResult {
  items: DeploymentSummary[];
  totalCount: number;
}

export interface DeploymentActionParams {
  contextName?: string;
  namespace: string;
  name: string;
  replicas?: number;
}

export interface ReplicaSetActionParams {
  contextName?: string;
  namespace: string;
  name: string;
  replicas?: number;
}

export interface ReplicaSetConditionItem {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface ReplicaSetSummary {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  desiredReplicas: number;
  currentReplicas: number;
  readyReplicas: number;
  availableReplicas: number;
  age: string;
  creationTimestamp: string;
  images: string[];
  selector?: Record<string, string>;
  ownerDeployment?: string;
  revision?: string;
  conditions?: ReplicaSetConditionItem[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListReplicaSetsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListReplicaSetsResult {
  items: ReplicaSetSummary[];
  totalCount: number;
}

export interface NodeSummary {
  name: string;
  status: string;
  roles: string[];
  version: string;
  architecture: string;
  internalIP: string;
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
  workloads?: WorkloadsSummary;
}

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
  context?: string;
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

export interface StatefulSetConditionItem {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface StatefulSetActionParams {
  contextName?: string;
  namespace: string;
  name: string;
  replicas?: number;
}

export interface StatefulSetSummary {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  desiredReplicas: number;
  currentReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  age: string;
  creationTimestamp: string;
  images: string[];
  selector?: Record<string, string>;
  serviceName?: string;
  podManagementPolicy: string;
  updateStrategy: string;
  partition: number;
  maxUnavailable?: string;
  currentRevision?: string;
  updateRevision?: string;
  revisionHistoryLimit: number;
  minReadySeconds: number;
  volumeClaimTemplates: string[];
  persistentVolumeClaimRetentionWhenDeleted: string;
  persistentVolumeClaimRetentionWhenScaled: string;
  ordinalsStart: number;
  collisionCount: number;
  generation: number;
  observedGeneration: number;
  conditions?: StatefulSetConditionItem[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListStatefulSetsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListStatefulSetsResult {
  items: StatefulSetSummary[];
  totalCount: number;
}

export interface DaemonSetConditionItem {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface DaemonSetSummary {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  desiredNumberScheduled: number;
  currentNumberScheduled: number;
  numberReady: number;
  updatedNumberScheduled: number;
  numberAvailable: number;
  numberUnavailable: number;
  numberMisscheduled: number;
  age: string;
  creationTimestamp: string;
  images: string[];
  selector?: Record<string, string>;
  nodeSelector?: Record<string, string>;
  updateStrategy: string;
  maxUnavailable: string;
  maxSurge: string;
  minReadySeconds: number;
  revisionHistoryLimit: number;
  collisionCount: number;
  generation: number;
  observedGeneration: number;
  conditions?: DaemonSetConditionItem[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListDaemonSetsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListDaemonSetsResult {
  items: DaemonSetSummary[];
  totalCount: number;
}

export interface DaemonSetActionParams {
  contextName?: string;
  namespace: string;
  name: string;
}

export interface JobConditionItem {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string;
  lastTransitionTime?: string;
}

export interface JobSummary {
  name: string;
  namespace: string;
  status: string;
  completions: string;
  desiredCompletions: number;
  active: number;
  succeeded: number;
  failed: number;
  duration: string;
  age: string;
  creationTimestamp: string;
  startTime?: string;
  completionTime?: string;
  images: string[];
  selector?: Record<string, string>;
  ownerCronJob?: string;
  parallelism: number;
  backoffLimit: number;
  activeDeadlineSeconds: number;
  ttlSecondsAfterFinished: number;
  suspend: boolean;
  completionMode: string;
  conditions?: JobConditionItem[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListJobsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListJobsResult {
  items: JobSummary[];
  totalCount: number;
}

export interface JobActionParams {
  contextName?: string;
  namespace: string;
  name: string;
}

export interface CronJobSummary {
  name: string;
  namespace: string;
  status: string;
  schedule: string;
  timeZone?: string;
  suspend: boolean;
  concurrencyPolicy: string;
  startingDeadlineSeconds: number;
  successfulJobHistoryLimit: number;
  failedJobHistoryLimit: number;
  activeJobs: number;
  lastScheduleTime?: string;
  lastSuccessfulTime?: string;
  age: string;
  creationTimestamp: string;
  images: string[];
  selector?: Record<string, string>;
  parallelism?: number;
  completions?: number;
  backoffLimit?: number;
  activeDeadlineSeconds?: number;
  ttlSecondsAfterFinished?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListCronJobsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListCronJobsResult {
  items: CronJobSummary[];
  totalCount: number;
}

export interface CronJobActionParams {
  contextName?: string;
  namespace: string;
  name: string;
}

export interface CronJobTriggerResult {
  jobName: string;
}

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

// ---------------------------------------------------------------------------
// Networking Resources (Phase 9)
// ---------------------------------------------------------------------------

export interface ServicePortSummary {
  name?: string;
  protocol: string;
  port: number;
  targetPort?: string;
  nodePort?: number;
}

export interface ServiceSummary {
  name: string;
  namespace: string;
  type: string;
  status: string;
  readyEndpoints: number;
  totalEndpoints: number;
  clusterIP?: string;
  clusterIPs?: string[];
  externalName?: string;
  externalIPs?: string[];
  loadBalancerIPs?: string[];
  ports: ServicePortSummary[];
  selector?: Record<string, string>;
  sessionAffinity?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListServicesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListServicesResult {
  items: ServiceSummary[];
  totalCount: number;
}

export interface EndpointAddressSummary {
  ip: string;
  hostname?: string;
  nodeName?: string;
  targetKind?: string;
  targetName?: string;
  ready: boolean;
}

export interface EndpointPortSummary {
  name?: string;
  protocol: string;
  port: number;
}

export interface EndpointsSummary {
  name: string;
  namespace: string;
  status: string;
  addresses: EndpointAddressSummary[];
  ports: EndpointPortSummary[];
  readyCount: number;
  notReadyCount: number;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListEndpointsParams {
  contextName?: string;
  namespace?: string;
}

export interface ListEndpointsResult {
  items: EndpointsSummary[];
  totalCount: number;
}

export interface IngressPathSummary {
  host?: string;
  path: string;
  pathType: string;
  serviceName?: string;
  servicePort?: string;
}

export interface IngressTLSSummary {
  hosts: string[];
  secretName?: string;
  status: string;
  subject?: string;
  issuer?: string;
  notBefore?: string;
  notAfter?: string;
  dnsNames?: string[];
  message?: string;
}

export interface IngressSummary {
  name: string;
  namespace: string;
  className?: string;
  status: string;
  hosts: string[];
  addresses: string[];
  paths: IngressPathSummary[];
  tls: IngressTLSSummary[];
  defaultBackend?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListIngressesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListIngressesResult {
  items: IngressSummary[];
  totalCount: number;
}

export interface GatewayResourceSummary {
  kind: string;
  name: string;
  namespace?: string;
  status: string;
  class?: string;
  hosts: string[];
  addresses: string[];
  ruleCount: number;
  listenerCount: number;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListGatewayResourcesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListGatewayResourcesResult {
  items: GatewayResourceSummary[];
  totalCount: number;
  available: boolean;
}

export interface NetworkPolicyRuleDetail {
  direction: string;
  peers: string[];
  ports: string[];
  description: string;
}

export interface NetworkPolicySummary {
  name: string;
  namespace: string;
  status: string;
  podSelector: string;
  policyTypes: string[];
  ingressRules: number;
  egressRules: number;
  ingress: string[];
  egress: string[];
  ingressDetails: NetworkPolicyRuleDetail[];
  egressDetails: NetworkPolicyRuleDetail[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListNetworkPoliciesParams {
  contextName?: string;
  namespace?: string;
}

export interface ListNetworkPoliciesResult {
  items: NetworkPolicySummary[];
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Phase 9 Completion: Management, Diagnostics, Port Forwarding, Cilium
// ---------------------------------------------------------------------------

export interface ApplyIngressParams {
  contextName?: string;
  namespace: string;
  yaml: string;
}

export interface DeleteIngressParams {
  contextName?: string;
  namespace: string;
  name: string;
}

export interface ApplyGatewayResourceParams {
  contextName?: string;
  namespace: string;
  yaml: string;
}

export interface DeleteGatewayResourceParams {
  contextName?: string;
  namespace: string;
  kind: string;
  name: string;
}

export interface ServiceDiagnosticCheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail" | "skipped" | string;
  message: string;
  details?: string[];
}

export interface DiagnoseServiceParams {
  contextName?: string;
  namespace: string;
  serviceName: string;
  probePort?: string;
  probePath?: string;
  probeScheme?: "http" | "https" | string;
}

export interface DiagnoseServiceResult {
  service: ServiceSummary;
  dnsName: string;
  checks: ServiceDiagnosticCheck[];
  summary: string;
  generatedAt: string;
}

export interface PortForwardRequest {
  contextName?: string;
  namespace: string;
  targetKind: "service" | "pod" | string;
  targetName: string;
  remotePort: number;
  localPort?: number;
  address?: string;
}

export interface PortForwardSession {
  id: string;
  contextName: string;
  namespace: string;
  targetKind: string;
  targetName: string;
  targetPod: string;
  remotePort: number;
  localPort: number;
  address: string;
  status: string;
  startedAt: string;
  activeConnections: number;
  totalConnections: number;
  bytesSent: number;
  bytesReceived: number;
  lastError?: string;
}

export interface ListPortForwardsResult {
  items: PortForwardSession[];
}

export interface CiliumStatus {
  installed: boolean;
  version?: string;
  networkPolicyCount: number;
  endpointCount: number;
  hubbleAvailable: boolean;
  hubbleRelayService?: string;
  hubbleRelayPort?: number;
  message?: string;
}

export interface CiliumNetworkPolicySummary {
  name: string;
  namespace: string;
  endpointSelector: string;
  ingressRules: number;
  egressRules: number;
  status: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface CiliumEndpointSummary {
  name: string;
  namespace: string;
  podName: string;
  identityId: number;
  state: string;
  ipv4?: string;
  ipv6?: string;
  ingressPolicy?: string;
  egressPolicy?: string;
  age: string;
  creationTimestamp: string;
}

export interface ListCiliumResourcesResult {
  policies: CiliumNetworkPolicySummary[];
  endpoints: CiliumEndpointSummary[];
  status: CiliumStatus;
}

export interface ListHubbleFlowsParams {
  contextName?: string;
  namespace?: string;
  number?: number;
}

export interface HubbleFlowSummary {
  time: string;
  verdict: string;
  type: string;
  sourceNamespace?: string;
  sourcePod?: string;
  sourceIp?: string;
  destinationNamespace?: string;
  destinationPod?: string;
  destinationIp?: string;
  protocol?: string;
  sourcePort?: string;
  destinationPort?: string;
  nodeName?: string;
  dropReason?: string;
  summary: string;
  rawJson?: string;
}

export interface ListHubbleFlowsResult {
  flows: HubbleFlowSummary[];
}

export interface NetworkingCountsResult {
  services: number;
  endpoints: number;
  ingresses: number;
  gatewayResources: number;
  networkPolicies: number;
  ciliumPolicies: number;
  ciliumEndpoints: number;
  activePortForwards: number;
  configMaps: number;
  secrets: number;
  persistentVolumes: number;
  storageClasses: number;
  serviceAccounts: number;
  roles: number;
  clusterRoles: number;
  roleBindings: number;
  clusterRoleBindings: number;
  crds: number;
}

export interface CNIInfo {
  provider: string;
  displayName: string;
  version?: string;
  detected: boolean;
  detectionSource?: string;
  capabilities: string[];
}

export interface NetworkObservabilityResult {
  cni: CNIInfo;
  nodeCount: number;
  readyNodeCount: number;
  podCount: number;
  runningPodCount: number;
  serviceCount: number;
  networkPolicyCount: number;
  endpointSliceCount: number;
  podCidrs: string[];
  ipFamilies: string[];
}

export interface ConfigMapSummary {
  name: string;
  namespace: string;
  keys: string[];
  dataKeyCount: number;
  binaryKeyCount: number;
  sizeBytes: number;
  immutable: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListConfigMapsResult {
  items: ConfigMapSummary[];
  totalCount: number;
}

export interface SecretSummary {
  name: string;
  namespace: string;
  type: string;
  keys: string[];
  dataKeyCount: number;
  sizeBytes: number;
  immutable: boolean;
  metadataOnly?: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListSecretsResult {
  items: SecretSummary[];
  totalCount: number;
}

export interface PersistentVolumeSummary {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: string;
  status: string;
  claim?: string;
  storageClass?: string;
  volumeMode?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListPersistentVolumesResult {
  items: PersistentVolumeSummary[];
  totalCount: number;
}

export interface StorageClassSummary {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
  default: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListStorageClassesResult {
  items: StorageClassSummary[];
  totalCount: number;
}

export interface ConfigMapEditData {
  name: string;
  namespace: string;
  resourceVersion: string;
  immutable: boolean;
  data: Record<string, string>;
  binaryData?: Record<string, string>;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface SecretEditEntry {
  key: string;
  value: string;
  binary: boolean;
}

export interface SecretEditData {
  name: string;
  namespace: string;
  resourceVersion: string;
  immutable: boolean;
  type: string;
  entries: SecretEditEntry[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ConfigMapUpdateParams {
  contextName?: string;
  namespace: string;
  name: string;
  resourceVersion: string;
  data: Record<string, string>;
  binaryData?: Record<string, string>;
}

export interface SecretUpdateParams {
  contextName?: string;
  namespace: string;
  name: string;
  resourceVersion: string;
  entries: SecretEditEntry[];
}

export interface ConfigStorageUpdateResult {
  resourceVersion: string;
}

export interface ServiceAccountSummary {
  name: string;
  namespace: string;
  secretNames: string[];
  imagePullSecretNames: string[];
  automount?: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListServiceAccountsResult {
  items: ServiceAccountSummary[];
  totalCount: number;
}

export interface RBACRuleSummary {
  verbs: string[];
  apiGroups: string[];
  resources: string[];
  resourceNames: string[];
  nonResourceURLs: string[];
}

export interface RBACSubjectSummary {
  kind: string;
  name: string;
  namespace?: string;
}

export interface RBACResourceSummary {
  kind: string;
  name: string;
  namespace?: string;
  roleRef?: string;
  rules: RBACRuleSummary[];
  subjects: RBACSubjectSummary[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListRBACResourcesResult {
  items: RBACResourceSummary[];
  totalCount: number;
}

export interface CRDVersionSummary {
  name: string;
  served: boolean;
  storage: boolean;
}

export interface CRDSummary {
  name: string;
  group: string;
  kind: string;
  plural: string;
  scope: string;
  versions: CRDVersionSummary[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListCRDsResult {
  items: CRDSummary[];
  totalCount: number;
}

export interface CustomResourceSummary {
  name: string;
  namespace?: string;
  status?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListCustomResourcesResult {
  items: CustomResourceSummary[];
  totalCount: number;
}

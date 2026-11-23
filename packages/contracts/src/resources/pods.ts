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
  /** Numeric request/limit values used for usage percentages. */
  cpuRequestMillicores?: number;
  cpuLimitMillicores?: number;
  memoryRequestBytes?: number;
  memoryLimitBytes?: number;
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
  /** CPU request total, formatted for display (for example "100m"). */
  cpu: string;
  /** CPU request relative to the limit. Kept for backward compatibility. */
  cpuPercent: number;
  /** Memory request total, formatted for display (for example "256.0Mi"). */
  memory: string;
  /** Memory request relative to the limit. Kept for backward compatibility. */
  memoryPercent: number;
  /** Numeric request/limit values used for live usage percentages. */
  cpuRequestMillicores?: number;
  cpuLimitMillicores?: number;
  memoryRequestBytes?: number;
  memoryLimitBytes?: number;
  nodeName: string;
  ip: string;
  containers: ContainerInfo[];
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  body?: string;
  controlledBy?: string;
  qosClass?: string;
  conditions?: PodConditionItem[];
  /** List payloads omit detail fields; call pods.detail to hydrate. */
  compact?: boolean;
}

export interface GetPodParams {
  contextName?: string;
  namespace: string;
  podName: string;
}

export interface PodUsageParams {
  contextName?: string;
  namespace?: string;
}

export interface PodContainerUsage {
  name: string;
  cpuUsageMillicores: number;
  memoryUsageBytes: number;
}

export interface PodUsage {
  namespace: string;
  name: string;
  cpuUsageMillicores: number;
  memoryUsageBytes: number;
  containers: PodContainerUsage[];
}

export interface PodUsageResult {
  contextName: string;
  namespace: string;
  metricsAvailable: boolean;
  reason?: string;
  fetchedAt: string;
  items: PodUsage[];
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

export interface MovePodParams {
  contextName?: string;
  namespace: string;
  podName: string;
  /** Move the pod copy into this namespace. Only standalone pods are eligible. */
  targetNamespace?: string;
  /** Pin the recreated pod to this node. Only standalone pods are eligible. */
  targetNode?: string;
}

export type PodMoveMode = "reschedule" | "node" | "namespace";

export interface MovePodResult {
  moved: boolean;
  podName: string;
  namespace: string;
  nodeName?: string;
  mode: PodMoveMode;
  ownerKind?: string;
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

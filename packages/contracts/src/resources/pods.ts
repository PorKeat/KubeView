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

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

import type { JobSummary } from "./workloads.js";

/** One ReplicaSet-backed revision in a Deployment rollout history. */
export interface DeploymentRolloutRevision {
  revision: number;
  replicaSetName: string;
  images: string[];
  desired: number;
  ready: number;
  createdAt: string;
  changeCause?: string;
  current: boolean;
}

export interface DeploymentRolloutHistoryResult {
  items: DeploymentRolloutRevision[];
  totalCount: number;
}

export interface DeploymentRollbackParams {
  contextName?: string;
  namespace: string;
  name: string;
  revision: number;
}

export interface StatefulSetPartitionParams {
  contextName?: string;
  namespace: string;
  name: string;
  partition: number;
}

export interface JobCloneParams {
  contextName?: string;
  namespace: string;
  name: string;
  newName?: string;
}

export type JobCloneResult = JobSummary;

export interface ExpandPersistentVolumeClaimParams {
  contextName?: string;
  namespace: string;
  name: string;
  storage: string;
}

export interface ExpandPersistentVolumeClaimResult {
  name: string;
  storage: string;
}

export interface NodeTaint {
  key: string;
  value?: string;
  effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute";
  timeAdded?: string;
}

export interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  version: string;
  internalIP: string;
  unschedulable: boolean;
  taints: NodeTaint[];
  labels: Record<string, string>;
  age: string;
  createdAt: string;
}

export interface ListNodesResult {
  items: NodeInfo[];
  totalCount: number;
}

export interface NodeActionParams {
  contextName?: string;
  nodeName: string;
}

export interface UpdateNodeTaintsParams extends NodeActionParams {
  taints: Array<Pick<NodeTaint, "key" | "value" | "effect">>;
}

export interface UpdateNodeLabelsParams extends NodeActionParams {
  labels: Record<string, string>;
  removeLabels?: string[];
}

export interface DrainNodeParams extends NodeActionParams {
  force?: boolean;
  deleteEmptyDirData?: boolean;
  ignoreDaemonSets?: boolean;
  timeoutSeconds?: number;
}

export interface DrainNodeResult {
  nodeName: string;
  evicted: string[];
  skipped: string[];
  failed: string[];
}

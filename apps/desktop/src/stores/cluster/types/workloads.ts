import type {
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
  DaemonSetSummary,
  DeploymentActionParams,
  ReplicaSetActionParams,
  StatefulSetActionParams,
  DaemonSetActionParams,
} from "@kubeview/contracts";

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

export interface WorkloadsSlice {
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

  loadDeployments: (namespace?: string, contextName?: string) => Promise<void>;
  loadReplicaSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadStatefulSets: (namespace?: string, contextName?: string) => Promise<void>;
  loadDaemonSets: (namespace?: string, contextName?: string) => Promise<void>;
}

export interface WorkloadActionsSlice {
  workloadAction: WorkloadActionRequest | null;
  openWorkloadAction: (action: WorkloadActionRequest) => void;
  closeWorkloadAction: () => void;

  bulkWorkloadAction: BulkWorkloadActionRequest | null;
  openBulkWorkloadAction: (action: BulkWorkloadActionRequest) => void;
  closeBulkWorkloadAction: () => void;
  executeBulkWorkloadAction: (
    action: BulkWorkloadActionRequest,
  ) => Promise<BulkWorkloadActionResult>;

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
}

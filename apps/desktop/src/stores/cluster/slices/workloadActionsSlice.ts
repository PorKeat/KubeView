import type { StateCreator } from "zustand";
import type {
  DaemonSetActionParams,
  DeploymentActionParams,
  ReplicaSetActionParams,
  StatefulSetActionParams,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import type { ClusterState } from "../types/cluster";
import type { WorkloadActionsSlice } from "../types/workloads";

export const createWorkloadActionsSlice: StateCreator<
  ClusterState,
  [],
  [],
  WorkloadActionsSlice
> = (set, get) => ({
  workloadAction: null,
  bulkWorkloadAction: null,
  openWorkloadAction: (action) => set({ workloadAction: action }),
  closeWorkloadAction: () => set({ workloadAction: null }),
  openBulkWorkloadAction: (action) => set({ bulkWorkloadAction: action }),
  closeBulkWorkloadAction: () => set({ bulkWorkloadAction: null }),
  executeBulkWorkloadAction: async (action) => {
    const targetCtx = get().currentContext;
    let succeeded = 0;
    let failed = 0;

    for (const target of action.targets) {
      const params = {
        name: target.name,
        namespace: target.namespace,
        contextName: targetCtx,
      };
      try {
        if (action.kind === "ReplicaSet") {
          if (action.action !== "delete") {
            throw new Error("Bulk restart is not supported for ReplicaSets");
          }
          await invokeRpc("replicasets.delete", params);
        } else if (action.kind === "StatefulSet") {
          await invokeRpc(
            action.action === "restart"
              ? "statefulsets.restart"
              : "statefulsets.delete",
            params,
          );
        } else if (action.kind === "DaemonSet") {
          await invokeRpc(
            action.action === "restart"
              ? "daemonsets.restart"
              : "daemonsets.delete",
            params,
          );
        } else if (action.kind === "Job") {
          await invokeRpc("jobs.delete", params);
        } else {
          throw new Error("Unsupported bulk action kind");
        }
        succeeded += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `Bulk ${action.action} failed for ${action.kind} ${target.namespace}/${target.name}:`,
          error,
        );
      }
    }

    if (succeeded > 0) {
      if (action.kind === "ReplicaSet") {
        await get().loadReplicaSets();
      } else if (action.kind === "StatefulSet") {
        await get().loadStatefulSets();
      } else if (action.kind === "DaemonSet") {
        await get().loadDaemonSets();
      } else {
        await get().loadJobs();
      }
      await get().loadPods();
      await get().loadClusterOverview();
    }

    return { succeeded, failed };
  },
  restartDeployment: async (params: DeploymentActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("deployments.restart", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDeployments();
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  scaleDeployment: async (params: DeploymentActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("deployments.scale", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDeployments();
    await get().loadClusterOverview();
  },

  deleteDeployment: async (params: DeploymentActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("deployments.delete", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDeployments();
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  scaleReplicaSet: async (params: ReplicaSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("replicasets.scale", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  deleteReplicaSet: async (params: ReplicaSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("replicasets.delete", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  restartStatefulSet: async (params: StatefulSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("statefulsets.restart", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadStatefulSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  scaleStatefulSet: async (params: StatefulSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("statefulsets.scale", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadStatefulSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  deleteStatefulSet: async (params: StatefulSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("statefulsets.delete", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadStatefulSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  restartDaemonSet: async (params: DaemonSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("daemonsets.restart", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDaemonSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  deleteDaemonSet: async (params: DaemonSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("daemonsets.delete", { ...params, contextName: targetCtx });
    await get().loadDaemonSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },
});

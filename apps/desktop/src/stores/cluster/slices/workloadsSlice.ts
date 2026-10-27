import type { StateCreator } from "zustand";
import type {
  ListDaemonSetsResult,
  ListDeploymentsResult,
  ListReplicaSetsResult,
  ListStatefulSetsResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { inFlightResourcePromises, resolveQueryNamespace } from "../shared";
import type { ClusterState } from "../types/cluster";
import type { WorkloadsSlice } from "../types/workloads";

export const createWorkloadsSlice: StateCreator<
  ClusterState,
  [],
  [],
  WorkloadsSlice
> = (set, get) => ({
  deployments: [],
  totalDeploymentsCount: 0,
  isDeploymentsLoading: true,
  hasLoadedDeploymentsOnce: false,
  replicaSets: [],
  totalReplicaSetsCount: 0,
  isReplicaSetsLoading: true,
  hasLoadedReplicaSetsOnce: false,
  statefulSets: [],
  totalStatefulSetsCount: 0,
  isStatefulSetsLoading: true,
  hasLoadedStatefulSetsOnce: false,
  daemonSets: [],
  totalDaemonSetsCount: 0,
  isDaemonSetsLoading: true,
  hasLoadedDaemonSetsOnce: false,
  loadDeployments: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        deployments: [],
        totalDeploymentsCount: 0,
        isDeploymentsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `deployments::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().deployments.length === 0 && get().currentContext === targetCtx) {
      set({ isDeploymentsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListDeploymentsResult>("deployments.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              deployments: res.items,
              totalDeploymentsCount: res.totalCount ?? res.items.length,
              isDeploymentsLoading: false,
              hasLoadedDeploymentsOnce: true,
            });
          } else {
            set({
              deployments: [],
              totalDeploymentsCount: 0,
              isDeploymentsLoading: false,
              hasLoadedDeploymentsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load deployments:", err);
        if (get().currentContext === targetCtx) {
          set({ isDeploymentsLoading: false, hasLoadedDeploymentsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadReplicaSets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        replicaSets: [],
        totalReplicaSetsCount: 0,
        isReplicaSetsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `replicasets::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().replicaSets.length === 0 && get().currentContext === targetCtx) {
      set({ isReplicaSetsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListReplicaSetsResult>("replicasets.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              replicaSets: res.items,
              totalReplicaSetsCount: res.totalCount ?? res.items.length,
              isReplicaSetsLoading: false,
              hasLoadedReplicaSetsOnce: true,
            });
          } else {
            set({
              replicaSets: [],
              totalReplicaSetsCount: 0,
              isReplicaSetsLoading: false,
              hasLoadedReplicaSetsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load replica sets:", err);
        if (get().currentContext === targetCtx) {
          set({ isReplicaSetsLoading: false, hasLoadedReplicaSetsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadStatefulSets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        statefulSets: [],
        totalStatefulSetsCount: 0,
        isStatefulSetsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `statefulsets::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().statefulSets.length === 0 && get().currentContext === targetCtx) {
      set({ isStatefulSetsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListStatefulSetsResult>(
          "statefulsets.list",
          {
            contextName: targetCtx,
            namespace: queryNs,
          },
        );

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              statefulSets: res.items,
              totalStatefulSetsCount: res.totalCount ?? res.items.length,
              isStatefulSetsLoading: false,
              hasLoadedStatefulSetsOnce: true,
            });
          } else {
            set({
              statefulSets: [],
              totalStatefulSetsCount: 0,
              isStatefulSetsLoading: false,
              hasLoadedStatefulSetsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load stateful sets:", err);
        if (get().currentContext === targetCtx) {
          set({
            isStatefulSetsLoading: false,
            hasLoadedStatefulSetsOnce: true,
          });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadDaemonSets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        daemonSets: [],
        totalDaemonSetsCount: 0,
        isDaemonSetsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `daemonsets::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().daemonSets.length === 0 && get().currentContext === targetCtx) {
      set({ isDaemonSetsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListDaemonSetsResult>("daemonsets.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              daemonSets: res.items,
              totalDaemonSetsCount: res.totalCount ?? res.items.length,
              isDaemonSetsLoading: false,
              hasLoadedDaemonSetsOnce: true,
            });
          } else {
            set({
              daemonSets: [],
              totalDaemonSetsCount: 0,
              isDaemonSetsLoading: false,
              hasLoadedDaemonSetsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load daemonsets:", err);
        if (get().currentContext === targetCtx) {
          set({ isDaemonSetsLoading: false, hasLoadedDaemonSetsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },
});

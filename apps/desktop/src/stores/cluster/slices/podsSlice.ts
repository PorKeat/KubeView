import type { StateCreator } from "zustand";
import type {
  DeletePodParams,
  ExecPodParams,
  ExecPodResult,
  ListPodsResult,
  MovePodParams,
  MovePodResult,
  PodLogsParams,
  PodLogsResult,
  PodUsage,
  PodUsageResult,
  PodSummary,
  RestartPodParams,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import {
  getRecentResponse,
  inFlightResourcePromises,
  resolveQueryNamespace,
  setRecentResponse,
} from "../shared";
import type { ClusterState } from "../types/cluster";
import type { PodsSlice } from "../types/pods";

export const createPodsSlice: StateCreator<ClusterState, [], [], PodsSlice> = (
  set,
  get,
) => ({
  pods: [],
  totalPodsCount: 0,
  isPodsLoading: true,
  hasLoadedPodsOnce: false,
  podUsage: {},
  podUsageAvailable: false,
  podUsageReason: null,
  isPodUsageLoading: false,
  hasLoadedPodUsageOnce: false,
  podNodeFilter: null,
  podLabelFilter: null,
  podLabelFilterSource: null,
  setPodNodeFilter: (nodeName) => {
    set({ podNodeFilter: nodeName });
    if (get().pods.length === 0 && get().currentContext) {
      get().loadPods();
    }
  },

  setPodLabelFilter: (selector, source = null) => {
    set({ podLabelFilter: selector, podLabelFilterSource: source });
  },
  loadPods: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ pods: [], totalPodsCount: 0, isPodsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `pods::${targetCtx}::${queryNs}`;

    // Deduplicate in-flight requests for the same context & namespace
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    // Avoid a duplicate list fetch when switching tabs quickly. Watch events
    // continue to update the store; this only suppresses an immediate refetch.
    const cacheKey = `pods::${fetchKey}`;
    const cached = getRecentResponse<ListPodsResult>(cacheKey, 1_500);
    if (cached && get().currentContext === targetCtx) {
      if (get().currentContext === targetCtx) {
        set({
          pods: cached.items ?? [],
          totalPodsCount: cached.totalCount ?? cached.items?.length ?? 0,
          isPodsLoading: false,
          hasLoadedPodsOnce: true,
        });
      }
      return;
    }

    const currentPods = get().pods;
    // Stale-While-Revalidate: Only display skeleton loader on first initial cold load for active context
    if (currentPods.length === 0 && get().currentContext === targetCtx) {
      set({ isPodsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListPodsResult>("pods.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        // Context race condition guard: Only commit pods if user is still on this context
        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            setRecentResponse(cacheKey, res);
            set({
              pods: res.items,
              totalPodsCount: res.totalCount ?? res.items.length,
              isPodsLoading: false,
              hasLoadedPodsOnce: true,
            });
          } else {
            set({
              pods: [],
              totalPodsCount: 0,
              isPodsLoading: false,
              hasLoadedPodsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load pods:", err);
        if (get().currentContext === targetCtx) {
          set({ isPodsLoading: false, hasLoadedPodsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadPodDetail: async (namespace, podName, contextName) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) return null;

    try {
      const res = await invokeRpc<PodSummary>("pods.detail", {
        contextName: targetCtx,
        namespace,
        podName,
      });
      if (get().currentContext !== targetCtx) return res;

      const selected = get().selectedResource;
      if (
        selected?.kind === "Pod" &&
        selected.name === podName &&
        selected.namespace === namespace
      ) {
        set({
          selectedResource: {
            ...selected,
            status: res.status,
            data: res as unknown as Record<string, unknown>,
          },
        });
      }
      return res;
    } catch (err) {
      console.warn("[ClusterStore] Failed to load pod detail:", err);
      return null;
    }
  },

  loadPodUsage: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        podUsage: {},
        podUsageAvailable: false,
        podUsageReason: null,
        isPodUsageLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `pod-usage::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().currentContext === targetCtx) {
      set({ isPodUsageLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<PodUsageResult>("pods.metrics", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext !== targetCtx) return;

        const usage: Record<string, PodUsage> =
          queryNs === "" ? {} : { ...get().podUsage };
        if (queryNs !== "") {
          for (const key of Object.keys(usage)) {
            if (usage[key].namespace === queryNs) delete usage[key];
          }
        }
        for (const item of res?.items ?? []) {
          usage[`${item.namespace}/${item.name}`] = item;
        }

        set({
          podUsage: usage,
          podUsageAvailable: res?.metricsAvailable ?? false,
          podUsageReason: res?.reason ?? null,
          isPodUsageLoading: false,
          hasLoadedPodUsageOnce: true,
        });
      } catch (err) {
        console.warn("[ClusterStore] Failed to load pod usage:", err);
        if (get().currentContext === targetCtx) {
          const usage: Record<string, PodUsage> =
            queryNs === "" ? {} : { ...get().podUsage };
          if (queryNs !== "") {
            for (const key of Object.keys(usage)) {
              if (usage[key].namespace === queryNs) delete usage[key];
            }
          }
          set({
            podUsage: usage,
            podUsageAvailable: false,
            podUsageReason:
              err instanceof Error
                ? err.message
                : "Unable to read pod metrics.",
            isPodUsageLoading: false,
            hasLoadedPodUsageOnce: true,
          });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  getPodLogs: async (params: PodLogsParams) => {
    const targetCtx = params.contextName || get().currentContext;
    return await invokeRpc<PodLogsResult>("pods.logs", {
      ...params,
      contextName: targetCtx,
    });
  },

  deletePod: async (params: DeletePodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("pods.delete", {
      ...params,
      contextName: targetCtx,
    });
    // Refresh live pods list and overview telemetry
    await get().loadPods();
    await get().loadClusterOverview();
  },

  restartPod: async (params: RestartPodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("pods.restart", {
      ...params,
      contextName: targetCtx,
    });
    // Refresh live pods list and overview telemetry
    await get().loadPods();
    await get().loadClusterOverview();
  },
  movePod: async (params: MovePodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    const result = await invokeRpc<MovePodResult>("pods.move", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadPods();
    await get().loadClusterOverview();
    return result;
  },
  bulkDeletePods: async (
    pods: { name: string; namespace: string }[],
    force?: boolean,
  ) => {
    const targetCtx = get().currentContext;
    let succeeded = 0;
    let failed = 0;
    for (const p of pods) {
      try {
        await invokeRpc("pods.delete", {
          contextName: targetCtx,
          namespace: p.namespace,
          podName: p.name,
          gracePeriodSeconds: force ? 0 : undefined,
        });
        succeeded++;
      } catch (err) {
        console.error(`Failed to delete pod ${p.namespace}/${p.name}:`, err);
        failed++;
      }
    }
    await get().loadPods();
    await get().loadClusterOverview();
    return { succeeded, failed };
  },

  bulkRestartPods: async (pods: { name: string; namespace: string }[]) => {
    const targetCtx = get().currentContext;
    let succeeded = 0;
    let failed = 0;
    for (const p of pods) {
      try {
        await invokeRpc("pods.restart", {
          contextName: targetCtx,
          namespace: p.namespace,
          podName: p.name,
        });
        succeeded++;
      } catch (err) {
        console.error(`Failed to restart pod ${p.namespace}/${p.name}:`, err);
        failed++;
      }
    }
    await get().loadPods();
    await get().loadClusterOverview();
    return { succeeded, failed };
  },

  execPod: async (params: ExecPodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    return await invokeRpc<ExecPodResult>("pods.exec", {
      ...params,
      contextName: targetCtx,
    });
  },
});

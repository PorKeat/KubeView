import type { StateCreator } from "zustand";
import type { ClusterOverviewResult } from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { inFlightOverviewPromises } from "../shared";
import type { ClusterState } from "../types/cluster";
import type { OverviewSlice } from "../types/overview";

export const createOverviewSlice: StateCreator<
  ClusterState,
  [],
  [],
  OverviewSlice
> = (set, get) => ({
  clusterOverview: null,
  isOverviewLoading: false,
  loadClusterOverview: async (contextName?: string, namespace?: string) => {
    const target = contextName || get().currentContext;
    if (!target) {
      set({ clusterOverview: null, isOverviewLoading: false });
      return null;
    }

    const targetNs =
      namespace !== undefined ? namespace : get().currentNamespace;
    const queryNs = targetNs === "all" ? "" : targetNs;
    const fetchKey = `${target}::${queryNs}`;

    // Deduplicate concurrent in-flight requests for same context & namespace
    if (inFlightOverviewPromises.has(fetchKey)) {
      return inFlightOverviewPromises.get(fetchKey)!;
    }

    const promise = (async () => {
      if (!get().clusterOverview && get().currentContext === target) {
        set({ isOverviewLoading: true });
      }

      try {
        const res = await invokeRpc<ClusterOverviewResult>(
          "clusters.overview",
          {
            contextName: target,
            namespace: queryNs,
          },
        );

        if (res) {
          // Verify context and namespace haven't changed while request was in-flight
          if (
            get().currentContext === target &&
            (namespace === undefined || get().currentNamespace === targetNs)
          ) {
            set({
              clusterOverview: res,
              ...(get().isOverviewLoading ? { isOverviewLoading: false } : {}),
            });
          }
          return res;
        }

        if (get().currentContext === target && get().isOverviewLoading) {
          set({ isOverviewLoading: false });
        }
        return null;
      } catch (err) {
        console.warn(
          "[ClusterStore] Failed to load cluster overview (preserving existing telemetry):",
          err,
        );
        // Stale-while-revalidate: Preserve existing clusterOverview so dashboard does not flicker to empty state
        if (get().currentContext === target && get().isOverviewLoading) {
          set({ isOverviewLoading: false });
        }
        return null;
      } finally {
        inFlightOverviewPromises.delete(fetchKey);
      }
    })();

    inFlightOverviewPromises.set(fetchKey, promise);
    return promise;
  },
});

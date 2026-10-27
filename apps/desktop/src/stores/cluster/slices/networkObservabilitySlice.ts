import type { StateCreator } from "zustand";
import type {
  ListCiliumResourcesResult,
  ListHubbleFlowsResult,
  NetworkObservabilityResult,
  NetworkingCountsResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { inFlightResourcePromises, resolveQueryNamespace } from "../shared";
import type { ClusterState } from "../types/cluster";
import type { NetworkObservabilitySlice } from "../types/networking";

export const createNetworkObservabilitySlice: StateCreator<
  ClusterState,
  [],
  [],
  NetworkObservabilitySlice
> = (set, get) => ({
  ciliumResources: null,
  isCiliumLoading: true,
  hasLoadedCiliumOnce: false,
  hubbleFlows: [],
  isHubbleFlowsLoading: false,
  hubbleFlowsError: null,
  networkingCounts: null,
  isNetworkingCountsLoading: false,
  hasLoadedNetworkingCountsOnce: false,
  networkObservability: null,
  isNetworkObservabilityLoading: false,
  hasLoadedNetworkObservabilityOnce: false,
  networkObservabilityError: null,
  loadCiliumResources: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ ciliumResources: null, isCiliumLoading: false });
      return;
    }
    const targetNs = namespace ?? get().currentNamespace;
    set({ isCiliumLoading: true });
    try {
      const res = await invokeRpc<ListCiliumResourcesResult>("cilium.list", {
        contextName: targetCtx,
        namespace: targetNs === "all" ? "" : targetNs,
      });
      if (get().currentContext === targetCtx) {
        set({
          ciliumResources: res,
          isCiliumLoading: false,
          hasLoadedCiliumOnce: true,
        });
      }
    } catch (err) {
      console.warn("[ClusterStore] Failed to load Cilium resources:", err);
      if (get().currentContext === targetCtx) {
        set({
          ciliumResources: null,
          isCiliumLoading: false,
          hasLoadedCiliumOnce: true,
        });
      }
    }
  },

  loadNetworkObservability: async (contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        networkObservability: null,
        isNetworkObservabilityLoading: false,
        hasLoadedNetworkObservabilityOnce: false,
        networkObservabilityError: null,
      });
      return;
    }

    set({
      isNetworkObservabilityLoading: true,
      networkObservabilityError: null,
    });
    try {
      const res = await invokeRpc<NetworkObservabilityResult>(
        "networking.observability",
        { contextName: targetCtx },
      );
      if (get().currentContext === targetCtx) {
        set({
          networkObservability: res ?? null,
          isNetworkObservabilityLoading: false,
          hasLoadedNetworkObservabilityOnce: true,
          networkObservabilityError: null,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[ClusterStore] Failed to load network observability:", err);
      if (get().currentContext === targetCtx) {
        set({
          networkObservability: null,
          isNetworkObservabilityLoading: false,
          hasLoadedNetworkObservabilityOnce: true,
          networkObservabilityError: message,
        });
      }
    }
  },
  loadHubbleFlows: async (number = 50) => {
    set({ isHubbleFlowsLoading: true, hubbleFlowsError: null });
    try {
      const res = await invokeRpc<ListHubbleFlowsResult>("cilium.hubbleFlows", {
        contextName: get().currentContext,
        namespace:
          get().currentNamespace === "all" ? "" : get().currentNamespace,
        number,
      });
      set({ hubbleFlows: res?.flows ?? [], isHubbleFlowsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isHubbleFlowsLoading: false, hubbleFlowsError: message });
    }
  },

  loadNetworkingCounts: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ networkingCounts: null, isNetworkingCountsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `networking-counts::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    set({ isNetworkingCountsLoading: true });
    const promise = (async () => {
      try {
        const res = await invokeRpc<NetworkingCountsResult>(
          "networking.counts",
          {
            contextName: targetCtx,
            namespace: queryNs,
          },
        );
        if (
          get().currentContext === targetCtx &&
          get().currentNamespace === targetNs
        ) {
          set({
            networkingCounts: res ?? null,
            isNetworkingCountsLoading: false,
            hasLoadedNetworkingCountsOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load networking counts:", err);
        if (
          get().currentContext === targetCtx &&
          get().currentNamespace === targetNs
        ) {
          set({
            isNetworkingCountsLoading: false,
            hasLoadedNetworkingCountsOnce: true,
          });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },
});

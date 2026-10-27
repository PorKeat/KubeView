import type { StateCreator } from "zustand";

import type { ClusterState } from "../types/cluster";
import type { CoreSlice } from "../types/core";

export const createCoreSlice: StateCreator<ClusterState, [], [], CoreSlice> = (
  set,
  get,
) => ({
  currentContext: "",
  currentNamespace: "all",
  connectionStatus: "checking",
  serverVersion: "Detecting...",
  latencyMs: 0,
  rbacMode: "cluster-admin",
  selectedResource: null,
  isInspectorOpen: false,
  isLoading: false,
  isKubeconfigModalOpen: false,
  kubeconfigModalTab: "browse",
  splashDismissed: false,
  autoRefreshInterval: 0,
  setAutoRefreshInterval: (interval) => set({ autoRefreshInterval: interval }),

  isEndpointModalOpen: false,
  endpointModalContextName: "",
  endpointModalCurrentServer: "",
  openEndpointModal: (contextName, currentServer) =>
    set({
      isEndpointModalOpen: true,
      endpointModalContextName: contextName,
      endpointModalCurrentServer: currentServer,
    }),
  closeEndpointModal: () =>
    set({
      isEndpointModalOpen: false,
      endpointModalContextName: "",
      endpointModalCurrentServer: "",
    }),
  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => {
    set({ currentNamespace: namespace });
    // In namespace-scoped mode or if pods haven't loaded yet, query the scoped namespace
    if (get().rbacMode === "namespace-scoped" || get().pods.length === 0) {
      get().loadPods(namespace);
    }
    // Refresh cluster overview dynamically for the scoped namespace
    get().loadClusterOverview(get().currentContext, namespace);
    get().loadNetworkingCounts(namespace, get().currentContext);
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setServerInfo: (version, latency) =>
    set({ serverVersion: version, latencyMs: latency }),
  openInspector: (resource) =>
    set({ selectedResource: resource, isInspectorOpen: true }),
  closeInspector: () => set({ selectedResource: null, isInspectorOpen: false }),

  openKubeconfigModal: (tab = "browse") =>
    set({ isKubeconfigModalOpen: true, kubeconfigModalTab: tab }),
  closeKubeconfigModal: () => set({ isKubeconfigModalOpen: false }),
  setSplashDismissed: (dismissed) => set({ splashDismissed: dismissed }),
});

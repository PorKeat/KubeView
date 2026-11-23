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
  isInspectorEditDirty: false,
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
  isCreateNamespaceOpen: false,
  namespaceRevision: 0,
  openCreateNamespace: () => set({ isCreateNamespaceOpen: true }),
  closeCreateNamespace: () => set({ isCreateNamespaceOpen: false }),
  bumpNamespaceRevision: () =>
    set((state) => ({ namespaceRevision: state.namespaceRevision + 1 })),
  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => {
    if (get().currentNamespace === namespace) return;
    set({
      currentNamespace: namespace,
      podUsage: {},
      podUsageAvailable: false,
      podUsageReason: null,
    });
    // In namespace-scoped mode or if pods haven't loaded yet, query the scoped namespace
    if (get().rbacMode === "namespace-scoped" || get().pods.length === 0) {
      get().loadPods(namespace);
    }
    void get().loadPodUsage(namespace);
    // Refresh cluster overview dynamically for the scoped namespace
    get().loadClusterOverview(get().currentContext, namespace);
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setServerInfo: (version, latency) =>
    set({ serverVersion: version, latencyMs: latency }),
  openInspector: (resource) => {
    set({
      selectedResource: resource,
      isInspectorOpen: true,
      isInspectorEditDirty: false,
    });
    if (
      resource.kind === "Pod" &&
      resource.namespace &&
      resource.namespace !== "Cluster Scope"
    ) {
      void get().loadPodUsage(resource.namespace);
    }
  },
  closeInspector: () =>
    set({
      selectedResource: null,
      isInspectorOpen: false,
      isInspectorEditDirty: false,
    }),
  setInspectorEditDirty: (dirty) => set({ isInspectorEditDirty: dirty }),

  openKubeconfigModal: (tab = "browse") =>
    set({ isKubeconfigModalOpen: true, kubeconfigModalTab: tab }),
  closeKubeconfigModal: () => set({ isKubeconfigModalOpen: false }),
  setSplashDismissed: (dismissed) => set({ splashDismissed: dismissed }),
});

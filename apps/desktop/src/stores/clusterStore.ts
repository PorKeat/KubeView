import { create } from "zustand";
import { toast } from "sonner";
import type {
  ContextSummary,
  DiagnosticResult,
  ListContextsResult,
  ListNamespacesResult,
  ProviderType,
  SwitchContextResult,
  ImportKubeconfigParams,
  ImportKubeconfigResult,
  PodSummary,
  ListPodsResult,
  PodLogsParams,
  PodLogsResult,
  DeletePodParams,
  RestartPodParams,
  ExecPodParams,
  ExecPodResult,
  PodEventItem,
  PodEventsResult,
  PodYamlResult,
  ClusterOverviewResult,
  DetectedContextInfo,
  DetectSystemConfigsResult,
  ImportDetectedContextItem,
  ImportDetectedContextsParams,
} from "@kubeview/contracts";
import { invokeRpc, listenNotification } from "@/lib/ipc";
import type { ClusterState, ClusterContextInfo, SelectedResource } from "./clusterTypes";

export * from "./clusterTypes";

let inFlightPodsPromise: Promise<void> | null = null;

export const useClusterStore = create<ClusterState>((set, get) => ({
  currentContext: "",
  availableContexts: [],
  currentNamespace: "all",
  availableNamespaces: ["all", "default"],
  connectionStatus: "checking",
  serverVersion: "Detecting...",
  latencyMs: 0,
  rbacMode: "cluster-admin",
  configPath: "",
  diagnosticResult: null,
  selectedResource: null,
  isInspectorOpen: false,
  isLoading: false,
  isKubeconfigModalOpen: false,
  kubeconfigModalTab: "browse",
  splashDismissed: false,

  clusterOverview: null,
  isOverviewLoading: false,
  pods: [],
  totalPodsCount: 0,
  isPodsLoading: true,
  hasLoadedPodsOnce: false,
  podNodeFilter: null,
  setPodNodeFilter: (nodeName) => {
    set({ podNodeFilter: nodeName });
    if (get().pods.length === 0 && get().currentContext) {
      get().loadPods();
    }
  },

  detectedSystemConfigs: [],
  isDetectingConfigs: false,

  logsModalPod: null,
  execModalPod: null,
  deleteConfirmPod: null,
  restartConfirmPod: null,
  bulkDeleteConfirmPods: null,
  bulkRestartConfirmPods: null,

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

  openLogsModal: (pod) => set({ logsModalPod: pod }),
  closeLogsModal: () => set({ logsModalPod: null }),
  openExecModal: (pod) => set({ execModalPod: pod }),
  closeExecModal: () => set({ execModalPod: null }),
  openDeleteConfirm: (pod) => set({ deleteConfirmPod: pod }),
  closeDeleteConfirm: () => set({ deleteConfirmPod: null }),
  openRestartConfirm: (pod) => set({ restartConfirmPod: pod }),
  closeRestartConfirm: () => set({ restartConfirmPod: null }),
  openBulkDeleteConfirm: (pods) => set({ bulkDeleteConfirmPods: pods }),
  closeBulkDeleteConfirm: () => set({ bulkDeleteConfirmPods: null }),
  openBulkRestartConfirm: (pods) => set({ bulkRestartConfirmPods: pods }),
  closeBulkRestartConfirm: () => set({ bulkRestartConfirmPods: null }),

  loadContexts: async () => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ListContextsResult>("clusters.listContexts");
      if (res && res.contexts && res.contexts.length > 0) {
        const contexts: ClusterContextInfo[] = res.contexts.map((c: ContextSummary) => ({
          name: c.name,
          cluster: c.cluster,
          server: c.server,
          provider: c.provider,
          status: c.name === res.currentContext ? "checking" : "offline",
          latencyMs: 0,
          namespace: c.namespace,
          authType: c.authType,
        }));

        set({
          availableContexts: contexts,
          currentContext: res.currentContext || (contexts[0]?.name ?? ""),
          configPath: res.configPath,
          isLoading: false,
        });

        const activeCtx = res.currentContext || contexts[0]?.name;
        if (activeCtx) {
          get().diagnoseContext(activeCtx);
          get().loadNamespaces(activeCtx);
          get().loadClusterOverview(activeCtx);
          get().loadPods(get().currentNamespace, activeCtx);
        }
      } else {
        set({
          availableContexts: [],
          currentContext: "",
          connectionStatus: "offline",
          serverVersion: "No cluster connected",
          latencyMs: 0,
          isLoading: false,
          clusterOverview: null,
          pods: [],
          totalPodsCount: 0,
          isPodsLoading: false,
          hasLoadedPodsOnce: true,
        });
      }
    } catch (err) {
      console.error("[ClusterStore] Failed to load contexts:", err);
      set({
        isLoading: false,
        connectionStatus: "offline",
        clusterOverview: null,
        pods: [],
        totalPodsCount: 0,
        isPodsLoading: false,
        hasLoadedPodsOnce: true,
      });
    }
  },

  switchContext: async (contextName: string) => {
    set({
      currentContext: contextName,
      connectionStatus: "checking",
      diagnosticResult: null,
      hasLoadedPodsOnce: false,
      isPodsLoading: true,
      pods: [],
      podNodeFilter: null,
    });

    try {
      const res = await invokeRpc<SwitchContextResult>("clusters.switchContext", {
        contextName,
      });

      if (res && res.status === "ready") {
        set((state) => ({
          availableContexts: state.availableContexts.map((c) => ({
            ...c,
            status: c.name === contextName ? "checking" : c.status,
          })),
        }));

        await get().diagnoseContext(contextName);
        await get().loadNamespaces(contextName);
        await get().loadClusterOverview(contextName);
        await get().loadPods(get().currentNamespace, contextName);
      }
    } catch (err) {
      console.error(`[ClusterStore] Failed to switch to context '${contextName}':`, err);
      set({ connectionStatus: "offline" });
    }
  },

  diagnoseContext: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) return null;

    set({ connectionStatus: "checking" });

    try {
      const diag = await invokeRpc<DiagnosticResult>("clusters.diagnose", {
        contextName: target,
      });

      if (diag) {
        const newStatus =
          diag.status === "connected"
            ? "connected"
            : diag.status === "degraded"
            ? "degraded"
            : "offline";

        const isClusterAdmin =
          diag.stages?.rbac?.details?.clusterAdmin !== false;

        set((state) => ({
          diagnosticResult: diag,
          connectionStatus: newStatus,
          serverVersion: diag.serverVersion || "Unavailable",
          latencyMs: diag.latencyMs || 0,
          rbacMode: isClusterAdmin ? "cluster-admin" : "namespace-scoped",
          availableContexts: state.availableContexts.map((c) =>
            c.name === target
              ? { ...c, status: newStatus, latencyMs: diag.latencyMs || 0 }
              : c
          ),
        }));

        return diag;
      }
    } catch (err) {
      console.error(`[ClusterStore] Diagnostics failed for '${target}':`, err);
      set({ connectionStatus: "offline" });
    }

    return null;
  },

  loadNamespaces: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) return;

    try {
      const res = await invokeRpc<ListNamespacesResult>("clusters.listNamespaces", {
        contextName: target,
      });

      if (res && res.namespaces && res.namespaces.length > 0) {
        const combined = Array.from(new Set(["all", ...res.namespaces]));
        set({ availableNamespaces: combined });
      }
    } catch (err) {
      console.warn("[ClusterStore] Namespace listing skipped/failed:", err);
    }
  },

  loadClusterOverview: async (contextName?: string, namespace?: string) => {
    const target = contextName || get().currentContext;
    if (!target) {
      set({ clusterOverview: null, isOverviewLoading: false });
      return null;
    }

    const targetNs = namespace !== undefined ? namespace : get().currentNamespace;

    set({ isOverviewLoading: true });
    try {
      const res = await invokeRpc<ClusterOverviewResult>("clusters.overview", {
        contextName: target,
        namespace: targetNs === "all" ? "" : targetNs,
      });
      if (res) {
        set({ clusterOverview: res, isOverviewLoading: false });
        return res;
      }
      set({ isOverviewLoading: false });
      return null;
    } catch (err) {
      console.warn("[ClusterStore] Failed to load cluster overview (preserving existing telemetry):", err);
      // Stale-while-revalidate: Preserve existing clusterOverview so dashboard does not flicker to empty state
      set({ isOverviewLoading: false });
      return null;
    }
  },

  loadPods: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ pods: [], totalPodsCount: 0, isPodsLoading: false });
      return;
    }

    // Deduplicate in-flight requests to avoid redundant RPC storms
    if (inFlightPodsPromise) {
      return inFlightPodsPromise;
    }

    const currentPods = get().pods;
    // Stale-While-Revalidate: Only display skeleton loader on first initial cold load
    if (currentPods.length === 0) {
      set({ isPodsLoading: true });
    }

    inFlightPodsPromise = (async () => {
      try {
        // In cluster-admin mode (default), fetch all cluster pods (namespace: "")
        // so client-side switching between namespaces, nodes, search queries, and status filters
        // is 0ms instantaneous without any loading flicker or network latency.
        // If the cluster restricts permissions (rbacMode === "namespace-scoped"), query the specific namespace.
        const rbac = get().rbacMode;
        const targetNs = namespace ?? get().currentNamespace;
        const queryNs = rbac === "namespace-scoped" && targetNs !== "all" ? targetNs : "";

        const res = await invokeRpc<ListPodsResult>("pods.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (res && res.items) {
          set({
            pods: res.items,
            totalPodsCount: res.totalCount ?? res.items.length,
            isPodsLoading: false,
            hasLoadedPodsOnce: true,
          });
        } else {
          set({ pods: [], totalPodsCount: 0, isPodsLoading: false, hasLoadedPodsOnce: true });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load pods:", err);
        set({ isPodsLoading: false, hasLoadedPodsOnce: true });
      } finally {
        inFlightPodsPromise = null;
      }
    })();

    return inFlightPodsPromise;
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

  bulkDeletePods: async (pods: { name: string; namespace: string }[], force?: boolean) => {
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

  getPodYaml: async (podName: string, namespace: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("pods.yaml", {
      contextName: targetCtx,
      namespace,
      podName,
    });
    return res?.yaml || "";
  },

  getPodEvents: async (podName: string, namespace: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodEventsResult>("pods.events", {
      contextName: targetCtx,
      namespace,
      podName,
    });
    return res?.events || [];
  },

  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => {
    set({ currentNamespace: namespace });
    // In namespace-scoped mode or if pods haven't loaded yet, query the scoped namespace
    if (get().rbacMode === "namespace-scoped" || get().pods.length === 0) {
      get().loadPods(namespace);
    }
    // Refresh cluster overview dynamically for the scoped namespace
    get().loadClusterOverview(get().currentContext, namespace);
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setServerInfo: (version, latency) => set({ serverVersion: version, latencyMs: latency }),
  openInspector: (resource) => set({ selectedResource: resource, isInspectorOpen: true }),
  closeInspector: () => set({ selectedResource: null, isInspectorOpen: false }),

  openKubeconfigModal: (tab = "browse") =>
    set({ isKubeconfigModalOpen: true, kubeconfigModalTab: tab }),
  closeKubeconfigModal: () => set({ isKubeconfigModalOpen: false }),
  setSplashDismissed: (dismissed) => set({ splashDismissed: dismissed }),

  importKubeconfig: async (params: ImportKubeconfigParams) => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ImportKubeconfigResult>("clusters.importKubeconfig", params);
      if (res && res.success) {
        await get().loadContexts();
        if (res.activeContext) {
          await get().switchContext(res.activeContext);
        }
        set({ isKubeconfigModalOpen: false, isLoading: false });
        return res;
      }
      set({ isLoading: false });
      throw new Error("Kubeconfig import returned unconfirmed status");
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  detectSystemConfigs: async () => {
    set({ isDetectingConfigs: true });
    try {
      const res = await invokeRpc<DetectSystemConfigsResult>("clusters.detectSystemConfigs");
      const list = res?.contexts || [];
      set({ detectedSystemConfigs: list, isDetectingConfigs: false });
      return list;
    } catch (err) {
      console.warn("[ClusterStore] Failed to detect system kubeconfigs:", err);
      set({ detectedSystemConfigs: [], isDetectingConfigs: false });
      return [];
    }
  },

  importDetectedContexts: async (contexts: ImportDetectedContextItem[]) => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ImportKubeconfigResult>("clusters.importDetected", { contexts });
      if (res && res.success) {
        await get().loadContexts();
        await get().detectSystemConfigs();
        if (res.activeContext) {
          await get().switchContext(res.activeContext);
        }
        set({ isKubeconfigModalOpen: false, isLoading: false });
        return res;
      }
      set({ isLoading: false });
      throw new Error("Import failed to confirm context registration");
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteContext: async (contextName: string) => {
    try {
      await invokeRpc("clusters.deleteContext", { contextName });
      await get().loadContexts();
    } catch (err) {
      console.error("Failed to delete context:", err);
    }
  },

  updateEndpoint: async (contextName: string, newServer: string, insecure?: boolean) => {
    try {
      await invokeRpc("clusters.updateEndpoint", { contextName, newServer, insecure });
      toast.success(`Updated endpoint for '${contextName}' to ${newServer}`);
      await get().loadContexts();
      if (get().currentContext === contextName) {
        await get().diagnoseContext();
      }
    } catch (err: any) {
      console.error("Failed to update endpoint:", err);
      toast.error(`Failed to update endpoint: ${err.message || err}`);
      throw err;
    }
  },

  clearAllContexts: async () => {
    try {
      await invokeRpc("clusters.clearAll");
      set({
        availableContexts: [],
        currentContext: "",
        connectionStatus: "offline",
        serverVersion: "No cluster connected",
        latencyMs: 0,
        availableNamespaces: ["all", "default"],
        clusterOverview: null,
        pods: [],
        totalPodsCount: 0,
      });
    } catch (err) {
      console.error("Failed to clear contexts:", err);
    }
  },

  initEventListener: async () => {
    const unlistenContexts = await listenNotification<ListContextsResult>(
      "clusters:contextsChanged",
      (res) => {
        console.log("[ClusterStore] Kubeconfig contexts changed on disk:", res);
        if (res && res.contexts && res.contexts.length > 0) {
          const contexts: ClusterContextInfo[] = res.contexts.map((c: ContextSummary) => ({
            name: c.name,
            cluster: c.cluster,
            server: c.server,
            provider: c.provider,
            status: c.name === get().currentContext ? get().connectionStatus : "offline",
            latencyMs: 0,
            namespace: c.namespace,
            authType: c.authType,
          }));
          set({ availableContexts: contexts });
        } else {
          set({
            availableContexts: [],
            currentContext: "",
            connectionStatus: "offline",
            serverVersion: "No cluster connected",
            latencyMs: 0,
            clusterOverview: null,
            pods: [],
            totalPodsCount: 0,
          });
        }
      }
    );

    // Real-Time K8s Pod Watcher stream
    const unlistenPods = await listenNotification<{ type: string; pod: PodSummary }>(
      "pods:changed",
      (event) => {
        if (!event || !event.pod) return;
        const currentPods = get().pods;
        if (get().rbacMode === "namespace-scoped") {
          const targetNs = get().currentNamespace;
          if (targetNs !== "all" && event.pod.namespace !== targetNs) {
            return;
          }
        }

        if (event.type === "DELETED") {
          const next = currentPods.filter(
            (p) => !(p.name === event.pod.name && p.namespace === event.pod.namespace)
          );
          set({ pods: next, totalPodsCount: Math.max(0, get().totalPodsCount - 1) });
        } else {
          const idx = currentPods.findIndex(
            (p) => p.name === event.pod.name && p.namespace === event.pod.namespace
          );
          if (idx >= 0) {
            const next = [...currentPods];
            next[idx] = event.pod;
            set({ pods: next });
          } else {
            set({
              pods: [event.pod, ...currentPods],
              totalPodsCount: get().totalPodsCount + 1,
            });
          }
        }
      }
    );

    // Real-Time Cluster Overview & Workloads stream
    const unlistenOverview = await listenNotification<{ context: string }>(
      "clusters:overviewChanged",
      (payload) => {
        if (!payload || payload.context === get().currentContext) {
          get().loadClusterOverview();
        }
      }
    );

    // Real-Time Warning Events Stream
    const unlistenEvents = await listenNotification<PodEventItem>(
      "events:warning",
      (item) => {
        if (!item) return;
        const ov = get().clusterOverview;
        if (ov) {
          const existing = ov.warningEvents || [];
          set({
            clusterOverview: {
              ...ov,
              warningEvents: [
                item,
                ...existing.filter((e) => e.message !== item.message),
              ].slice(0, 15),
            },
          });
        }
      }
    );

    return () => {
      unlistenContexts();
      unlistenPods();
      unlistenOverview();
      unlistenEvents();
    };
  },
}));

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

export interface ClusterContextInfo {
  name: string;
  cluster: string;
  server: string;
  provider: ProviderType;
  status: "connected" | "degraded" | "offline" | "checking";
  latencyMs: number;
  namespace?: string;
  authType?: string;
}

export interface SelectedResource {
  kind: string;
  name: string;
  namespace: string;
  status: string;
  data?: Record<string, unknown>;
}

interface ClusterState {
  currentContext: string;
  availableContexts: ClusterContextInfo[];
  currentNamespace: string;
  availableNamespaces: string[];
  connectionStatus: "connected" | "degraded" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  rbacMode: "cluster-admin" | "namespace-scoped";
  configPath: string;
  diagnosticResult: DiagnosticResult | null;
  selectedResource: SelectedResource | null;
  isInspectorOpen: boolean;
  isLoading: boolean;
  isKubeconfigModalOpen: boolean;
  kubeconfigModalTab: "auto" | "browse" | "paste" | "manage";
  splashDismissed: boolean;

  // Real cluster overview & pods telemetry
  clusterOverview: ClusterOverviewResult | null;
  isOverviewLoading: boolean;
  pods: PodSummary[];
  totalPodsCount: number;
  isPodsLoading: boolean;

  // OS Auto-Detected Kubeconfig Contexts
  detectedSystemConfigs: DetectedContextInfo[];
  isDetectingConfigs: boolean;

  // Action modals for Pods
  logsModalPod: { name: string; namespace: string; container?: string } | null;
  execModalPod: { name: string; namespace: string; container?: string } | null;
  deleteConfirmPod: { name: string; namespace: string } | null;
  restartConfirmPod: { name: string; namespace: string } | null;

  // Actions
  loadContexts: () => Promise<void>;
  switchContext: (contextName: string) => Promise<void>;
  diagnoseContext: (contextName?: string) => Promise<DiagnosticResult | null>;
  loadNamespaces: (contextName?: string) => Promise<void>;
  loadClusterOverview: (contextName?: string) => Promise<ClusterOverviewResult | null>;
  loadPods: (namespace?: string, contextName?: string) => Promise<void>;
  getPodLogs: (params: PodLogsParams) => Promise<PodLogsResult>;
  deletePod: (params: DeletePodParams) => Promise<void>;
  restartPod: (params: RestartPodParams) => Promise<void>;
  execPod: (params: ExecPodParams) => Promise<ExecPodResult>;
  getPodYaml: (podName: string, namespace: string, contextName?: string) => Promise<string>;
  getPodEvents: (podName: string, namespace: string, contextName?: string) => Promise<PodEventItem[]>;

  openLogsModal: (pod: { name: string; namespace: string; container?: string }) => void;
  closeLogsModal: () => void;
  openExecModal: (pod: { name: string; namespace: string; container?: string }) => void;
  closeExecModal: () => void;
  openDeleteConfirm: (pod: { name: string; namespace: string }) => void;
  closeDeleteConfirm: () => void;
  openRestartConfirm: (pod: { name: string; namespace: string }) => void;
  closeRestartConfirm: () => void;

  setCurrentContext: (context: string) => void;
  setCurrentNamespace: (namespace: string) => void;
  setConnectionStatus: (status: "connected" | "degraded" | "checking" | "offline") => void;
  setServerInfo: (version: string, latency: number) => void;
  openInspector: (resource: SelectedResource) => void;
  closeInspector: () => void;
  openKubeconfigModal: (tab?: "auto" | "browse" | "paste" | "manage") => void;
  closeKubeconfigModal: () => void;
  setSplashDismissed: (dismissed: boolean) => void;
  importKubeconfig: (params: ImportKubeconfigParams) => Promise<ImportKubeconfigResult>;
  detectSystemConfigs: () => Promise<DetectedContextInfo[]>;
  importDetectedContexts: (contexts: ImportDetectedContextItem[]) => Promise<ImportKubeconfigResult>;
  deleteContext: (contextName: string) => Promise<void>;
  updateEndpoint: (contextName: string, newServer: string) => Promise<void>;
  clearAllContexts: () => Promise<void>;
  initEventListener: () => Promise<() => void>;
}

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
  isPodsLoading: false,

  detectedSystemConfigs: [],
  isDetectingConfigs: false,

  logsModalPod: null,
  execModalPod: null,
  deleteConfirmPod: null,
  restartConfirmPod: null,

  openLogsModal: (pod) => set({ logsModalPod: pod }),
  closeLogsModal: () => set({ logsModalPod: null }),
  openExecModal: (pod) => set({ execModalPod: pod }),
  closeExecModal: () => set({ execModalPod: null }),
  openDeleteConfirm: (pod) => set({ deleteConfirmPod: pod }),
  closeDeleteConfirm: () => set({ deleteConfirmPod: null }),
  openRestartConfirm: (pod) => set({ restartConfirmPod: pod }),
  closeRestartConfirm: () => set({ restartConfirmPod: null }),

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
      });
    }
  },

  switchContext: async (contextName: string) => {
    set({
      currentContext: contextName,
      connectionStatus: "checking",
      diagnosticResult: null,
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

  loadClusterOverview: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) {
      set({ clusterOverview: null, isOverviewLoading: false });
      return null;
    }

    set({ isOverviewLoading: true });
    try {
      const res = await invokeRpc<ClusterOverviewResult>("clusters.overview", {
        contextName: target,
      });
      if (res) {
        set({ clusterOverview: res, isOverviewLoading: false });
        return res;
      }
      set({ isOverviewLoading: false });
      return null;
    } catch (err) {
      console.warn("[ClusterStore] Failed to load cluster overview:", err);
      set({ clusterOverview: null, isOverviewLoading: false });
      return null;
    }
  },

  loadPods: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ pods: [], totalPodsCount: 0, isPodsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    set({ isPodsLoading: true });

    try {
      const res = await invokeRpc<ListPodsResult>("pods.list", {
        contextName: targetCtx,
        namespace: targetNs === "all" ? "" : targetNs,
      });

      if (res && res.items) {
        set({
          pods: res.items,
          totalPodsCount: res.totalCount ?? res.items.length,
          isPodsLoading: false,
        });
      } else {
        set({ pods: [], totalPodsCount: 0, isPodsLoading: false });
      }
    } catch (err) {
      console.warn("[ClusterStore] Failed to load pods:", err);
      set({ pods: [], totalPodsCount: 0, isPodsLoading: false });
    }
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
    get().loadPods(namespace);
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

  updateEndpoint: async (contextName: string, newServer: string) => {
    try {
      await invokeRpc("clusters.updateEndpoint", { contextName, newServer });
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
    const unlisten = await listenNotification<ListContextsResult>(
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
    return unlisten;
  },
}));

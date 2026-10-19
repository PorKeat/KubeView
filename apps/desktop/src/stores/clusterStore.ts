import { create } from "zustand";
import type {
  ContextSummary,
  DiagnosticResult,
  ListContextsResult,
  ListNamespacesResult,
  ProviderType,
  SwitchContextResult,
  ImportKubeconfigParams,
  ImportKubeconfigResult,
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
  kubeconfigModalTab: "browse" | "paste" | "manage";
  splashDismissed: boolean;

  // Actions
  loadContexts: () => Promise<void>;
  switchContext: (contextName: string) => Promise<void>;
  diagnoseContext: (contextName?: string) => Promise<DiagnosticResult | null>;
  loadNamespaces: (contextName?: string) => Promise<void>;
  setCurrentContext: (context: string) => void;
  setCurrentNamespace: (namespace: string) => void;
  setConnectionStatus: (status: "connected" | "degraded" | "checking" | "offline") => void;
  setServerInfo: (version: string, latency: number) => void;
  openInspector: (resource: SelectedResource) => void;
  closeInspector: () => void;
  openKubeconfigModal: (tab?: "browse" | "paste" | "manage") => void;
  closeKubeconfigModal: () => void;
  setSplashDismissed: (dismissed: boolean) => void;
  importKubeconfig: (params: ImportKubeconfigParams) => Promise<ImportKubeconfigResult>;
  deleteContext: (contextName: string) => Promise<void>;
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

  loadContexts: async () => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ListContextsResult>("clusters.listContexts");
      if (res && res.contexts) {
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
          // Trigger diagnosis and namespaces asynchronously
          get().diagnoseContext(activeCtx);
          get().loadNamespaces(activeCtx);
        }
      }
    } catch (err) {
      console.error("[ClusterStore] Failed to load contexts:", err);
      set({ isLoading: false, connectionStatus: "offline" });
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

        // Diagnose newly active context
        await get().diagnoseContext(contextName);
        await get().loadNamespaces(contextName);
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
      // If namespace listing fails (e.g. cluster offline or RBAC restricted), keep default
      console.warn("[ClusterStore] Namespace listing skipped/failed:", err);
    }
  },

  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => set({ currentNamespace: namespace }),
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

  deleteContext: async (contextName: string) => {
    try {
      await invokeRpc("clusters.deleteContext", { contextName });
      await get().loadContexts();
    } catch (err) {
      console.error("Failed to delete context:", err);
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
        if (res && res.contexts) {
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
        }
      }
    );
    return unlisten;
  },
}));

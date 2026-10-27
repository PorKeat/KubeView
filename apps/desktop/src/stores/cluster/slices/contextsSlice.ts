import type { StateCreator } from "zustand";
import type {
  ContextSummary,
  DiagnosticResult,
  ListContextsResult,
  ListNamespacesResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { disconnectedResourceReset } from "../resets";
import type { ClusterState } from "../types/cluster";
import type { ClusterContextInfo, ContextsSlice } from "../types/contexts";

export const createContextsSlice: StateCreator<
  ClusterState,
  [],
  [],
  ContextsSlice
> = (set, get) => ({
  availableContexts: [],
  availableNamespaces: ["all", "default"],
  configPath: "",
  diagnosticResult: null,
  detectedSystemConfigs: [],
  isDetectingConfigs: false,
  loadContexts: async () => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ListContextsResult>("clusters.listContexts");
      if (res && res.contexts && res.contexts.length > 0) {
        const contexts: ClusterContextInfo[] = res.contexts.map(
          (c: ContextSummary) => ({
            name: c.name,
            cluster: c.cluster,
            server: c.server,
            provider: c.provider,
            status: c.name === res.currentContext ? "checking" : "offline",
            latencyMs: 0,
            namespace: c.namespace,
            authType: c.authType,
          }),
        );

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
          get().loadNetworkingCounts(get().currentNamespace, activeCtx);
        }
      } else {
        set({
          availableContexts: [],
          currentContext: "",
          connectionStatus: "offline",
          serverVersion: "No cluster connected",
          latencyMs: 0,
          isLoading: false,
          ...disconnectedResourceReset(),
        });
      }
    } catch (err) {
      console.error("[ClusterStore] Failed to load contexts:", err);
      set({
        isLoading: false,
        connectionStatus: "offline",
        ...disconnectedResourceReset(),
      });
    }
  },
  diagnoseContext: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) return null;

    if (get().currentContext === target) {
      set({ connectionStatus: "checking" });
    }

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

        set((state) => {
          const isActive = state.currentContext === target;
          const apiLatency =
            diag.stages?.tls?.passed &&
            typeof diag.stages.tls.latencyMs === "number" &&
            diag.stages.tls.latencyMs > 0
              ? diag.stages.tls.latencyMs
              : diag.stages?.network?.passed &&
                  typeof diag.stages.network.latencyMs === "number" &&
                  diag.stages.network.latencyMs > 0
                ? diag.stages.network.latencyMs
                : diag.latencyMs || 0;

          return {
            availableContexts: state.availableContexts.map((c) =>
              c.name === target
                ? { ...c, status: newStatus, latencyMs: apiLatency }
                : c,
            ),
            ...(isActive
              ? {
                  diagnosticResult: diag,
                  connectionStatus: newStatus,
                  serverVersion: diag.serverVersion || "Unavailable",
                  latencyMs: apiLatency,
                  rbacMode: isClusterAdmin
                    ? "cluster-admin"
                    : "namespace-scoped",
                }
              : {}),
          };
        });

        return diag;
      }
    } catch (err) {
      console.error(`[ClusterStore] Diagnostics failed for '${target}':`, err);
      if (get().currentContext === target) {
        set({ connectionStatus: "offline" });
      }
    }

    return null;
  },
  loadNamespaces: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) return;

    try {
      const res = await invokeRpc<ListNamespacesResult>(
        "clusters.listNamespaces",
        {
          contextName: target,
        },
      );

      if (res && res.namespaces && res.namespaces.length > 0) {
        const combined = Array.from(new Set(["all", ...res.namespaces]));
        set({ availableNamespaces: combined });
      }
    } catch (err) {
      console.warn("[ClusterStore] Namespace listing skipped/failed:", err);
    }
  },
});
